import os
import hashlib
import time
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.users import User, UserRole
from app.models.freelancers import FrelancerProfile
from app.core.dependencies import get_current_user
from app.models.cv_documents import (
    CVDocument, 
    CVParseTask, 
    DocumentStatusEnum, 
    TaskStatusEnum, 
    TaskTypeEnum
)
from app.models.cv_results import (
    CVParseResult, 
    CVExtractedField, 
    FieldEvidenceLevelEnum
)
from app.models.verifications import (
    CVEvidence,
    VerificationCase,
    TrustPassportEntry,
    EvidenceTypeEnum,
    EvidenceStatusEnum,
    VerificationCaseStatusEnum
)
from app.schemas.cv import (
    CVUploadResponse, 
    CVParseTaskResponse,
    CVParseResultDetailResponse,
    CVExtractedFieldDetail,
    CVReviewRequest
)
from app.schemas.verification import (
    CVEvidenceResponse,
    SubmitVerificationRequest,
    SubmitVerificationResponse,
    TrustPassportBadgeDetail,
    TrustPassportResponse,
    ResubmitVerificationResponse
)
from app.schemas.default import BaseResponse
from app.services.cv_service import simulate_background_parsing
from app.services.trust_score import calculate_trust_score
from app.core.logger import logger

router = APIRouter()

# Danh sách các định dạng MIME type được phép tải lên
ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg"
]

# Kích thước file tối đa: 10MB
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

# Thư mục lưu trữ file upload trên server local
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "cv")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/cv/upload", status_code=status.HTTP_201_CREATED)
async def upload_cv(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Lấy freelancer_id từ JWT — không nhận từ form
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy freelancer profile. Vui lòng hoàn thiện profile trước."
        )
    freelancer_id = profile.user_id

    """
    API Tải lên file CV mới.
    Validate định dạng (PDF/DOCX/PNG/JPG), kích thước (<=10MB), băm mã SHA256 và lưu file.
    Trả về định dạng JSON chuẩn theo BaseResponse.
    """
    # 1. Validate MIME Type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Định dạng file '{file.content_type}' không được hỗ trợ. Chỉ nhận PDF, DOCX, PNG, JPG."
        )

    # 2. Đọc file content để kiểm tra dung lượng và tính SHA256
    content = await file.read()
    size_bytes = len(content)

    if size_bytes > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kích thước file quá lớn ({size_bytes / (1024*1024):.2f}MB). Giới hạn tối đa là 10MB."
        )

    if size_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File tải lên bị rỗng (0 bytes)."
        )

    # 3. Tính mã băm SHA-256 nội dung file
    sha256_hash = hashlib.sha256(content).hexdigest()

    # 4. Lưu file vào thư mục UPLOAD_DIR
    filename_safe = f"{sha256_hash}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename_safe)
    
    with open(file_path, "wb") as f:
        f.write(content)

    # 5. Kiểm tra và đảm bảo Freelancer User tồn tại trong CSDL (Tránh lỗi Foreign Key constraint)
    user = db.query(User).filter(User.id == freelancer_id).first()
    if not user:
        user = db.query(User).first()
        if not user:
            user = User(
                id=str(uuid.uuid4()),
                email="default_freelancer@example.com",
                password_hash="fakehash",
                role=UserRole.freelancer
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        freelancer_id = user.id

    # 6. Lưu thông tin Metadata vào Database
    cv_doc = CVDocument(
        freelancer_id=freelancer_id,
        original_filename=file.filename,
        mime_type=file.content_type,
        size_bytes=size_bytes,
        sha256=sha256_hash,
        storage_key=file_path,
        status=DocumentStatusEnum.UPLOADED
    )
    
    db.add(cv_doc)
    db.commit()
    db.refresh(cv_doc)

    logger.info(f"CV Upload thành công: ID={cv_doc.id}, Filename={file.filename}, Hash={sha256_hash}")
    
    upload_res = CVUploadResponse.model_validate(cv_doc)
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message="Tải lên tài liệu CV thành công.",
        data=upload_res,
        error=None,
        path=request.url.path
    )


