import uuid
import enum
import re
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, Index
from sqlalchemy.orm import relationship
from app.database import Base


class ExchangeStatus(str, enum.Enum):
    PENDING = 'PENDING'           # Chờ admin review
    APPROVED = 'APPROVED'        # Bypass hợp lệ
    FLAGGED = 'FLAGGED'          # Vi phạm


class ContactPattern(str, enum.Enum):
    EMAIL = 'EMAIL'
    PHONE_VN = 'PHONE_VN'       # Vietnamese phone: 0xxxxxxxxx, +84xxxxxxxx
    PHONE_INTL = 'PHONE_INTL'    # International format
    SOCIAL_LINK = 'SOCIAL_LINK'  # Facebook, Zalo, Telegram links
    UNKNOWN = 'UNKNOWN'


class ContactInfoExchange(Base):
    """
    Ghi nhận mọi trao đổi thông tin liên lạc (email/phone/social)
    được phát hiện trong nội dung chat.

    Dùng cho:
    - Monitor: admin phát hiện user gửi SĐT/email ngoài platform
    - Bypass: admin duyệt cho phép chia sẻ hợp lệ (VD: sau khi ký HĐ)
    """
    __tablename__ = 'contact_info_exchanges'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Luồng chat nơi phát hiện
    thread_id = Column(String(36), ForeignKey(
        'chat_threads.id', ondelete='CASCADE'), nullable=False)

    # Người gửi thông tin
    sender_id = Column(String(36), ForeignKey(
        'users.id', ondelete='CASCADE'), nullable=False)

    # Mẫu phát hiện được
    pattern_type = Column(
        Enum(ContactPattern), nullable=False, default=ContactPattern.UNKNOWN)
    raw_content = Column(Text, nullable=False)  # Text gốc phát hiện được

    # Trạng thái xử lý
    status = Column(
        Enum(ExchangeStatus), nullable=False, default=ExchangeStatus.PENDING)

    # Admin review
    reviewed_by = Column(String(36), ForeignKey(
        'users.id', ondelete='SET NULL'), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    bypass_reason = Column(Text, nullable=True)  # Lý do duyệt bypass

    # Context
    message_id = Column(String(36), ForeignKey(
        'chat_messages.id', ondelete='CASCADE'), nullable=True)

    created_at = Column(DateTime(timezone=True),
                        default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    thread = relationship('ChatThread', backref='contact_exchanges')
    sender = relationship('User', foreign_keys=[sender_id])
    reviewer = relationship('User', foreign_keys=[reviewed_by])

    __table_args__ = (
        Index("idx_contact_status", "status", "created_at"),
        Index("idx_contact_thread", "thread_id"),
    )
