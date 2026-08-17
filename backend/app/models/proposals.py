from sqlalchemy import Column, String, Text, DateTime, Float, Enum, ForeignKey, Integer
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
import uuid
from app.database import Base

class ProposalStatus(str, enum.Enum):
    PENDING = 'PENDING'
    ACCEPTED = 'ACCEPTED'
    REJECTED = 'REJECTED'
    WITHDRAWN = 'WITHDRAWN'

class Proposal(Base):
    __tablename__ = 'proposals'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False)
    freelancer_id = Column(String(36), ForeignKey('freelancer_profiles.user_id', ondelete='CASCADE'), nullable=False)
    
    cover_letter = Column(Text, nullable=False)
    bid_amount = Column(Float, nullable=False)
    estimated_duration = Column(Integer, nullable=True) # in days
    
    status = Column(Enum(ProposalStatus), nullable=False, default=ProposalStatus.PENDING)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    job = relationship('Job', backref='proposals')
    freelancer = relationship('FrelancerProfile', backref='proposals')
