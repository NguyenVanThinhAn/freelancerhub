from sqlalchemy import Column, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base


class Shortlist(Base):
    __tablename__ = 'shortlists'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id = Column(String(36), ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False)
    freelancer_id = Column(String(36), ForeignKey('freelancer_profiles.user_id', ondelete='CASCADE'), nullable=False)
    job_id = Column(String(36), ForeignKey('jobs.id', ondelete='CASCADE'), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)