from __future__ import annotations
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.users import User
from app.models.cv_documents import CVDocument, DocumentStatusEnum
from app.models.cv_results import CVParseResult, CVExtractedField, FieldEvidenceLevelEnum
from app.models.verifications import (
    CVEvidence,
    VerificationCase,
    VerificationDecision,
    TrustPassportEntry,
    EvidenceStatusEnum,
    VerificationCaseStatusEnum,
    VerificationDecisionActionEnum
)
from app.schemas.verification import (
    CVEvidenceResponse,
    VerificationCaseSummaryItem,
    VerificationCaseListResponse,
    Verification3ColumnDetail,
    VerificationCaseDetailResponse,
    VerificationDecisionRequest,
    VerificationDecisionResponse
)
from app.schemas.default import BaseResponse
from app.core.logger import logger
from app.core.dependencies import require_role
from app.core.config_trust import get_badge_name
from app.models.notifications import Notification, NotificationType
import json


def _send_verification_notification(db, case, action, reason, admin_id):
    """
    Tạo notification cho Freelancer khi Admin đưa ra quyết định.
    Theo MASTER-DOC Phần M.6 & CV-06 screen: Freelancer cần thấy outcome.
    """
    if action == VerificationDecisionActionEnum.REJECT:
        notif_type = NotificationType.VERIFICATION_REJECTED
        title = "Hồ sơ xác minh bị từ chối"
        message = (
            f"Hồ sơ xác minh của bạn đã bị Admin từ chối. "
            f"Lý do: {reason or 'Không có giải thích cụ thể.'} "
            f"Vui lòng chỉnh sửa và resubmit."
        )
    elif action == VerificationDecisionActionEnum.REQUEST_MORE_INFO:
        notif_type = NotificationType.VERIFICATION_NEEDS_MORE_INFO
        title = "Yêu cầu bổ sung thông tin"
        message = (
            f"Admin yêu cầu bạn bổ sung thêm minh chứng hoặc thông tin. "
            f"Ghi chú: {reason or 'Không có.'}"
        )
    elif action == VerificationDecisionActionEnum.VERIFY:
        notif_type = NotificationType.VERIFICATION_APPROVED
        title = "Hồ sơ xác minh được phê duyệt!"
        message = "Chúc mừng! Hồ sơ xác minh của bạn đã được Admin phê duyệt toàn bộ. Trust Passport của bạn đã được cập nhật."
    elif action == VerificationDecisionActionEnum.PARTIALLY_VERIFY:
        notif_type = NotificationType.VERIFICATION_PARTIALLY_APPROVED
        title = "Hồ sơ được phê duyệt một phần"
        message = (
            f"Hồ sơ của bạn đã được phê duyệt một phần. "
            f"Vui lòng bổ sung thêm minh chứng cho các trường còn lại."
        )
    else:
        return

    metadata = {
        "case_id": case.id,
        "document_id": case.cv_document_id,
        "admin_id": admin_id,
        "action": action.value,
        "reason": reason,
    }

    # Defensive: nếu freelancer user đã bị xóa (orphan case),
    # FK constraint sẽ fail khi insert. Log + skip để admin decision vẫn thành công.
    freelancer = db.query(User).filter(User.id == case.freelancer_id).first()
    if not freelancer:
        logger.warning(
            f"Skip notification cho case {case.id}: freelancer {case.freelancer_id} không tồn tại "
            f"(orphan case — user đã bị xóa). Decision vẫn được lưu."
        )
        return

    notif = Notification(
        id=str(uuid.uuid4()),
        user_id=case.freelancer_id,
        type=notif_type,
        title=title,
        message=message,
        action_url=f"/freelancer/verifications/{case.id}",
        is_read=False,
    )
    db.add(notif)
    logger.info(f"Tạo notification [{notif_type.value}] cho user {case.freelancer_id} về case {case.id}")


router = APIRouter()


