from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime, timezone
from app.models.jobs import Job, JobSkill, JobStatus, JobPaymentType
from app.models.categories import Category
from app.models.skills import Skill
from app.core.logger import logger


def create_job(
    db: Session,
    organization_id: str,
    title: str,
    description: str,
    payment_type: JobPaymentType = JobPaymentType.FIXED,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    category_id: Optional[str] = None,
    skill_ids: Optional[List[str]] = None
) -> Job:
    try:
        if budget_min is not None and budget_max is not None and budget_min > budget_max:
            raise ValueError("budget_min cannot be greater than budget_max")
        job = Job(
            organization_id=organization_id,
            title=title,
            description=description,
            payment_type=payment_type,
            budget_min=budget_min,
            budget_max=budget_max,
            category_id=category_id,
            status=JobStatus.OPEN,
            updated_at=datetime.now(timezone.utc)
        )
        db.add(job)
        db.flush()

        if skill_ids:
            for skill_id in skill_ids:
                job_skill = JobSkill(job_id=job.id, skill_id=skill_id)
                db.add(job_skill)

        db.commit()
        db.refresh(job)
        return job
    except Exception as e:
        db.rollback()
        logger.exception(f"Error creating job: {e}")
        raise


def get_job_by_id(db: Session, job_id: str) -> Optional[Job]:
    return db.query(Job).filter(Job.id == job_id).first()


def get_jobs(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    skill_ids: Optional[List[str]] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    payment_type: Optional[JobPaymentType] = None,
    status: JobStatus = JobStatus.OPEN
) -> List[Job]:
    query = db.query(Job)

    if search:
        query = query.filter(
            or_(
                Job.title.ilike(f"%{search}%"),
                Job.description.ilike(f"%{search}%")
            )
        )

    if category_id:
        query = query.filter(Job.category_id == category_id)

    if budget_min is not None:
        query = query.filter(Job.budget_max >= budget_min)

    if budget_max is not None:
        query = query.filter(Job.budget_min <= budget_max)

    if payment_type:
        query = query.filter(Job.payment_type == payment_type)

    if status:
        query = query.filter(Job.status == status)

    if skill_ids:
        query = query.join(JobSkill).filter(JobSkill.skill_id.in_(skill_ids))

    return query.offset(skip).limit(limit).all()


def update_job(
    db: Session,
    job_id: str,
    **kwargs
) -> Optional[Job]:
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return None

        # Validate budget
        new_min = kwargs.get('budget_min', job.budget_min)
        new_max = kwargs.get('budget_max', job.budget_max)
        if new_min is not None and new_max is not None and new_min > new_max:
            raise ValueError("budget_min cannot be greater than budget_max")

        allowed_fields = ['title', 'description', 'category_id', 'budget_min',
                         'budget_max', 'payment_type', 'status']
        for field in allowed_fields:
            if field in kwargs and kwargs[field] is not None:
                setattr(job, field, kwargs[field])

        if 'skill_ids' in kwargs and kwargs['skill_ids'] is not None:
            db.query(JobSkill).filter(JobSkill.job_id == job_id).delete()
            for skill_id in kwargs['skill_ids']:
                job_skill = JobSkill(job_id=job_id, skill_id=skill_id)
                db.add(job_skill)

        db.commit()
        db.refresh(job)
        return job
    except Exception as e:
        db.rollback()
        logger.exception(f"Error updating job: {e}")
        raise


def delete_job(db: Session, job_id: str) -> bool:
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return False
        job.status = JobStatus.CANCELLED
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        logger.exception(f"Error deleting job: {e}")
        raise
