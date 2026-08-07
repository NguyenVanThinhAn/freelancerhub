from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ContractStatusEnum(str, Enum):
    ACTIVE = 'ACTIVE'
    COMPLETED = 'COMPLETED'
    DISPUTED = 'DISPUTED'
    CANCELLED = 'CANCELLED'


class MilestoneStatusEnum(str, Enum):
    PENDING = 'PENDING'
    IN_PROGRESS = 'IN_PROGRESS'
    SUBMITTED = 'SUBMITTED'
    APPROVED = 'APPROVED'
    PAID = 'PAID'


class DeliverableStatusEnum(str, Enum):
    PENDING_REVIEW = 'PENDING_REVIEW'
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'


class MilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    due_date: Optional[datetime] = None


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneOut(BaseModel):
    id: str
    contract_id: str
    title: str
    description: Optional[str]
    amount: float
    status: MilestoneStatusEnum
    due_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class WorkSubmissionCreate(BaseModel):
    content: str
    file_urls: Optional[List[str]] = None


class WorkSubmissionOut(BaseModel):
    id: str
    milestone_id: str
    freelancer_id: str
    content: str
    file_urls: Optional[List[str]]
    status: DeliverableStatusEnum
    submitted_at: datetime

    class Config:
        from_attributes = True


class MilestoneReviewDecision(BaseModel):
    decision: str  # 'approve' or 'reject'
    feedback: Optional[str] = None


class ContractOut(BaseModel):
    id: str
    job_id: str
    freelancer_id: str
    organization_id: str
    proposal_id: Optional[str]
    total_amount: float
    status: ContractStatusEnum
    start_date: datetime
    end_date: Optional[datetime]
    created_at: datetime
    milestones: List[MilestoneOut] = []

    class Config:
        from_attributes = True


class ContractListOut(BaseModel):
    id: str
    job_id: str
    freelancer_id: str
    organization_id: str
    total_amount: float
    status: ContractStatusEnum
    start_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True
