from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.shortlists import ShortlistCreate, ShortlistOut
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user
from app.models.users import User
from app.models.shortlists import Shortlist
from app.models.organizations import Organization

router = APIRouter()


@router.post('/shortlists')
def add_to_shortlist(
    request: Request,
    payload: ShortlistCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id
    ).first()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Bạn cần có Organization để shortlist freelancer'
        )

    existing = db.query(Shortlist).filter(
        Shortlist.organization_id == organization.id,
        Shortlist.freelancer_id == payload.freelancer_id,
        Shortlist.job_id == payload.job_id
    ).first()
    if existing:
        return BaseResponse.create(
            status_code=status.HTTP_200_OK,
            message='Freelancer đã có trong shortlist',
            data=ShortlistOut.model_validate(existing).model_dump(),
            error=None,
            path=request.url.path
        )

    item = Shortlist(
        organization_id=organization.id,
        freelancer_id=payload.freelancer_id,
        job_id=payload.job_id,
        notes=payload.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message='Đã thêm freelancer vào shortlist',
        data=ShortlistOut.model_validate(item).model_dump(),
        error=None,
        path=request.url.path
    )


@router.get('/shortlists')
def list_shortlists(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id
    ).first()
    if not organization:
        return BaseResponse.create(
            status_code=status.HTTP_200_OK,
            message='Chưa có Organization',
            data=[],
            error=None,
            path=request.url.path
        )

    items = db.query(Shortlist).filter(
        Shortlist.organization_id == organization.id
    ).order_by(Shortlist.created_at.desc()).all()
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy shortlist thành công',
        data=[ShortlistOut.model_validate(i).model_dump() for i in items],
        error=None,
        path=request.url.path
    )


@router.delete('/shortlists/{shortlist_id}')
def remove_from_shortlist(
    request: Request,
    shortlist_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id
    ).first()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Không có quyền xóa'
        )

    item = db.query(Shortlist).filter(
        Shortlist.id == shortlist_id,
        Shortlist.organization_id == organization.id
    ).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Shortlist item không tồn tại'
        )
    db.delete(item)
    db.commit()
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Đã xóa khỏi shortlist',
        data=None,
        error=None,
        path=request.url.path
    )