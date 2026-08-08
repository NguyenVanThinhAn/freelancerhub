from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.tasks import TaskStatus

class TaskCreate(BaseModel):
    contract_id: str
    milestone_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: TaskStatus = TaskStatus.TODO
    assigned_to: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[TaskStatus] = None
    assigned_to: Optional[str] = None
    milestone_id: Optional[str] = None

class TaskOut(BaseModel):
    id: str
    contract_id: str
    milestone_id: Optional[str]
    title: str
    description: Optional[str]
    due_date: Optional[datetime]
    status: TaskStatus
    assigned_to: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