@router.get("/admin/verifications", status_code=status.HTTP_200_OK)
async def get_admin_verification_cases(
    request: Request,
    status_filter: Optional[VerificationCaseStatusEnum] = Query(None, description="Lọc theo trạng thái Case (PENDING, VERIFIED...)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db)
):
    """
    API Dành cho Admin: Lấy danh sách hàng đợi các Hồ sơ Yêu cầu Xác minh (Verification Cases).
    """
    query = db.query(VerificationCase)
    if status_filter:
        query = query.filter(VerificationCase.status == status_filter)
    else:
        # Ưu tiên các hồ sơ PENDING lên đầu
        query = query.order_by(
            VerificationCase.status == VerificationCaseStatusEnum.PENDING,
            VerificationCase.submitted_at.desc()
        )

    total = query.count()
    offset = (page - 1) * limit
    cases = query.offset(offset).limit(limit).all()

    items = []
    for c in cases:
        freelancer = db.query(User).filter(User.id == c.freelancer_id).first()
        profile = freelancer.freelancer_profile if freelancer else None
        freelancer_name = profile.display_name if (profile and profile.display_name) else (freelancer.email if freelancer else "N/A")
        
        doc = db.query(CVDocument).filter(CVDocument.id == c.cv_document_id).first()
        evidences_count = db.query(CVEvidence).filter(CVEvidence.cv_document_id == c.cv_document_id).count()

        items.append(
            VerificationCaseSummaryItem(
                caseId=c.id,
                documentId=c.cv_document_id,
                freelancerId=c.freelancer_id,
                freelancerName=freelancer_name,
                freelancerEmail=freelancer.email if freelancer else "N/A",
                cvFilename=doc.original_filename if doc else "N/A",
                status=c.status,
                submittedAt=c.submitted_at,
                evidencesCount=evidences_count
            )
        )

    list_res = VerificationCaseListResponse(total=total, items=items)

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message="Lấy danh sách hàng đợi xác minh thành công.",
        data=list_res,
        error=None,
        path=request.url.path
    )


@router.get("/admin/verifications/{case_id}", status_code=status.HTTP_200_OK)
async def get_admin_verification_case_detail(
    request: Request,
    case_id: str,
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db)
):
    """
    API Dành cho Admin: Lấy chi tiết hồ sơ xác minh với giao diện ĐỐI SOÁT 3 CỘT
    (1. Dữ liệu AI bóc tách -> 2. Dữ liệu Freelancer tự sửa -> 3. File Minh chứng đính kèm).
    """
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy Hồ sơ Xác minh với Case ID: {case_id}"
        )

    freelancer = db.query(User).filter(User.id == case.freelancer_id).first()
    doc = db.query(CVDocument).filter(CVDocument.id == case.cv_document_id).first()
    evidences = db.query(CVEvidence).filter(CVEvidence.cv_document_id == case.cv_document_id).all()
    evidence_res_list = [CVEvidenceResponse.model_validate(e) for e in evidences]

    # Lấy dữ liệu trích xuất từ AI và dữ liệu Freelancer đã review
    parse_result = db.query(CVParseResult).filter(CVParseResult.cv_document_id == case.cv_document_id).first()
    three_column_list = []

    if parse_result:
        fields = db.query(CVExtractedField).filter(CVExtractedField.cv_parse_result_id == parse_result.id).all()
        for ef in fields:
            requires_review = (ef.confidence is not None and ef.confidence < 0.70)
            is_user_edited = (ef.evidence_level == FieldEvidenceLevelEnum.USER_CONFIRMED)

            three_column_list.append(
                Verification3ColumnDetail(
                    fieldPath=ef.field_path,
                    aiExtractedValue=ef.value_json,
                    aiConfidence=ef.confidence,
                    userConfirmedValue=ef.value_json if is_user_edited else None,
                    evidenceLevel=ef.evidence_level.value,
                    isUserEdited=is_user_edited,
                    requiresUserReview=requires_review
                )
            )

    profile = freelancer.freelancer_profile if freelancer else None
    freelancer_name = profile.display_name if (profile and profile.display_name) else (freelancer.email if freelancer else "N/A")

    detail_res = VerificationCaseDetailResponse(
        caseId=case.id,
        documentId=case.cv_document_id,
        freelancerId=case.freelancer_id,
        freelancerName=freelancer_name,
        freelancerEmail=freelancer.email if freelancer else "N/A",
        cvFilename=doc.original_filename if doc else "N/A",
        status=case.status,
        submittedAt=case.submitted_at,
        notes=case.notes,
        evidences=evidence_res_list,
        threeColumnData=three_column_list
    )

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message="Lấy chi tiết hồ sơ đối soát 3 cột thành công.",
        data=detail_res,
        error=None,
        path=request.url.path
    )


