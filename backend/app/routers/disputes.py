from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi import Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.disputes import (
    DisputeCreate, DisputeOut, DisputeEvidenceCreate, DisputeEvidenceOut,
    DisputeResolution, DisputeStatusEnum
)
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user, require_role
from app.models.users import User
from app.models.freelancers import FrelancerProfile
from app.models.organizations import Organization
from app.models.contracts import Contract
from app.models.disputes import Dispute
from app.services import disputes as dispute_service

router = APIRouter()


@router.get('/disputes')
def list_my_disputes(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Collect all contract IDs the user is party to
    contract_ids = set()

    # As freelancer
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id
    ).first()
    if profile:
        freelancer_contracts = db.query(Contract.id).filter(
            Contract.freelancer_id == current_user.id
        ).all()
        for (cid,) in freelancer_contracts:
            contract_ids.add(cid)

    # As business/organization owner
    orgs = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id
    ).all()
    for org in orgs:
        biz_contracts = db.query(Contract.id).filter(
            Contract.organization_id == org.id
        ).all()
        for (cid,) in biz_contracts:
            contract_ids.add(cid)

    if not contract_ids:
        return BaseResponse.create(
            status_code=status.HTTP_200_OK,
            message='Lấy danh sách disputes thành công',
            data=[],
            error=None,
            path=request.url.path
        )

    disputes = db.query(Dispute).filter(
        Dispute.contract_id.in_(contract_ids)
    ).order_by(Dispute.created_at.desc()).all()

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách disputes thành công',
        data=[DisputeOut.model_validate(d).model_dump() for d in disputes],
        error=None,
        path=request.url.path
    )


@router.post('/disputes')
def create_dispute(
    request: Request,
    payload: DisputeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contract = db.query(Contract).filter(Contract.id == payload.contract_id).first()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Contract không tìm thấy')

    profile = db.query(FrelancerProfile).filter(FrelancerProfile.user_id == current_user.id).first()
    organization = db.query(Organization).filter(Organization.owner_user_id == current_user.id).first()

    is_party = (profile and contract.freelancer_id == profile.user_id) or \
               (organization and contract.organization_id == organization.id)

    if not is_party:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Bạn không có quyền tạo dispute cho contract này')

    dispute = dispute_service.create_dispute(
        db=db,
        contract_id=payload.contract_id,
        initiator_id=current_user.id,
        reason=payload.reason,
        milestone_id=payload.milestone_id
    )
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message='Tạo dispute thành công',
        data=DisputeOut.model_validate(dispute).model_dump(),
        error=None,
        path=request.url.path
    )


@router.get('/disputes/{dispute_id}')
def get_dispute(
    request: Request,
    dispute_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dispute = dispute_service.get_dispute_by_id(db, dispute_id)
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Dispute không tìm thấy')
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy dispute thành công',
        data=DisputeOut.model_validate(dispute).model_dump(),
        error=None,
        path=request.url.path
    )


@router.get('/contracts/{contract_id}/disputes')
def get_contract_disputes(
    request: Request,
    contract_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    disputes = dispute_service.get_disputes_by_contract(db, contract_id)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách disputes thành công',
        data=[DisputeOut.model_validate(d).model_dump() for d in disputes],
        error=None,
        path=request.url.path
    )


@router.get('/disputes/{dispute_id}/evidence')
def list_evidence(
    request: Request,
    dispute_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dispute = dispute_service.get_dispute_by_id(db, dispute_id)
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Dispute không tìm thấy')
    evidences = dispute_service.list_evidence(db, dispute_id)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách evidence thành công',
        data=[DisputeEvidenceOut.model_validate(e).model_dump() for e in evidences],
        error=None,
        path=request.url.path
    )


@router.post('/disputes/{dispute_id}/evidence')
def submit_evidence(
    request: Request,
    dispute_id: str,
    payload: DisputeEvidenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dispute = dispute_service.get_dispute_by_id(db, dispute_id)
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Dispute không tìm thấy')

    evidence = dispute_service.submit_evidence(
        db=db,
        dispute_id=dispute_id,
        submitter_id=current_user.id,
        evidence_text=payload.evidence_text,
        file_urls=payload.file_urls
    )
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message='Nộp bằng chứng thành công',
        data=DisputeEvidenceOut.model_validate(evidence).model_dump(),
        error=None,
        path=request.url.path
    )


@router.post('/disputes/{dispute_id}/resolve')
def resolve_dispute(
    request: Request,
    dispute_id: str,
    payload: DisputeResolution,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dispute = dispute_service.resolve_dispute(
        db=db,
        dispute_id=dispute_id,
        resolution_type=payload.resolution_type,
        freelancer_percentage=payload.freelancer_percentage,
        notes=payload.notes
    )
    if not dispute:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Dispute không tìm thấy')
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Giải quyết dispute thành công',
        data=DisputeOut.model_validate(dispute).model_dump(),
        error=None,
        path=request.url.path
    )


# ─── Admin endpoints ─────────────────────────────────────────────────────────

class DisputeListResponse:
    def __init__(self, total: int, items: list):
        self.total = total
        self.items = items


@router.get('/admin/disputes')
async def admin_list_disputes(
    request: Request,
    status_filter: str = Query(None, description="Lọc theo trạng thái dispute"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db)
):
    query = db.query(Dispute)
    if status_filter:
        try:
            filter_status = DisputeStatusEnum(status_filter)
            query = query.filter(Dispute.status == filter_status)
        except ValueError:
            pass

    total = query.count()
    offset = (page - 1) * limit
    disputes = query.order_by(Dispute.created_at.desc()).offset(offset).limit(limit).all()

    items = []
    for d in disputes:
        items.append(DisputeOut.model_validate(d).model_dump())

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách disputes thành công',
        data={'total': total, 'items': items},
        error=None,
        path=request.url.path
    )
