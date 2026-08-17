from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base


class AIUsageQuota(Base):
    __tablename__ = 'ai_usage_quotas'

    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey(
        'users.id', ondelete='CASCADE'), nullable=False)
    feature = Column(String(100), nullable=False)
    limit_count = Column(Integer, nullable=False, default=0)
    used_count = Column(Integer, nullable=False, default=0)
    reset_date = Column(DateTime(timezone=True), nullable=True)

    user = relationship('User', back_populates='ai_usage_quotas')
