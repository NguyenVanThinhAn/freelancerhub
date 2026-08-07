from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.proposals import ProposalCreate, ProposalOut, ProposalListOut, ProposalDecision, ProposalStatusEnum
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user
from app.models.users import User
from app.models.freelancers import FrelancerProfile
from app.services import proposals as proposal_service

router = APIRouter()


@router.get('/proposals/my')
def get_my_proposals(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Không tìm thấy freelancer profile')

    proposals = proposal_service.get_proposals_by_freelancer(db, profile.user_id)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách proposals thành công',
        data=[ProposalListOut.model_validate(p).model_dump() for p in proposals],
        error=None,
        path=request.url.path
    )


@router.get('/jobs/{job_id}/proposals')
def get_job_proposals(
    request: Request,
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proposals = proposal_service.get_proposals_by_job(db, job_id)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách proposals thành công',
        data=[ProposalListOut.model_validate(p).model_dump() for p in proposals],
        error=None,
        path=request.url.path
    )


@router.get('/proposals/{proposal_id}')
def get_proposal(
    request: Request,
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proposal = proposal_service.get_proposal_by_id(db, proposal_id)
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Proposal không tìm thấy')
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy proposal thành công',
        data=ProposalOut.model_validate(proposal).model_dump(),
        error=None,
        path=request.url.path
    )


@router.post('/jobs/{job_id}/proposals')
def create_proposal(
    request: Request,
    job_id: str,
    payload: ProposalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Không tìm thấy freelancer profile')

    try:
        proposal = proposal_service.create_proposal(
            db=db,
            job_id=job_id,
            freelancer_id=profile.user_id,
            cover_letter=payload.cover_letter,
            bid_amount=payload.bid_amount,
            estimated_duration=payload.estimated_duration
        )
        return BaseResponse.create(
            status_code=status.HTTP_201_CREATED,
            message='Tạo proposal thành công',
            data=ProposalOut.model_validate(proposal).model_dump(),
            error=None,
            path=request.url.path
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post('/proposals/{proposal_id}/accept')
def accept_proposal(
    request: Request,
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ownership check: user phải là organization owner của job mà proposal này thuộc về
    proposal = proposal_service.get_proposal_by_id(db, proposal_id)
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Proposal không tìm thấy')

    job = db.query(Job).filter(Job.id == proposal.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Job không tìm thấy')

    org = db.query(Organization).filter(Organization.id == job.organization_id).first()
    if not org or org.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Bạn không có quyền chấp nhận proposal này')

    updated = proposal_service.accept_proposal(db, proposal_id)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Chấp nhận proposal thành công',
        data=ProposalOut.model_validate(updated).model_dump(),
        error=None,
        path=request.url.path
    )


@router.post('/proposals/{proposal_id}/reject')
def reject_proposal(
    request: Request,
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Ownership check: user phải là organization owner của job mà proposal này thuộc về
    proposal = proposal_service.get_proposal_by_id(db, proposal_id)
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Proposal không tìm thấy')

    job = db.query(Job).filter(Job.id == proposal.job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Job không tìm thấy')

    org = db.query(Organization).filter(Organization.id == job.organization_id).first()
    if not org or org.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Bạn không có quyền từ chối proposal này')

    updated = proposal_service.reject_proposal(db, proposal_id)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Từ chối proposal thành công',
        data=ProposalOut.model_validate(updated).model_dump(),
        error=None,
        path=request.url.path
    )


@router.post('/proposals/{proposal_id}/withdraw')
def withdraw_proposal(
    request: Request,
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Không tìm thấy freelancer profile')

    success = proposal_service.withdraw_proposal(db, proposal_id, profile.user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Proposal không tìm thấy hoặc không thể rút lại')
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Rút proposal thành công',
        data=None,
        error=None,
        path=request.url.path
    )
