from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from app.database import Base


class ChatMessage(Base):
    __tablename__ = 'chat_messages'

    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()))
    thread_id = Column(String(36), ForeignKey(
        'chat_threads.id', ondelete='CASCADE'), nullable=False)
    sender_id = Column(String(36), ForeignKey(
        'users.id', ondelete='CASCADE'), nullable=False)
    content_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(
        timezone.utc), nullable=False)

    thread = relationship('ChatThread', back_populates='messages')
