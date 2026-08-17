from sqlalchemy import Column, String, Text, DateTime, Float, Enum, ForeignKey
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
import uuid
from app.database import Base

class JobPaymentType(str, enum.Enum):
    FIXED = 'FIXED'
    HOURLY = 'HOURLY'

class JobStatus(str, enum.Enum):
    OPEN = 'OPEN'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'

class JobSkill(Base):
    __tablename__ = 'job_skills'
    
    job_id = Column(String(36), ForeignKey('jobs.id', ondelete='CASCADE'), primary_key=True)
    skill_id = Column(String(36), ForeignKey('skills.id', ondelete='CASCADE'), primary_key=True)

class Job(Base):
    __tablename__ = 'jobs'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    category_id = Column(String(36), ForeignKey('categories.id', ondelete='SET NULL'), nullable=True)
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    
    budget_min = Column(Float, nullable=True)
    budget_max = Column(Float, nullable=True)
    payment_type = Column(Enum(JobPaymentType), nullable=False, default=JobPaymentType.FIXED)
    
    status = Column(Enum(JobStatus), nullable=False, default=JobStatus.OPEN)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    organization = relationship('Organization', backref='jobs')
    category = relationship('Category', backref='jobs')
    skills = relationship('Skill', secondary='job_skills', backref='jobs')