@router.post("/cv/documents/{document_id}/parse", status_code=status.HTTP_202_ACCEPTED)
async def start_parse_cv(
    request: Request,
    document_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    API Kích hoạt tiến trình phân tích CV (Parse Task).
    Chỉ cho phép gọi khi CV đang ở trạng thái UPLOADED, EXTRACTING hoặc PARSING_FAILED.
    """
    # 1. Tìm bản ghi CV Document
    doc = db.query(CVDocument).filter(CVDocument.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tài liệu CV với ID: {document_id}"
        )

    # 2. Kiểm tra State Machine Rule
    if doc.status not in [DocumentStatusEnum.UPLOADED, DocumentStatusEnum.PARSING_FAILED, DocumentStatusEnum.EXTRACTING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tài liệu đang ở trạng thái '{doc.status.value}', không hợp lệ để phân tích."
        )

    # 3. Cập nhật trạng thái Document thành EXTRACTING
    doc.status = DocumentStatusEnum.EXTRACTING

    # 4. Tạo Task ngầm mới
    parse_task = CVParseTask(
        cv_document_id=doc.id,
        task_type=TaskTypeEnum.TEXT_EXTRACT,
        status=TaskStatusEnum.QUEUED,
        progress_percent=0,
        current_step="QUEUED"
    )
    
    db.add(parse_task)
    db.commit()
    db.refresh(parse_task)

    # 5. Đưa tác vụ vào BackgroundTasks của FastAPI
    from app.database import LocalSession
    background_tasks.add_task(simulate_background_parsing, parse_task.id, LocalSession)

    logger.info(f"Kích hoạt Parse Task thành công: TaskID={parse_task.id} cho DocID={document_id}")
    
    task_res = CVParseTaskResponse.model_validate(parse_task)
    return BaseResponse.create(
        status_code=status.HTTP_202_ACCEPTED,
        message="Kích hoạt tác vụ phân tích CV thành công.",
        data=task_res,
        error=None,
        path=request.url.path
    )


@router.get("/cv/tasks/{task_id}")
async def get_parse_task_status(
    request: Request,
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    API Polling kiểm tra tiến độ của Background Task theo taskId.
    Frontend sẽ gọi API này 2 giây/lần để vẽ thanh Progress bar.
    """
    task = db.query(CVParseTask).filter(CVParseTask.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tác vụ với ID: {task_id}"
        )
    
    db.refresh(task)
    task_res = CVParseTaskResponse.model_validate(task)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message="Lấy trạng thái tác vụ phân tích thành công.",
        data=task_res,
        error=None,
        path=request.url.path
    )


