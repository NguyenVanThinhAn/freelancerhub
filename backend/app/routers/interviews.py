from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.interviews import Interview
from app.models.proposals import Proposal
from app.schemas.interviews import InterviewCreate, InterviewOut
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/interviews", tags=["Interviews"])

@router.post("")
def create_interview(
    request: Request,
    interview_in: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "ENTERPRISE":
        raise HTTPException(status_code=403, detail="Only enterprise users can schedule interviews")
    
    # Verify proposal exists and belongs to current user's organization
    proposal = db.query(Proposal).filter(Proposal.id == interview_in.proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
        
    org_id = current_user.get("organization_id")
    if proposal.job.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Not authorized to schedule interview for this proposal")

    new_interview = Interview(
        proposal_id=interview_in.proposal_id,
        organization_id=org_id,
        interview_type=interview_in.interview_type,
        start_time=interview_in.start_time,
        duration_minutes=interview_in.duration_minutes,
        platform=interview_in.platform,
        meet_link=interview_in.meet_link,
        note=interview_in.note
    )
    
    db.add(new_interview)
    db.commit()
    db.refresh(new_interview)
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message='Tạo lịch phỏng vấn thành công',
        data=InterviewOut.model_validate(new_interview).model_dump(),
        error=None,
        path=request.url.path
    )

@router.get("")
def get_interviews(
    request: Request,
    proposal_id: str = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = db.query(Interview)
    
    if current_user.get("role") == "ENTERPRISE":
        org_id = current_user.get("organization_id")
        query = query.filter(Interview.organization_id == org_id)
    elif current_user.get("role") == "FREELANCER":
        # Get interviews for this freelancer's proposals
        user_id = current_user.get("sub")
        query = query.join(Proposal).filter(Proposal.freelancer_id == user_id)
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    if proposal_id:
        query = query.filter(Interview.proposal_id == proposal_id)
        
    interviews = query.order_by(Interview.start_time.desc()).all()
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách phỏng vấn thành công',
        data=[InterviewOut.model_validate(i).model_dump() for i in interviews],
        error=None,
        path=request.url.path
    )
