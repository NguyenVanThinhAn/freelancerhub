import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Enum as SAEnum, JSON, Text, Index
)
from sqlalchemy.orm import relationship
from app.database import Base


class AuditActionEnum(str, enum.Enum):
    """Các action có thể được audit. Đặt tại module riêng để tránh circular import."""

    # Verification decision actions (mirror VerificationDecisionActionEnum values)
    ADMIN_VERIFY = "VERIFY"
    ADMIN_PARTIALLY_VERIFY = "PARTIALLY_VERIFY"
    ADMIN_REQUEST_MORE_INFO = "REQUEST_MORE_INFO"
    ADMIN_REJECT = "REJECT"

    # User management actions
    USER_LOCKED = "USER_LOCKED"
    USER_UNLOCKED = "USER_UNLOCKED"

    # Dispute actions
    DISPUTE_OPENED = "DISPUTE_OPENED"
    DISPUTE_ASSIGNED = "DISPUTE_ASSIGNED"
    DISPUTE_TRANSITIONED = "DISPUTE_TRANSITIONED"
    DISPUTE_RESOLVED = "DISPUTE_RESOLVED"
    DISPUTE_CLOSED = "DISPUTE_CLOSED"


class AuditLog(Base):
    """
    Audit log ghi vết mọi thao tác nhạy cảm của Admin.
    Theo MASTER-DOC §M.6 + §I: mỗi admin action record (admin_id, prior_state, new_state, timestamp, ...).
    Immutable: chỉ INSERT, không UPDATE/DELETE trong code path.
    """
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # What entity is being acted on
    entity_type = Column(String(50), nullable=False)   # e.g. "verification_case", "user"
    entity_id = Column(String(36), nullable=False)

    # Who did it
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    actor_role = Column(String(20), nullable=False)   # "admin", "system", ...

    # What was done
    action = Column(String(50), nullable=False)       # e.g. "VERIFY", "REJECT"

    # State snapshots (JSON)
    prior_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=False)

    # Reason / context
    reason_code = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    idempotency_key = Column(String(100), nullable=True)

    # Request context (privacy: IP limited to 64 chars, UA truncated)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    actor = relationship("User", foreign_keys=[actor_id])

    __table_args__ = (
        Index("idx_audit_entity", "entity_type", "entity_id", "created_at"),
        Index("idx_audit_actor", "actor_id", "created_at"),
        Index("idx_audit_idempotency", "idempotency_key"),
    )
