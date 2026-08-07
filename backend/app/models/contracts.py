from sqlalchemy import Column, String, Text, DateTime, Float, Enum, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
import uuid
from app.database import Base

class ContractStatus(str, enum.Enum):
    draft = 'draft'
    pending_signatures = 'pending_signatures'
    active = 'active'
    completed = 'completed'
    terminated = 'terminated'
    disputed = 'disputed'
    cancelled = 'cancelled'

class MilestoneStatus(str, enum.Enum):
    draft = 'draft'
    funded = 'funded'
    in_progress = 'in_progress'
    submitted = 'submitted'
    approved = 'approved'
    revision_requested = 'revision_requested'
    paid = 'paid'
    cancelled = 'cancelled'

class DeliverableStatus(str, enum.Enum):
    submitted = 'submitted'
    approved = 'approved'
    revision_requested = 'revision_requested'

class Contract(Base):
    __tablename__ = 'contracts'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey('jobs.id', ondelete='RESTRICT'), nullable=False)
    freelancer_id = Column(String(36), ForeignKey('freelancer_profiles.user_id', ondelete='RESTRICT'), nullable=False)
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='RESTRICT'), nullable=False)
    proposal_id = Column(String(36), ForeignKey('proposals.id', ondelete='SET NULL'), nullable=True)
    
    total_amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default='VND')
    status = Column(Enum(ContractStatus), nullable=False, default=ContractStatus.draft)
    terms_snapshot = Column(JSON, nullable=False, default={})
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    job = relationship('Job', backref='contracts')
    freelancer = relationship('FrelancerProfile', backref='contracts')
    organization = relationship('Organization', backref='contracts')
    proposal = relationship('Proposal', backref='contract')

class Milestone(Base):
    __tablename__ = 'milestones'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String(36), ForeignKey('contracts.id', ondelete='CASCADE'), nullable=False)
    sequence_no = Column(Integer, nullable=False)
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Float, nullable=False)
    
    status = Column(Enum(MilestoneStatus), nullable=False, default=MilestoneStatus.draft)
    
    due_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    contract = relationship('Contract', backref='milestones')

class Deliverable(Base):
    __tablename__ = 'deliverables'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    milestone_id = Column(String(36), ForeignKey('milestones.id', ondelete='CASCADE'), nullable=False)
    submitted_by = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    version_no = Column(Integer, nullable=False, default=1)
    
    message = Column(Text, nullable=True)
    file_storage_keys = Column(JSON, nullable=False, default=[])
    
    status = Column(Enum(DeliverableStatus), nullable=False, default=DeliverableStatus.submitted)
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    reviewed_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    milestone = relationship('Milestone', backref='deliverables')
    submitter = relationship('User', foreign_keys=[submitted_by])
    reviewer = relationship('User', foreign_keys=[reviewed_by])
