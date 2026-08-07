from fastapi import APIRouter, Depends, Request, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.jobs import JobCreate, JobUpdate, JobOut, JobListOut, JobSearchQuery, JobPaymentTypeEnum, JobStatusEnum
from app.schemas.categories import CategoryCreate, CategoryOut
from app.schemas.default import BaseResponse
from app.core.dependencies import get_current_user
from app.models.users import User
from app.models.organizations import Organization
from app.models.jobs import Job, JobStatus, JobPaymentType
from app.models.categories import Category
from app.services import jobs as job_service

router = APIRouter()


@router.get('/categories')
def list_categories(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    categories = db.query(Category).all()
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách categories thành công',
        data=[CategoryOut.model_validate(c).model_dump() for c in categories],
        error=None,
        path=request.url.path
    )


@router.post('/categories')
def create_category(
    request: Request,
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    category = Category(name=payload.name, description=payload.description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message='Tạo category thành công',
        data=CategoryOut.model_validate(category).model_dump(),
        error=None,
        path=request.url.path
    )


@router.get('/jobs')
def list_jobs(
    request: Request,
    search: str = Query(None),
    category_id: str = Query(None),
    budget_min: float = Query(None),
    budget_max: float = Query(None),
    payment_type: JobPaymentTypeEnum = Query(None),
    job_status_enum: JobStatusEnum = Query(JobStatusEnum.OPEN),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    skip = (page - 1) * page_size

    job_payment_type = JobPaymentType(payment_type.value) if payment_type else None
    job_status = JobStatus(job_status_enum.value) if job_status_enum else JobStatus.OPEN

    jobs = job_service.get_jobs(
        db=db,
        skip=skip,
        limit=page_size,
        search=search,
        category_id=category_id,
        budget_min=budget_min,
        budget_max=budget_max,
        payment_type=job_payment_type,
        status=job_status
    )

    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách jobs thành công',
        data=[JobListOut.model_validate(j).model_dump() for j in jobs],
        error=None,
        path=request.url.path
    )


@router.get('/jobs/my')
def list_my_jobs(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    my_org_ids = [
        org.id for org in db.query(Organization).filter(Organization.owner_user_id == current_user.id).all()
    ]
    if not my_org_ids:
        return BaseResponse.create(
            status_code=status.HTTP_200_OK,
            message='Lấy danh sách jobs của tôi thành công',
            data=[],
            error=None,
            path=request.url.path,
        )
    jobs = db.query(Job).filter(Job.organization_id.in_(my_org_ids)).order_by(Job.created_at.desc()).all()
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy danh sách jobs của tôi thành công',
        data=[JobListOut.model_validate(j).model_dump() for j in jobs],
        error=None,
        path=request.url.path,
    )


@router.get('/jobs/{job_id}')
def get_job(
    request: Request,
    job_id: str,
    db: Session = Depends(get_db)
):
    job = job_service.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Job không tìm thấy')
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Lấy job thành công',
        data=JobOut.model_validate(job).model_dump(),
        error=None,
        path=request.url.path
    )


@router.post('/jobs')
def create_job(
    request: Request,
    payload: JobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id
    ).first()
    if not organization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Bạn không có tổ chức')

    job = job_service.create_job(
        db=db,
        organization_id=organization.id,
        title=payload.title,
        description=payload.description,
        payment_type=JobPaymentType(payload.payment_type.value),
        budget_min=payload.budget_min,
        budget_max=payload.budget_max,
        category_id=payload.category_id,
        skill_ids=payload.skill_ids
    )
    return BaseResponse.create(
        status_code=status.HTTP_201_CREATED,
        message='Tạo job thành công',
        data=JobOut.model_validate(job).model_dump(),
        error=None,
        path=request.url.path
    )


@router.patch('/jobs/{job_id}')
def update_job(
    request: Request,
    job_id: str,
    payload: JobUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = job_service.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Job không tìm thấy')

    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id,
        Organization.id == job.organization_id
    ).first()
    if not organization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Bạn không có quyền sửa job này')

    kwargs = payload.model_dump(exclude_unset=True)
    if 'payment_type' in kwargs and kwargs['payment_type']:
        kwargs['payment_type'] = JobPaymentType(kwargs['payment_type'].value)
    if 'status' in kwargs and kwargs['status']:
        kwargs['status'] = JobStatus(kwargs['status'].value)

    updated_job = job_service.update_job(db, job_id, **kwargs)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Cập nhật job thành công',
        data=JobOut.model_validate(updated_job).model_dump(),
        error=None,
        path=request.url.path
    )


@router.delete('/jobs/{job_id}')
def delete_job(
    request: Request,
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = job_service.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Job không tìm thấy')

    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id,
        Organization.id == job.organization_id
    ).first()
    if not organization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Bạn không có quyền xóa job này')

    job_service.delete_job(db, job_id)
    return BaseResponse.create(
        status_code=status.HTTP_200_OK,
        message='Xóa job thành công',
        data=None,
        error=None,
        path=request.url.path
    )
