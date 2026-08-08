from __future__ import annotations
import uuid
import json as _json
import hashlib
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
    VerificationDecisionActionEnum,
    VerificationReasonCodeEnum,
    REASON_CODE_BY_ACTION,
)
from app.models.audit_log import AuditLog
from app.schemas.verification import (
    CVEvidenceResponse,
    VerificationCaseSummaryItem,
    VerificationCaseListResponse,
    Verification3ColumnDetail,
    VerificationCaseDetailResponse,
    VerificationDecisionRequest,
    VerificationDecisionResponse,
    AuditLogEntry,
    AuditHistoryResponse,
)
from app.schemas.default import BaseResponse
from app.core.logger import logger
from app.core.dependencies import require_role
from app.core.config_trust import get_badge_name
from app.core.idempotency import get as idem_get, put as idem_put
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

    Theo MASTER-DOC §M.6:
    - REJECT/REQUEST_MORE_INFO yêu cầu `reason_code` (free-text notes không đủ).
    - reason_code=OTHER yêu cầu notes không rỗng.
    - Endpoint hỗ trợ Idempotency-Key header (24h TTL, in-memory cache).
    - Mỗi action ghi 1 audit_log (admin_id, prior_state, new_state, reason_code, notes, timestamp).
    """
    # 1) Idempotency check (theo MASTER-DOC §M.6: "decision endpoint must be idempotent")
    idem_key = request.headers.get("Idempotency-Key")
    # Limit key length to avoid abuse (DB column VARCHAR(100))
    if idem_key and len(idem_key) > 100:
        idem_key = idem_key[:100]
    body_hash = ""
    if idem_key:
        try:
            raw_body = await request.body()
            body_hash = hashlib.sha256(raw_body).hexdigest()
        except Exception:
            # Body không đọc được (client disconnect, etc.) — fall through,
            # nhưng KHÔNG cache với key này (hash rỗng sẽ conflict với mọi replay).
            idem_key = None
        else:
            cached = idem_get(idem_key)
            if cached:
                if cached["payload_hash"] != body_hash:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Idempotency-Key đã được dùng với payload khác. Vui lòng tạo key mới.",
                    )
                # Same key + same payload → return cached response without re-execution
                return cached["response"]

    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy Hồ sơ Xác minh với Case ID: {case_id}"
        )

    # 1.5) State-machine guard (MASTER-DOC §L.2: VERIFIED/REJECTED là terminal).
    # Cho phép transition: PENDING/IN_REVIEW/NEEDS_MORE_INFO/PARTIALLY_VERIFIED → mọi action.
    # PARTIALLY_VERIFIED cũng được re-review để fix lỗi (sửa partial → verified).
    TERMINAL_STATUSES = {
        VerificationCaseStatusEnum.VERIFIED,
        VerificationCaseStatusEnum.REJECTED,
    }
    if case.status in TERMINAL_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Case đã ở trạng thái terminal [{case.status.value}]. "
                f"Không thể đưa ra quyết định mới."
            ),
        )

    admin_id = admin_user.id

    now = datetime.utcnow()
    action = decision_req.action

    # 2) Validate reason_code theo action family (MASTER-DOC §M.6)
    if action in (VerificationDecisionActionEnum.REJECT, VerificationDecisionActionEnum.REQUEST_MORE_INFO):
        if decision_req.reason_code is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"reason_code là BẮT BUỘC khi action={action.value}. "
                    f"Chọn 1 trong các code: "
                    f"{sorted(c.value for c in REASON_CODE_BY_ACTION[action])}"
                ),
            )
        allowed_codes = REASON_CODE_BY_ACTION[action]
        if decision_req.reason_code not in allowed_codes:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"reason_code='{decision_req.reason_code.value}' không hợp lệ cho action={action.value}. "
                    f"Chỉ chấp nhận: {sorted(c.value for c in allowed_codes)}"
                ),
            )

    # 3) Khi reason_code=OTHER mà notes rỗng → yêu cầu ghi chú chi tiết
    if decision_req.reason_code == VerificationReasonCodeEnum.OTHER:
        notes_text = (decision_req.reason or "").strip()
        if not notes_text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Khi reason_code=OTHER, trường 'reason' (notes) là BẮT BUỘC để ghi rõ lý do.",
            )

    # 3.5) PARTIALLY_VERIFY bắt buộc có verifiedFieldPaths (chống silent full-verify).
    if action == VerificationDecisionActionEnum.PARTIALLY_VERIFY:
        paths = decision_req.verifiedFieldPaths or []
        if not paths:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Khi action=PARTIALLY_VERIFY, 'verifiedFieldPaths' phải chứa ít nhất 1 field_path. "
                    "Không được gửi mảng rỗng (sẽ bị hiểu nhầm thành duyệt toàn bộ)."
                ),
            )

    # 4) Snapshot prior_state TRƯỚC khi mutate (audit log cần)
    prior_state = {"status": case.status.value}

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
        reason_code=decision_req.reason_code,
        reason=decision_req.reason,
        verified_field_paths=decision_req.verifiedFieldPaths,
        idempotency_key=idem_key,
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

    # 5) Audit log (MASTER-DOC §M.6: "Every action records admin ID, timestamp, prior state and new state")
    audit = AuditLog(
        id=str(uuid.uuid4()),
        entity_type="verification_case",
        entity_id=case.id,
        actor_id=admin_id,
        actor_role="admin",
        action=action.value,
        prior_state=prior_state,
        new_state={
            "status": new_case_status.value,
            "verified_field_paths": decision_req.verifiedFieldPaths or None,
        },
        reason_code=decision_req.reason_code.value if decision_req.reason_code else None,
        notes=decision_req.reason,
        idempotency_key=idem_key,
        ip_address=request.client.host if request.client else None,
        user_agent=(request.headers.get("user-agent") or "")[:255],
    )
    db.add(audit)

    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.error(
            f"DB commit failed cho case {case.id} action={action.value} admin={admin_id}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể lưu quyết định. Vui lòng thử lại.",
        )

    logger.info(
        f"Admin ID={admin_id} đã đưa ra quyết định [{action.value}] "
        f"reason_code={decision_req.reason_code.value if decision_req.reason_code else None} "
        f"cho Case ID={case.id}. Trạng thái mới: {new_case_status.value}"
    )

    decision_res = VerificationDecisionResponse(
        caseId=case.id,
        documentId=case.cv_document_id,
        action=action,
        newStatus=new_case_status,
        reasonCode=decision_req.reason_code,
        reviewedAt=now,
        message=f"Đã cập nhật quyết định xác minh [{action.value}] thành công."
    )

    response = BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message="Gửi quyết định xác minh thành công.",
        data=decision_res,
        error=None,
        path=request.url.path
    )

    # 6) Cache response by Idempotency-Key (24h TTL)
    if idem_key:
        # BaseResponse.create() returns dict; ensure datetimes JSON-safe
        response_dict = response if isinstance(response, dict) else _json.loads(_json.dumps(response, default=str))
        if isinstance(response_dict.get("data"), dict) and "reviewedAt" in response_dict["data"]:
            reviewed_at = response_dict["data"]["reviewedAt"]
            if hasattr(reviewed_at, "isoformat"):
                response_dict["data"]["reviewedAt"] = reviewed_at.isoformat()
        idem_put(idem_key, body_hash, response_dict, status.HTTP_200_OK)

    return response


@router.get("/admin/verifications/{case_id}/audit", status_code=status.HTTP_200_OK)
async def get_audit_history(
    request: Request,
    case_id: str,
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db)
):
    """
    API Dành cho Admin: Lấy lịch sử audit của 1 verification case.
    Trả về các entry audit_log (admin_id, action, prior_state, new_state, reason_code, notes, timestamp)
    theo thứ tự thời gian (cũ → mới).
    """
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy Hồ sơ Xác minh với Case ID: {case_id}",
        )

    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.entity_type == "verification_case",
            AuditLog.entity_id == case_id,
        )
        .order_by(AuditLog.created_at.asc())
        .all()
    )

    # Cache user lookup để tránh N+1
    actor_ids = {log.actor_id for log in logs}
    actors_by_id = {}
    if actor_ids:
        for u in db.query(User).filter(User.id.in_(actor_ids)).all():
            actors_by_id[u.id] = u.email

    items = [
        AuditLogEntry(
            id=log.id,
            actorId=log.actor_id,
            actorEmail=actors_by_id.get(log.actor_id, "system"),
            action=log.action,
            priorState=log.prior_state or {},
            newState=log.new_state or {},
            reasonCode=log.reason_code,
            notes=log.notes,
            createdAt=log.created_at,
        )
        for log in logs
    ]

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message="Lấy lịch sử audit thành công.",
        data=AuditHistoryResponse(
            caseId=case_id,
            decisions=items,
            totalDecisions=len(items),
        ),
        error=None,
        path=request.url.path,
    )
