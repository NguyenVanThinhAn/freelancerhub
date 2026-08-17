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
    CLOSED = 'CLOSED'


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
    milestone_id: Optional[str] = None
    opened_by: str
    reason_code: str
    description: str
    severity: str
    status: str  # accept any status string from DB
    assigned_to: Optional[str] = None
    assigned_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    resolution_json: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

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
