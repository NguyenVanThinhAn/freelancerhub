from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base


class EmailVerificationToken(Base):
    __tablename__ = 'email_verification_tokens'

    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey(
        'users.id', ondelete='CASCADE'), nullable=False)
    token_hash = Column(String(128), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(
        timezone.utc), nullable=False)

    user = relationship('User', back_populates='email_verification_tokens')
