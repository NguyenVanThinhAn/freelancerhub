from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.disputes import (
    DisputeCreate, DisputeOut, DisputeEvidenceCreate, DisputeEvidenceOut,
    DisputeResolution, DisputeStatusEnum
)
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user
from app.models.users import User
from app.models.freelancers import FrelancerProfile
from app.models.organizations import Organization
from app.models.contracts import Contract
from app.services import disputes as dispute_service

router = APIRouter()


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
