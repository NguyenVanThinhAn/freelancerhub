from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.contracts import (
    ContractOut, ContractListOut, MilestoneCreate, MilestoneOut,
    WorkSubmissionCreate, WorkSubmissionOut, MilestoneReviewDecision,
    ContractStatusEnum, MilestoneStatusEnum
)
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user
from app.models.users import User
from app.models.freelancers import FrelancerProfile
from app.models.organizations import Organization
from app.models.contracts import Contract, Milestone, Deliverable, ContractStatus
from app.services import contracts as contract_service

router = APIRouter()


@router.get('/contracts/my')
def get_my_contracts(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id
    ).first()

    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id
    ).first()

    contracts = []
    if profile:
        contracts.extend(contract_service.get_contracts_by_freelancer(db, profile.user_id))
    if organization:
        org_contracts = contract_service.get_contracts_by_organization(db, organization.id)
        for c in org_contracts:
            if c not in contracts:
                contracts.append(c)

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách contracts thành công',
        data=[ContractListOut.model_validate(c).model_dump() for c in contracts],
        error=None,
        path=request.url.path
    )


@router.get('/contracts/{contract_id}')
def get_contract(
    request: Request,
    contract_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contract = contract_service.get_contract_by_id(db, contract_id)
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Contract không tìm thấy')

    profile = db.query(FrelancerProfile).filter(FrelancerProfile.user_id == current_user.id).first()
    organization = db.query(Organization).filter(Organization.owner_user_id == current_user.id).first()

    if profile and contract.freelancer_id == profile.user_id:
        pass
    elif organization and contract.organization_id == organization.id:
        pass
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Bạn không có quyền xem contract này')

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy contract thành công',
        data=ContractOut.model_validate(contract).model_dump(),
        error=None,
        path=request.url.path
    )


@router.post('/contracts')
def create_contract(
    request: Request,
    job_id: str,
    freelancer_id: str,
    total_amount: float,
    proposal_id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id
    ).first()
    if not organization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Bạn không có tổ chức')

    contract = contract_service.create_contract(
        db=db,
        job_id=job_id,
        freelancer_id=freelancer_id,
        organization_id=organization.id,
        total_amount=total_amount,
        proposal_id=proposal_id
    )
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message='Tạo contract thành công',
        data=ContractOut.model_validate(contract).model_dump(),
        error=None,
        path=request.url.path
    )


@router.post('/contracts/{contract_id}/milestones')
def create_milestone(
    request: Request,
    contract_id: str,
    payload: MilestoneCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contract = contract_service.get_contract_by_id(db, contract_id)
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Contract không tìm thấy')

    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id,
        Organization.id == contract.organization_id
    ).first()
    if not organization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Bạn không có quyền thêm milestone')

    milestone = contract_service.create_milestone(
        db=db,
        contract_id=contract_id,
        title=payload.title,
        description=payload.description,
        amount=payload.amount,
        due_date=payload.due_date
    )
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message='Tạo milestone thành công',
        data=MilestoneOut.model_validate(milestone).model_dump(),
        error=None,
        path=request.url.path
    )


@router.post('/milestones/{milestone_id}/submit')
def submit_work(
    request: Request,
    milestone_id: str,
    payload: WorkSubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Không tìm thấy freelancer profile')

    deliverable = contract_service.submit_deliverable(
        db=db,
        milestone_id=milestone_id,
        freelancer_id=profile.user_id,
        content=payload.content,
        file_urls=payload.file_urls
    )
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message='Nộp deliverable thành công',
        data=WorkSubmissionOut.model_validate(deliverable).model_dump(),
        error=None,
        path=request.url.path
    )


@router.post('/deliverables/{deliverable_id}/approve')
def approve_deliverable(
    request: Request,
    deliverable_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deliverable = contract_service.approve_deliverable(db, deliverable_id)
    if not deliverable:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Deliverable không tìm thấy')
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Phê duyệt deliverable thành công',
        data=WorkSubmissionOut.model_validate(deliverable).model_dump(),
        error=None,
        path=request.url.path
    )


@router.post('/deliverables/{deliverable_id}/reject')
def reject_deliverable(
    request: Request,
    deliverable_id: str,
    payload: MilestoneReviewDecision,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deliverable = contract_service.reject_deliverable(db, deliverable_id, payload.feedback)
    if not deliverable:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Deliverable không tìm thấy')
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Từ chối deliverable thành công',
        data=WorkSubmissionOut.model_validate(deliverable).model_dump(),
        error=None,
        path=request.url.path
    )


@router.post('/contracts/{contract_id}/complete')
def complete_contract(
    request: Request,
    contract_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contract = contract_service.complete_contract(db, contract_id)
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Contract không tìm thấy')
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Hoàn thành contract thành công',
        data=ContractOut.model_validate(contract).model_dump(),
        error=None,
        path=request.url.path
    )
