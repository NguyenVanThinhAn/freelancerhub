from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ContractStatusEnum(str, Enum):
    draft = 'draft'
    pending_signatures = 'pending_signatures'
    active = 'active'
    completed = 'completed'
    terminated = 'terminated'
    disputed = 'disputed'
    cancelled = 'cancelled'

class MilestoneStatusEnum(str, Enum):
    draft = 'draft'
    funded = 'funded'
    in_progress = 'in_progress'
    submitted = 'submitted'
    approved = 'approved'
    revision_requested = 'revision_requested'
    paid = 'paid'
    cancelled = 'cancelled'

class DeliverableStatusEnum(str, Enum):
    submitted = 'submitted'
    approved = 'approved'
    revision_requested = 'revision_requested'

class MilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    due_at: Optional[datetime] = None

class MilestoneCreate(MilestoneBase):
    sequence_no: int

class MilestoneOut(BaseModel):
    id: str
    contract_id: str
    sequence_no: int
    title: str
    description: Optional[str]
    amount: float
    status: MilestoneStatusEnum
    due_at: Optional[datetime]
    approved_at: Optional[datetime]
    paid_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class WorkSubmissionCreate(BaseModel):
    message: Optional[str] = None
    file_storage_keys: Optional[List[str]] = []

class WorkSubmissionOut(BaseModel):
    id: str
    milestone_id: str
    submitted_by: str
    message: Optional[str]
    file_storage_keys: Optional[List[str]]
    status: DeliverableStatusEnum
    submitted_at: datetime

    class Config:
        from_attributes = True

class MilestoneReviewDecision(BaseModel):
    feedback: Optional[str] = None

class ContractOut(BaseModel):
    id: str
    job_id: str
    freelancer_id: str
    organization_id: str
    proposal_id: Optional[str]
    total_amount: float
    status: ContractStatusEnum
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
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
    started_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
