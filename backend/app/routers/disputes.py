from fastapi import APIRouter, Depends, Request, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.schemas.disputes import (
    DisputeCreate, DisputeOut, DisputeEvidenceCreate, DisputeEvidenceOut,
    DisputeResolution, DisputeStatusEnum, DisputeSeverityEnum, DisputeReasonCodeEnum,
)
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user, require_role
from app.models.users import User
from app.models.freelancers import FrelancerProfile
from app.models.organizations import Organization
from app.models.contracts import Contract
from app.models.disputes import DisputeStatus
from app.services import disputes as dispute_service

router = APIRouter()


# ────────────────────────────────────────────────────────────────
# User endpoints
# ────────────────────────────────────────────────────────────────

@router.post('/disputes')
def create_dispute(
    request: Request,
    payload: DisputeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Freelancer hoặc Org Owner mở dispute cho contract của họ."""
    contract = db.query(Contract).filter(Contract.id == payload.contract_id).first()
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Contract {payload.contract_id} không tìm thấy'
        )

    # Verify caller là party của contract (freelancer hoặc org owner)
    profile = db.query(FrelancerProfile).filter(FrelancerProfile.user_id == current_user.id).first()
    organization = db.query(Organization).filter(Organization.owner_user_id == current_user.id).first()

    is_party = (profile and contract.freelancer_id == profile.user_id) or \
               (organization and contract.organization_id == organization.id)
    if not is_party:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Bạn không có quyền tạo dispute cho contract này'
        )

    try:
        dispute = dispute_service.create_dispute(
            db=db,
            actor_id=current_user.id,
            contract_id=payload.contract_id,
            milestone_id=payload.milestone_id,
            reason_code=payload.reason_code.value if hasattr(payload.reason_code, 'value') else str(payload.reason_code),
            description=payload.description,
            severity=payload.severity.value if hasattr(payload.severity, 'value') else str(payload.severity),
            # legacy alias nếu payload không có reason_code/description
            reason=payload.description,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message='Tạo dispute thành công',
        data=DisputeOut.model_validate(dispute).model_dump(),
        error=None,
        path=request.url.path,
    )


@router.get('/disputes')
def list_my_disputes(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List disputes của user hiện tại (freelancer hoặc org owner)."""
    disputes = dispute_service.get_disputes_for_user(db, current_user.id)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách disputes thành công',
        data=[DisputeOut.model_validate(d).model_dump() for d in disputes],
        error=None,
        path=request.url.path,
    )


@router.get('/disputes/{dispute_id}')
def get_dispute(
    request: Request,
    dispute_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Chi tiết 1 dispute. Caller phải là party hoặc admin."""
    dispute = dispute_service.get_dispute_by_id(db, dispute_id)
    if not dispute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Dispute không tìm thấy'
        )

    # RBAC: admin xem tất cả, user chỉ xem disputes của mình
    if current_user.role != 'admin':
        contract = db.query(Contract).filter(Contract.id == dispute.contract_id).first()
        if not contract:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Contract không tìm thấy')
        org = db.query(Organization).filter(Organization.id == contract.organization_id).first()
        is_party = (
            contract.freelancer_id == current_user.id
            or (org and org.owner_user_id == current_user.id)
        )
        if not is_party:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Bạn không có quyền xem dispute này'
            )

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy dispute thành công',
        data=DisputeOut.model_validate(dispute).model_dump(),
        error=None,
        path=request.url.path,
    )


@router.get('/contracts/{contract_id}/disputes')
def get_contract_disputes(
    request: Request,
    contract_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disputes của 1 contract. Caller phải là party hoặc admin."""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Contract không tìm thấy')

    if current_user.role != 'admin':
        org = db.query(Organization).filter(Organization.id == contract.organization_id).first()
        is_party = (
            contract.freelancer_id == current_user.id
            or (org and org.owner_user_id == current_user.id)
        )
        if not is_party:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Bạn không có quyền xem disputes của contract này'
            )

    disputes = dispute_service.get_disputes_by_contract(db, contract_id)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách disputes thành công',
        data=[DisputeOut.model_validate(d).model_dump() for d in disputes],
        error=None,
        path=request.url.path,
    )


