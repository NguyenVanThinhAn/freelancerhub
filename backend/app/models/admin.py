from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.orm import relationship
import enum
import uuid
from datetime import datetime, timezone
from app.database import Base

class ContentReportStatus(str, enum.Enum):
    PENDING = 'PENDING'
    REVIEWING = 'REVIEWING'
    RESOLVED = 'RESOLVED'
    DISMISSED = 'DISMISSED'

class Role(Base):
    __tablename__ = 'roles'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=True, nullable=False)

class Permission(Base):
    __tablename__ = 'permissions'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    resource = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)

class RolePermission(Base):
    __tablename__ = 'role_permissions'
    role_id = Column(String(36), ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
    permission_id = Column(String(36), ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)

class UserRole(Base):
    __tablename__ = 'user_roles'
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    role_id = Column(String(36), ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

class ContentReport(Base):
    __tablename__ = 'content_reports'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    reporter_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id = Column(String(36), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum(ContentReportStatus), default=ContentReportStatus.PENDING, nullable=False)
    resolved_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)


# NOTE: AuditLog đã được định nghĩa trong audit_log.py (schema mới với actor_id,
# prior_state, new_state). KHÔNG define lại ở đây — sẽ gây đụng độ metadata.

