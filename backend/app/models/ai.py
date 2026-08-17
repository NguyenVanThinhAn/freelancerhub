from sqlalchemy import Column, String, Text, DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.database import Base

class MatchResult(Base):
    __tablename__ = 'match_results'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False)
    freelancer_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    fit_score = Column(Integer, nullable=False)
    pros_json = Column(Text, nullable=True)
    cons_json = Column(Text, nullable=True)
    questions_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class AIArtifact(Base):
    __tablename__ = 'ai_artifacts'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    artifact_type = Column(String(50), nullable=False)
    reference_id = Column(String(36), nullable=False)
    content = Column(Text, nullable=False)
    version = Column(String(20), default="1.0", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class AIQuotaPlan(Base):
    __tablename__ = 'ai_quota_plans'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    monthly_tokens_limit = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class AIUsageLog(Base):
    __tablename__ = 'ai_usage_logs'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    endpoint = Column(String(100), nullable=False)
    tokens_used = Column(Integer, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
