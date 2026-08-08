from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class DisputeStatusEnum(str, Enum):
    OPEN = 'OPEN'
    UNDER_REVIEW = 'UNDER_REVIEW'
    RESOLVED_FREELANCER = 'RESOLVED_FREELANCER'
    RESOLVED_CLIENT = 'RESOLVED_CLIENT'
    MUTUAL_AGREEMENT = 'MUTUAL_AGREEMENT'
    CLOSED = 'CLOSED'


class DisputeReasonCodeEnum(str, Enum):
    delivery = 'delivery'
    quality = 'quality'
    payment = 'payment'
    conduct = 'conduct'
    other = 'other'


class DisputeSeverityEnum(str, Enum):
    low = 'low'
    medium = 'medium'
    high = 'high'
    critical = 'critical'


class DisputeResolutionTypeEnum(str, Enum):
    FREELANCER = 'freelancer'
    CLIENT = 'client'
    SPLIT = 'split'


class DisputeCreate(BaseModel):
    contract_id: str
    milestone_id: Optional[str] = None
    reason_code: DisputeReasonCodeEnum = DisputeReasonCodeEnum.other
    description: str = Field(..., min_length=10, max_length=2000,
                             description="Mô tả chi tiết vấn đề (tối thiểu 10 ký tự)")
    severity: DisputeSeverityEnum = DisputeSeverityEnum.medium


class DisputeEvidenceCreate(BaseModel):
    evidence_text: str = Field(..., min_length=1, max_length=5000)
    file_urls: Optional[List[str]] = None


class DisputeResolution(BaseModel):
    """
    Admin phán quyết dispute.
    - freelancer: 100% → freelancer (milestone = PAID)
    - client: 100% refund → org (milestone = CANCELLED)
    - split: freelancer_percentage% → freelancer, còn lại refund
    """
    resolution_type: DisputeResolutionTypeEnum
    freelancer_percentage: Optional[float] = Field(100.0, ge=0.0, le=100.0)
    notes: Optional[str] = Field(None, max_length=2000)


class DisputeOut(BaseModel):
    id: str
    contract_id: str
    milestone_id: Optional[str]
    opened_by: str  # FIX: schema cũ là initiator_id, model là opened_by
    reason_code: str
    description: str
    severity: str
    status: DisputeStatusEnum
    resolution_notes: Optional[str]
    resolution_json: Optional[dict] = None
    assigned_to: Optional[str] = None
    assigned_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DisputeEvidenceOut(BaseModel):
    id: str
    dispute_id: str
    submitter_id: str
    evidence_text: str
    file_urls: Optional[List[str]]
    submitted_at: datetime

    class Config:
        from_attributes = True