@router.get("/cv/documents/{document_id}/result")
async def get_cv_parse_result(
    request: Request,
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    API Lấy kết quả bóc tách chi tiết của CV Document cho màn hình Review.
    Chủ động tính toán requiresUserReview = True nếu confidence < 0.70.
    """
    doc = db.query(CVDocument).filter(CVDocument.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tài liệu CV với ID: {document_id}"
        )

    parse_result = db.query(CVParseResult).filter(CVParseResult.cv_document_id == document_id).first()
    if not parse_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chưa có kết quả bóc tách cho tài liệu CV ID: {document_id}"
        )

    extracted_fields_db = db.query(CVExtractedField).filter(CVExtractedField.cv_parse_result_id == parse_result.id).all()
    
    extracted_details = []
    for ef in extracted_fields_db:
        requires_review = (ef.confidence is not None and ef.confidence < 0.70)
        extracted_details.append(
            CVExtractedFieldDetail(
                id=ef.id,
                fieldPath=ef.field_path,
                value=ef.value_json,
                confidence=ef.confidence,
                sourcePage=ef.source_page,
                sourceText=ef.source_text,
                evidenceLevel=ef.evidence_level.value,
                requiresUserReview=requires_review
            )
        )

    result_detail = CVParseResultDetailResponse(
        documentId=doc.id,
        overallConfidence=parse_result.overall_confidence,
        completenessPercent=parse_result.completeness_percent,
        missingFields=parse_result.missing_fields or [],
        conflicts=parse_result.conflicts or [],
        extractedFields=extracted_details
    )

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message="Lấy kết quả bóc tách CV thành công.",
        data=result_detail,
        error=None,
        path=request.url.path
    )


@router.patch("/cv/documents/{document_id}/review", status_code=status.HTTP_200_OK)
async def review_cv_parse_result(
    request: Request,
    document_id: str,
    review_req: CVReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    API Cho phép Freelancer tự xác nhận hoặc chỉnh sửa các ô dữ liệu AI bóc tách được.
    Đổi evidence_level thành USER_CONFIRMED và chuyển status CV sang PENDING_VERIFICATION.
    """
    doc = db.query(CVDocument).filter(CVDocument.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tài liệu CV với ID: {document_id}"
        )

    parse_result = db.query(CVParseResult).filter(CVParseResult.cv_document_id == document_id).first()
    if not parse_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chưa có kết quả bóc tách cho tài liệu CV ID: {document_id}"
        )

    from datetime import datetime
    now = datetime.utcnow()

    for change in review_req.changes:
        ef = db.query(CVExtractedField).filter(
            CVExtractedField.cv_parse_result_id == parse_result.id,
            CVExtractedField.field_path == change.field_path
        ).first()

        if ef:
            ef.value_json = change.value
            ef.evidence_level = FieldEvidenceLevelEnum.USER_CONFIRMED
            ef.user_confirmed_at = now
        else:
            # Tạo ô mới nếu Freelancer tự bổ sung trường bị thiếu
            ef = CVExtractedField(
                cv_parse_result_id=parse_result.id,
                field_path=change.field_path,
                value_json=change.value,
                confidence=1.0,
                evidence_level=FieldEvidenceLevelEnum.USER_CONFIRMED,
                user_confirmed_at=now
            )
            db.add(ef)

    # Chuyển trạng thái CV thành PENDING_VERIFICATION (Đã Review xong, chờ Admin duyệt)
    doc.status = DocumentStatusEnum.PENDING_VERIFICATION
    db.commit()

    logger.info(f"Freelancer đã Review và Cập nhật CV {document_id}. Trạng thái mới: PENDING_VERIFICATION")
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message="Đã cập nhật dữ liệu xác nhận của người dùng thành công.",
        data={"documentStatus": doc.status.value},
        error=None,
        path=request.url.path
    )


# ==============================================================================
# TASK 2.3: FREELANCER EVIDENCE & TRUST PASSPORT ENDPOINTS
# ==============================================================================

