from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.interviews import Interview, InterviewStatus
from app.models.organizations import Organization
from app.models.proposals import Proposal
from app.schemas.interviews import InterviewCreate, InterviewOut, InterviewStatusUpdate
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user
from datetime import datetime, timezone

router = APIRouter(prefix="/interviews", tags=["Interviews"])


def _get_user_organization(db: Session, current_user) -> Organization | None:
    return db.query(Organization).filter(
        Organization.owner_user_id == current_user.id
    ).first()


@router.post("")
def create_interview(
    request: Request,
    interview_in: InterviewCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role != "enterprise":
        raise HTTPException(status_code=403, detail="Only enterprise users can schedule interviews")

    proposal = db.query(Proposal).filter(Proposal.id == interview_in.proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    organization = _get_user_organization(db, current_user)
    if not organization or proposal.job.organization_id != organization.id:
        raise HTTPException(status_code=403, detail="Not authorized to schedule interview for this proposal")

    new_interview = Interview(
        proposal_id=interview_in.proposal_id,
        organization_id=organization.id,
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
    current_user = Depends(get_current_user)
):
    query = db.query(Interview)
    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    if role == "enterprise":
        organization = _get_user_organization(db, current_user)
        if not organization:
            return BaseResponse.create(
                status_code=status.HTTP_200_OK,
                message='Lấy danh sách phỏng vấn thành công',
                data=[],
                error=None,
                path=request.url.path
            )
        query = query.filter(Interview.organization_id == organization.id)
    elif role == "freelancer":
        query = query.join(Proposal).filter(Proposal.freelancer_id == current_user.id)
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


@router.get("/{interview_id}")
def get_interview(
    request: Request,
    interview_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lấy chi tiết 1 interview. Cả business owner của org và freelancer được phép xem."""
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview không tồn tại")

    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role == "enterprise":
        organization = _get_user_organization(db, current_user)
        if not organization or interview.organization_id != organization.id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xem interview này")
    elif role == "freelancer":
        proposal = db.query(Proposal).filter(Proposal.id == interview.proposal_id).first()
        if not proposal or proposal.freelancer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xem interview này")
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy chi tiết interview thành công',
        data=InterviewOut.model_validate(interview).model_dump(),
        error=None,
        path=request.url.path
    )


@router.patch("/{interview_id}/status")
def update_interview_status(
    request: Request,
    interview_id: str,
    payload: InterviewStatusUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Cập nhật trạng thái interview.

    Business owner có thể: SCHEDULED -> COMPLETED | CANCELLED
    Freelancer có thể: SCHEDULED -> CONFIRMED | DECLINED (lý do qua `note`)
    """
    interview = db.query(Interview).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview không tồn tại")

    role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    new_status = payload.status

    if role == "enterprise":
        organization = _get_user_organization(db, current_user)
        if not organization or interview.organization_id != organization.id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền cập nhật interview này")
        # Business chỉ được cancel/complete, không tự confirm (đó là việc của freelancer)
        allowed = {InterviewStatus.CANCELED, InterviewStatus.COMPLETED, InterviewStatus.SCHEDULED}
    elif role == "freelancer":
        proposal = db.query(Proposal).filter(Proposal.id == interview.proposal_id).first()
        if not proposal or proposal.freelancer_id != current_user.id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền cập nhật interview này")
        # Freelancer chỉ được confirm hoặc decline
        allowed = {InterviewStatus.CONFIRMED, InterviewStatus.DECLINED, InterviewStatus.SCHEDULED}
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f'Role {role} không được chuyển status sang {new_status.value}. '
                   f'Allowed: {[s.value for s in allowed]}'
        )

    interview.status = new_status
    if payload.note is not None:
        # Append note với prefix rõ role (nếu note khác rỗng)
        prefix = f"[{role}@{datetime.now(timezone.utc).isoformat()}] "
        interview.note = (interview.note + "\n" if interview.note else "") + prefix + payload.note

    db.commit()
    db.refresh(interview)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Cập nhật trạng thái interview thành công',
        data=InterviewOut.model_validate(interview).model_dump(),
        error=None,
        path=request.url.path
    )