@router.post('/disputes/{dispute_id}/evidence')
def submit_evidence(
    request: Request,
    dispute_id: str,
    payload: DisputeEvidenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """User nộp minh chứng. Tự động transition OPEN → UNDER_REVIEW."""
    try:
        evidence = dispute_service.submit_evidence(
            db=db,
            dispute_id=dispute_id,
            submitter_id=current_user.id,
            evidence_text=payload.evidence_text,
            file_urls=payload.file_urls,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message='Nộp bằng chứng thành công',
        data=DisputeEvidenceOut.model_validate(evidence).model_dump(),
        error=None,
        path=request.url.path,
    )


@router.get('/disputes/{dispute_id}/evidence')
def list_evidence(
    request: Request,
    dispute_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List tất cả evidence của dispute."""
    dispute = dispute_service.get_dispute_by_id(db, dispute_id)
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Dispute không tìm thấy')

    evidences = sorted(dispute.evidence, key=lambda e: e.submitted_at, reverse=True)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách evidence thành công',
        data=[DisputeEvidenceOut.model_validate(e).model_dump() for e in evidences],
        error=None,
        path=request.url.path,
    )


# ────────────────────────────────────────────────────────────────
# Admin endpoints (require_role('admin'))
# ────────────────────────────────────────────────────────────────

@router.get('/admin/disputes', status_code=status.HTTP_200_OK, dependencies=[Depends(require_role('admin'))])
def admin_list_disputes(
    request: Request,
    status_filter: Optional[DisputeStatusEnum] = Query(None, alias='status'),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db),
):
    """Admin queue: list tất cả disputes, filter status, pagination."""
    s_filter = DisputeStatus(status_filter.value) if status_filter else None
    items, total = dispute_service.get_all_disputes_for_admin(
        db,
        status_filter=s_filter,
        page=page,
        limit=limit,
    )
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách disputes (admin) thành công',
        data={
            'items': [DisputeOut.model_validate(d).model_dump() for d in items],
            'total': total,
            'page': page,
            'limit': limit,
        },
        error=None,
        path=request.url.path,
    )


@router.post('/admin/disputes/{dispute_id}/resolve', status_code=status.HTTP_200_OK,
             dependencies=[Depends(require_role('admin'))])
def resolve_dispute(
    request: Request,
    dispute_id: str,
    payload: DisputeResolution,
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db),
):
    """
    Admin resolve dispute — phán quyết cuối cùng.

    Resolution:
    - 'freelancer': 100% milestone → freelancer wallet, milestone = PAID
    - 'client': 100% refund → org wallet, milestone = CANCELLED
    - 'split': freelancer_percentage% → freelancer, phần còn → org (refund)

    State machine: phải ở UNDER_REVIEW (hoặc OPEN nếu admin quyết trước).
    Audit log: mọi resolve ghi vào audit_logs.
    """
    try:
        dispute = dispute_service.resolve_dispute(
            db=db,
            dispute_id=dispute_id,
            actor_id=admin_user.id,
            resolution_type=payload.resolution_type,
            freelancer_percentage=payload.freelancer_percentage or 100.0,
            notes=payload.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except dispute_service.DisputeStateError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Giải quyết dispute thành công',
        data=DisputeOut.model_validate(dispute).model_dump(),
        error=None,
        path=request.url.path,
    )


@router.post('/admin/disputes/{dispute_id}/close', status_code=status.HTTP_200_OK,
             dependencies=[Depends(require_role('admin'))])
def close_dispute_endpoint(
    request: Request,
    dispute_id: str,
    payload: Optional[dict] = None,
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db),
):
    """Admin đóng dispute (terminal). Optional body: {notes: '...'}."""
    notes = None
    if payload and isinstance(payload, dict):
        notes = payload.get('notes')

    try:
        dispute = dispute_service.close_dispute(
            db=db,
            dispute_id=dispute_id,
            actor_id=admin_user.id,
            notes=notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except dispute_service.DisputeStateError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Đóng dispute thành công',
        data=DisputeOut.model_validate(dispute).model_dump(),
        error=None,
        path=request.url.path,
    )


@router.post('/admin/disputes/{dispute_id}/assign', status_code=status.HTTP_200_OK,
             dependencies=[Depends(require_role('admin'))])
def assign_dispute_endpoint(
    request: Request,
    dispute_id: str,
    payload: dict,
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db),
):
    """Admin assign moderator cho dispute. Body: {moderator_id: 'uuid'}."""
    moderator_id = (payload or {}).get('moderator_id')
    if not moderator_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='moderator_id là bắt buộc'
        )

    try:
        dispute = dispute_service.assign_dispute(
            db=db,
            dispute_id=dispute_id,
            actor_id=admin_user.id,
            moderator_id=moderator_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Assign moderator thành công',
        data=DisputeOut.model_validate(dispute).model_dump(),
        error=None,
        path=request.url.path,
    )
