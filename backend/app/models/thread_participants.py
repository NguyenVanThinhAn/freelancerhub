from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ThreadParticipant(Base):
    __tablename__ = 'thread_participants'

    thread_id = Column(String(36), ForeignKey(
        'chat_threads.id', ondelete='CASCADE'), primary_key=True)
    user_id = Column(String(36), ForeignKey(
        'users.id', ondelete='CASCADE'), primary_key=True)

    thread = relationship('ChatThread', back_populates='participants')
