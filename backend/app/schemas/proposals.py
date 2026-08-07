from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class ProposalStatusEnum(str, Enum):
    PENDING = 'PENDING'
    ACCEPTED = 'ACCEPTED'
    REJECTED = 'REJECTED'
    WITHDRAWN = 'WITHDRAWN'


class FreelancerRef(BaseModel):
    user_id: str
    display_name: str
    headline: Optional[str] = None
    hourly_rate: Optional[float] = None

    class Config:
        from_attributes = True


class ProposalBase(BaseModel):
    cover_letter: str
    bid_amount: float
    estimated_duration: Optional[int] = None


class ProposalCreate(ProposalBase):
    pass


class ProposalDecision(BaseModel):
    decision: str  # 'accept' or 'reject'


class ProposalOut(BaseModel):
    id: str
    job_id: str
    freelancer_id: str
    cover_letter: str
    bid_amount: float
    estimated_duration: Optional[int]
    status: ProposalStatusEnum
    created_at: datetime
    freelancer: Optional[FreelancerRef] = None

    class Config:
        from_attributes = True


class ProposalListOut(BaseModel):
    id: str
    job_id: str
    freelancer_id: str
    bid_amount: float
    estimated_duration: Optional[int]
    status: ProposalStatusEnum
    created_at: datetime

    class Config:
        from_attributes = True
