from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ShortlistCreate(BaseModel):
    freelancer_id: str
    job_id: Optional[str] = None
    notes: Optional[str] = None


class ShortlistOut(BaseModel):
    id: str
    organization_id: str
    freelancer_id: str
    job_id: Optional[str]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True