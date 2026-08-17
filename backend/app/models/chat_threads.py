from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base


class ChatThread(Base):
    __tablename__ = 'chat_threads'

    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), nullable=True)
    is_locked = Column(Boolean, default=False, nullable=False)
    lock_reason = Column(Text, nullable=True)
    locked_by = Column(String(36), nullable=True)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(
        timezone.utc), nullable=False)

    participants = relationship(
        'ThreadParticipant', back_populates='thread', cascade='all, delete-orphan')
    messages = relationship(
        'ChatMessage', back_populates='thread', cascade='all, delete-orphan')
