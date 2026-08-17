from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
import uuid
from app.database import Base

class TaskStatus(str, enum.Enum):
    TODO = 'Chưa bắt đầu'
    IN_PROGRESS = 'Đang thực hiện'
    DONE = 'Đã hoàn thành'

class Task(Base):
    __tablename__ = 'tasks'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String(36), ForeignKey('contracts.id', ondelete='CASCADE'), nullable=False)
    milestone_id = Column(String(36), ForeignKey('milestones.id', ondelete='SET NULL'), nullable=True)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    due_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO, nullable=False)
    
    assigned_to = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    contract = relationship('Contract', backref='tasks')
    milestone = relationship('Milestone', backref='tasks')
    assignee = relationship('User', backref='tasks')
