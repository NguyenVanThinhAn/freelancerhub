from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Enum, Text
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
import uuid
from app.database import Base


class NotificationType(str, enum.Enum):
    JOB_INVITE = 'JOB_INVITE'
    MESSAGE_RECEIVED = 'MESSAGE_RECEIVED'
    CV_VERIFIED = 'CV_VERIFIED'
    SYSTEM = 'SYSTEM'
    VERIFICATION_APPROVED = 'VERIFICATION_APPROVED'
    VERIFICATION_REJECTED = 'VERIFICATION_REJECTED'
    VERIFICATION_NEEDS_MORE_INFO = 'VERIFICATION_NEEDS_MORE_INFO'
    VERIFICATION_PARTIALLY_APPROVED = 'VERIFICATION_PARTIALLY_APPROVED'
    CONTACT_INFO_ALERT = 'CONTACT_INFO_ALERT'
    WARNING_SENT = 'WARNING_SENT'
    CHAT_LOCKED = 'CHAT_LOCKED'


class Notification(Base):
    __tablename__ = 'notifications'

    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey(
        'users.id', ondelete='CASCADE'), nullable=False)
    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    action_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(
        timezone.utc), nullable=False)

    user = relationship('User', back_populates='notifications')
