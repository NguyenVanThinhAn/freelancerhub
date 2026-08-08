from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.interviews import InterviewStatus

class InterviewCreate(BaseModel):
    proposal_id: str
    interview_type: str
    start_time: datetime
    duration_minutes: int = 60
    platform: Optional[str] = None
    meet_link: Optional[str] = None
    note: Optional[str] = None

class InterviewOut(BaseModel):
    id: str
    proposal_id: str
    organization_id: str
    interview_type: str
    start_time: datetime
    duration_minutes: int
    platform: Optional[str]
    meet_link: Optional[str]
    note: Optional[str]
    status: InterviewStatus
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
