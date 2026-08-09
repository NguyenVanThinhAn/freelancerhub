from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class DisputeStatusEnum(str, Enum):
    OPEN = 'OPEN'
    UNDER_REVIEW = 'UNDER_REVIEW'
    RESOLVED_FREELANCER = 'RESOLVED_FREELANCER'
    RESOLVED_CLIENT = 'RESOLVED_CLIENT'
    MUTUAL_AGREEMENT = 'MUTUAL_AGREEMENT'


class DisputeCreate(BaseModel):
    contract_id: str
    milestone_id: Optional[str] = None
    reason: str
    severity: Optional[str] = "medium"


class DisputeEvidenceCreate(BaseModel):
    evidence_text: str
    file_urls: Optional[List[str]] = None


class DisputeResolution(BaseModel):
    resolution_type: str  # 'freelancer', 'client', 'split'
    freelancer_percentage: Optional[float] = 100
    notes: Optional[str] = None


class DisputeOut(BaseModel):
    id: str
    contract_id: str
    milestone_id: Optional[str]
    initiator_id: str
    reason: str
    status: DisputeStatusEnum
    resolution_notes: Optional[str]
    created_at: datetime

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