@router.post("/cv/documents/{document_id}/evidence", status_code=status.HTTP_201_CREATED)
async def upload_cv_evidence(
    request: Request,
    document_id: str,
    file: UploadFile = File(...),
    title: str = Form("Bằng cấp / Chứng chỉ minh chứng"),
    evidence_type: EvidenceTypeEnum = Form(EvidenceTypeEnum.DIPLOMA),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    API Cho phép Freelancer tải lên hình ảnh/file minh chứng (Bằng đại học, chứng chỉ, screenshot...)
    đính kèm vào file CV để gửi cho Admin đối soát.
    """
    doc = db.query(CVDocument).filter(CVDocument.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tài liệu CV với ID: {document_id}"
        )

    # Lấy freelancer_id từ JWT
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy freelancer profile."
        )
    target_freelancer_id = profile.user_id

    # Đọc dữ liệu file
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024: # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tệp minh chứng không được vượt quá 10MB"
        )

    # Lưu file vật lý
    evidence_dir = os.path.join("uploads", "evidences")
    os.makedirs(evidence_dir, exist_ok=True)

    evidence_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    storage_key = os.path.join(evidence_dir, f"{evidence_id}{file_ext}")

    with open(storage_key, "wb") as f:
        f.write(file_bytes)

    evidence = CVEvidence(
        id=evidence_id,
        cv_document_id=document_id,
        freelancer_id=target_freelancer_id,
        title=title,
        evidence_type=evidence_type,
        original_filename=file.filename,
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(file_bytes),
        storage_key=storage_key,
        status=EvidenceStatusEnum.UPLOADED
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    logger.info(f"Đã lưu tệp minh chứng mới ID={evidence.id} cho CV={document_id}")
    evidence_res = CVEvidenceResponse.model_validate(evidence)

    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message="Tải lên minh chứng thành công.",
        data=evidence_res,
        error=None,
        path=request.url.path
    )


@router.post("/cv/documents/{document_id}/submit-verification", status_code=status.HTTP_200_OK)
async def submit_cv_verification(
    request: Request,
    document_id: str,
    submit_req: SubmitVerificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    API Cho phép Freelancer nộp hồ sơ CV + Danh sách Minh chứng lên Hàng đợi duyệt của Admin (PENDING_VERIFICATION).
    """
    doc = db.query(CVDocument).filter(CVDocument.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tài liệu CV với ID: {document_id}"
        )

    from datetime import datetime
    now = datetime.utcnow()

    # Cập nhật trạng thái CV
    doc.status = DocumentStatusEnum.PENDING_VERIFICATION

    # Cập nhật các tệp minh chứng sang trạng thái PENDING
    if submit_req.evidenceIds:
        db.query(CVEvidence).filter(
            CVEvidence.id.in_(submit_req.evidenceIds),
            CVEvidence.cv_document_id == document_id
        ).update({"status": EvidenceStatusEnum.PENDING}, synchronize_session=False)

    # Tìm hoặc khởi tạo VerificationCase
    case = db.query(VerificationCase).filter(VerificationCase.cv_document_id == document_id).first()
    if not case:
        case = VerificationCase(
            id=str(uuid.uuid4()),
            cv_document_id=document_id,
            freelancer_id=doc.freelancer_id,
            status=VerificationCaseStatusEnum.PENDING,
            submitted_at=now,
            notes=submit_req.notes
        )
        db.add(case)
    else:
        case.status = VerificationCaseStatusEnum.PENDING
        case.submitted_at = now
        case.notes = submit_req.notes

    db.commit()
    db.refresh(case)

    logger.info(f"Freelancer đã nộp Hồ sơ Xác minh Case ID={case.id} cho CV={document_id}")

    res_data = SubmitVerificationResponse(
        caseId=case.id,
        documentId=document_id,
        status=case.status,
        submittedAt=case.submitted_at,
        message="Đã nộp hồ sơ gửi Admin đối soát thành công."
    )

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message="Nộp hồ sơ xác minh thành công.",
        data=res_data,
        error=None,
        path=request.url.path
    )


