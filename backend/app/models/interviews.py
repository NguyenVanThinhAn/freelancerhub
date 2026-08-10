from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
import uuid
from app.database import Base

class InterviewStatus(str, enum.Enum):
    SCHEDULED = 'SCHEDULED'
    CONFIRMED = 'CONFIRMED'       # freelancer đã xác nhận tham dự
    DECLINED = 'DECLINED'         # freelancer từ chối
    COMPLETED = 'COMPLETED'       # business đánh dấu đã phỏng vấn xong
    CANCELED = 'CANCELED'         # business huỷ lịch

class Interview(Base):
    __tablename__ = 'interviews'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    proposal_id = Column(String(36), ForeignKey('proposals.id', ondelete='CASCADE'), nullable=False)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    
    interview_type = Column(String(50), nullable=False) # 'Video call', 'Phỏng vấn trực tiếp', etc.
    start_time = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=60)
    
    platform = Column(String(50), nullable=True) # 'Google Meet', 'Zoom', 'Offline'
    meet_link = Column(String(255), nullable=True)
    
    note = Column(Text, nullable=True) # Nội dung lời mời
    
    status = Column(Enum(InterviewStatus), default=InterviewStatus.SCHEDULED, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    proposal = relationship('Proposal', backref='interviews')
    organization = relationship('Organization', backref='interviews')
