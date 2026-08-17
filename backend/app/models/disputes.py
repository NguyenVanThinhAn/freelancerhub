from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
import uuid
from app.database import Base

class DisputeStatus(str, enum.Enum):
    OPEN = 'OPEN'
    UNDER_REVIEW = 'UNDER_REVIEW'
    RESOLVED_FREELANCER = 'RESOLVED_FREELANCER'
    RESOLVED_CLIENT = 'RESOLVED_CLIENT'
    MUTUAL_AGREEMENT = 'MUTUAL_AGREEMENT'
    CLOSED = 'CLOSED'


class DisputeReasonCode(str, enum.Enum):
    delivery = 'delivery'
    quality = 'quality'
    payment = 'payment'
    conduct = 'conduct'
    other = 'other'


class DisputeSeverity(str, enum.Enum):
    low = 'low'
    medium = 'medium'
    high = 'high'
    critical = 'critical'


class DisputeResolutionType(str, enum.Enum):
    """
    Kết quả cuối cùng khi Admin giải quyết tranh chấp.
    """
    FREELANCER = 'freelancer'   # Toàn bộ milestone.amount → freelancer
    CLIENT = 'client'           # Toàn bộ milestone.amount → client (refund)
    SPLIT = 'split'             # Chia theo freelancer_percentage


class Dispute(Base):
    __tablename__ = 'disputes'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String(36), ForeignKey('contracts.id', ondelete='CASCADE'), nullable=False)
    milestone_id = Column(String(36), ForeignKey('milestones.id', ondelete='CASCADE'), nullable=True)
    opened_by = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    reason_code = Column(Enum(DisputeReasonCode), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Enum(DisputeSeverity), nullable=False)

    status = Column(Enum(DisputeStatus), nullable=False, default=DisputeStatus.OPEN)
    resolution_notes = Column(Text, nullable=True)
    resolution_json = Column(JSON, nullable=True)  # {resolution_type, freelancer_pct, ...}

    # Admin moderator assigned
    assigned_to = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    contract = relationship('Contract', backref='disputes')
    milestone = relationship('Milestone', backref='disputes')
    initiator = relationship('User', foreign_keys=[opened_by])
    moderator = relationship('User', foreign_keys=[assigned_to])

class DisputeEvidence(Base):
    __tablename__ = 'dispute_evidence'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dispute_id = Column(String(36), ForeignKey('disputes.id', ondelete='CASCADE'), nullable=False)
    submitter_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    evidence_text = Column(Text, nullable=False)
    file_urls = Column(JSON, nullable=True)
    
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    dispute = relationship('Dispute', backref='evidence')
    submitter = relationship('User')