@router.get("/freelancer/trust-passport", status_code=status.HTTP_200_OK)
async def get_freelancer_trust_passport(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    API Cho phép xem Hộ chiếu Uy tín (Trust Passport) của chính mình (self-view).
    freelancer_id được lấy từ JWT token.
    """
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy freelancer profile"
        )
    freelancer_id = profile.user_id

    entries = db.query(TrustPassportEntry).filter(
        TrustPassportEntry.freelancer_id == freelancer_id
    ).all()

    trust = calculate_trust_score(entries, include_expired=False)
    badges = [
        TrustPassportBadgeDetail.model_validate(e)
        for e in entries
        if not (e.expires_at and datetime.now(timezone.utc) > e.expires_at.replace(tzinfo=timezone.utc))
    ]

    passport_res = TrustPassportResponse(
        freelancerId=freelancer_id,
        trustScore=trust["score"],
        totalVerifiedBadges=trust["activeBadges"],
        badges=badges
    )

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message="Lấy Hộ chiếu Uy tín Trust Passport thành công.",
        data=passport_res,
        error=None,
        path=request.url.path
    )


@router.get("/freelancers/{freelancer_id}/trust-passport", status_code=status.HTTP_200_OK)
async def get_public_freelancer_trust_passport(
    request: Request,
    freelancer_id: str,
    db: Session = Depends(get_db)
):
    """
    API Công khai: Cho phép Client/Nhà tuyển dụng xem Trust Passport của Freelancer.
    Theo MASTER-DOC Phần M.5: Hiển thị evidence level per claim.
    """
    user = db.query(User).filter(User.id == freelancer_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy freelancer")

    entries = db.query(TrustPassportEntry).filter(
        TrustPassportEntry.freelancer_id == freelancer_id
    ).all()

    trust = calculate_trust_score(entries, include_expired=False)
    badges = [
        TrustPassportBadgeDetail.model_validate(e)
        for e in entries
        if not (e.expires_at and datetime.now(timezone.utc) > e.expires_at.replace(tzinfo=timezone.utc))
    ]

    passport_res = TrustPassportResponse(
        freelancerId=freelancer_id,
        trustScore=trust["score"],
        totalVerifiedBadges=trust["activeBadges"],
        badges=badges
    )

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message="Lấy Hộ chiếu Uy tín công khai thành công.",
        data=passport_res,
        error=None,
        path=request.url.path
    )


@router.post("/cv/documents/{document_id}/resubmit-verification", status_code=status.HTTP_200_OK)
async def resubmit_verification(
    request: Request,
    document_id: str,
    submit_req: SubmitVerificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    API Cho phép Freelancer re-submit case sau khi Admin yêu cầu bổ sung
    (trạng thái NEEDS_MORE_INFO hoặc PARTIALLY_VERIFIED).
    Theo MASTER-DOC Phần L.3: NEEDS_MORE_INFO -> NEEDS_USER_REVIEW -> resubmit
    """
    doc = db.query(CVDocument).filter(CVDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu CV")

    case = db.query(VerificationCase).filter(
        VerificationCase.cv_document_id == document_id
    ).first()

    if not case:
        raise HTTPException(
            status_code=400, detail="Không có case nào để resubmit"
        )

    if case.status not in [
        VerificationCaseStatusEnum.NEEDS_MORE_INFO,
        VerificationCaseStatusEnum.PARTIALLY_VERIFIED,
        VerificationCaseStatusEnum.REJECTED
    ]:
        raise HTTPException(
            status_code=400,
            detail=f"Case đang ở trạng thái '{case.status.value}', không thể resubmit. "
                   f"Chỉ NEEDS_MORE_INFO, PARTIALLY_VERIFIED, REJECTED mới được resubmit."
        )

    now = datetime.utcnow()
    doc.status = DocumentStatusEnum.PENDING_VERIFICATION
    case.status = VerificationCaseStatusEnum.PENDING
    case.submitted_at = now
    case.reviewed_at = None
    case.reviewed_by_admin_id = None
    if submit_req.evidenceIds:
        db.query(CVEvidence).filter(
            CVEvidence.id.in_(submit_req.evidenceIds),
            CVEvidence.cv_document_id == document_id
        ).update({"status": EvidenceStatusEnum.PENDING}, synchronize_session=False)

    db.commit()
    db.refresh(case)

    logger.info(f"Freelancer resubmit Case ID={case.id} cho CV={document_id}")

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message="Đã resubmit hồ sơ xác minh thành công.",
        data=ResubmitVerificationResponse(
            caseId=case.id,
            documentId=document_id,
            status=case.status,
            resubmittedAt=now
        ),
        error=None,
        path=request.url.path
    )