from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class JobPaymentTypeEnum(str, Enum):
    FIXED = 'FIXED'
    HOURLY = 'HOURLY'


class JobStatusEnum(str, Enum):
    OPEN = 'OPEN'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'


class SkillRef(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


class OrganizationRef(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


class JobBase(BaseModel):
    title: str
    description: str
    category_id: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    payment_type: JobPaymentTypeEnum = JobPaymentTypeEnum.FIXED


class JobCreate(JobBase):
    skill_ids: Optional[List[str]] = []


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    payment_type: Optional[JobPaymentTypeEnum] = None
    status: Optional[JobStatusEnum] = None
    skill_ids: Optional[List[str]] = None


class JobOut(BaseModel):
    id: str
    organization_id: str
    category_id: Optional[str]
    title: str
    description: str
    budget_min: Optional[float]
    budget_max: Optional[float]
    payment_type: JobPaymentTypeEnum
    status: JobStatusEnum
    created_at: datetime
    skills: List[SkillRef] = []
    organization: Optional[OrganizationRef] = None

    class Config:
        from_attributes = True


class JobListOut(BaseModel):
    id: str
    organization_id: str
    category_id: Optional[str]
    title: str
    description: str
    budget_min: Optional[float]
    budget_max: Optional[float]
    payment_type: JobPaymentTypeEnum
    status: JobStatusEnum
    created_at: datetime
    skills: List[SkillRef] = []

    class Config:
        from_attributes = True


class JobSearchQuery(BaseModel):
    search: Optional[str] = None
    category_id: Optional[str] = None
    skill_ids: Optional[List[str]] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    payment_type: Optional[JobPaymentTypeEnum] = None
    status: Optional[JobStatusEnum] = JobStatusEnum.OPEN
    page: int = 1
    page_size: int = 20


class JobGenerateJDRequest(BaseModel):
    title: str
    description: str
    category_id: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    payment_type: Optional[JobPaymentTypeEnum] = None
    skill_ids: Optional[List[str]] = []