@router.patch("/admin/verifications/{case_id}/decision", status_code=status.HTTP_200_OK, dependencies=[Depends(require_role('admin'))])
async def make_admin_verification_decision(
    request: Request,
    case_id: str,
    decision_req: VerificationDecisionRequest,
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db)
):
    """
    API Dành cho Admin: Đưa ra phán quyết Phê duyệt / Từ chối Hồ sơ Xác minh.
    - Phê duyệt (VERIFY / PARTIALLY_VERIFY): Tự động nâng cấp `evidence_level` thành `PLATFORM_VERIFIED` và ghi nhận Huy hiệu xanh vào `trust_passport_entries`.
    """
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy Hồ sơ Xác minh với Case ID: {case_id}"
        )

    admin_id = admin_user.id

    now = datetime.utcnow()
    action = decision_req.action

    # Map trạng thái tương ứng
    status_map = {
        VerificationDecisionActionEnum.VERIFY: (VerificationCaseStatusEnum.VERIFIED, DocumentStatusEnum.VERIFIED),
        VerificationDecisionActionEnum.PARTIALLY_VERIFY: (VerificationCaseStatusEnum.PARTIALLY_VERIFIED, DocumentStatusEnum.PARTIALLY_VERIFIED),
        VerificationDecisionActionEnum.REQUEST_MORE_INFO: (VerificationCaseStatusEnum.NEEDS_MORE_INFO, DocumentStatusEnum.NEEDS_MORE_INFO),
        VerificationDecisionActionEnum.REJECT: (VerificationCaseStatusEnum.REJECTED, DocumentStatusEnum.REJECTED)
    }

    new_case_status, new_doc_status = status_map[action]

    # Cập nhật Case và Document
    case.status = new_case_status
    case.reviewed_at = now
    case.reviewed_by_admin_id = admin_id

    doc = db.query(CVDocument).filter(CVDocument.id == case.cv_document_id).first()
    if doc:
        doc.status = new_doc_status

    # Cập nhật trạng thái các Evidences
    if action in [VerificationDecisionActionEnum.VERIFY, VerificationDecisionActionEnum.PARTIALLY_VERIFY]:
        db.query(CVEvidence).filter(CVEvidence.cv_document_id == case.cv_document_id).update(
            {"status": EvidenceStatusEnum.VERIFIED}, synchronize_session=False
        )
    elif action == VerificationDecisionActionEnum.REJECT:
        db.query(CVEvidence).filter(CVEvidence.cv_document_id == case.cv_document_id).update(
            {"status": EvidenceStatusEnum.REJECTED}, synchronize_session=False
        )

    # Lưu bản ghi lịch sử quyết định Admin Decision
    decision_rec = VerificationDecision(
        id=str(uuid.uuid4()),
        verification_case_id=case.id,
        admin_id=admin_id,
        action=action,
        reason=decision_req.reason,
        verified_field_paths=decision_req.verifiedFieldPaths
    )
    db.add(decision_rec)

    # NẾU DUYỆT (VERIFY HOẶC PARTIALLY_VERIFY): Nâng cấp evidence_level và Cấp Trust Passport Badges
    if action in [VerificationDecisionActionEnum.VERIFY, VerificationDecisionActionEnum.PARTIALLY_VERIFY]:
        parse_result = db.query(CVParseResult).filter(CVParseResult.cv_document_id == case.cv_document_id).first()
        if parse_result:
            fields_query = db.query(CVExtractedField).filter(CVExtractedField.cv_parse_result_id == parse_result.id)
            
            if action == VerificationDecisionActionEnum.PARTIALLY_VERIFY and decision_req.verifiedFieldPaths:
                approved_paths = decision_req.verifiedFieldPaths
            else: # VERIFY toàn bộ
                approved_fields_all = fields_query.all()
                approved_paths = [ef.field_path for ef in approved_fields_all]

            # Cập nhật các fields được duyệt
            for ef in fields_query.all():
                if ef.field_path in approved_paths:
                    ef.evidence_level = FieldEvidenceLevelEnum.PLATFORM_VERIFIED
                    ef.platform_verified_at = now

                    # Thêm hoặc Cập nhật TrustPassportEntry
                    existing_entry = db.query(TrustPassportEntry).filter(
                        TrustPassportEntry.freelancer_id == case.freelancer_id,
                        TrustPassportEntry.field_path == ef.field_path
                    ).first()

                    badge_title = get_badge_name(ef.field_path, locale="vi")

                    if existing_entry:
                        existing_entry.value_json = ef.value_json
                        existing_entry.badge_name = badge_title
                        existing_entry.verification_case_id = case.id
                        existing_entry.verified_at = now
                    else:
                        passport_entry = TrustPassportEntry(
                            id=str(uuid.uuid4()),
                            freelancer_id=case.freelancer_id,
                            field_path=ef.field_path,
                            value_json=ef.value_json,
                            badge_name=badge_title,
                            verification_case_id=case.id,
                            verified_at=now
                        )
                        db.add(passport_entry)

    # Tạo thông báo cho Freelancer về quyết định của Admin (theo CV-06 screen)
    _send_verification_notification(db, case, action, decision_req.reason, admin_id)

    db.commit()

    logger.info(f"Admin ID={admin_id} đã đưa ra quyết định [{action.value}] cho Case ID={case.id}. Trạng thái mới: {new_case_status.value}")

    decision_res = VerificationDecisionResponse(
        caseId=case.id,
        documentId=case.cv_document_id,
        action=action,
        newStatus=new_case_status,
        reviewedAt=now,
        message=f"Đã cập nhật quyết định xác minh [{action.value}] thành công."
    )

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message="Gửi quyết định xác minh thành công.",
        data=decision_res,
        error=None,
        path=request.url.path
    )
