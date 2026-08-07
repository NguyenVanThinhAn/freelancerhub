from sqlalchemy import Column, String, Integer, DateTime, Enum, text
from sqlalchemy.orm import relationship
import enum
import uuid
from datetime import datetime, timezone as dt_timezone
from app.database import Base


class UserStatus(str, enum.Enum):
    """
    Enum định nghĩa các trạng thái nghiệp vụ của tài khoản người dùng:
    - pending_verification: Mới đăng ký, chờ xác thực email
    - active: Tài khoản đang hoạt động bình thường
    - suspended: Bị Admin đình chỉ tạm thời do vi phạm
    - locked: Bị khóa tạm thời tự động do đăng nhập sai nhiều lần
    - deleted: Đã bị xóa mềm (soft delete)
    """
    pending_verification = 'pending_verification'
    active = 'active'
    suspended = 'suspended'
    locked = 'locked'
    deleted = 'deleted'


class UserRole(str, enum.Enum):
    freelancer = 'freelancer'
    enterprise = 'enterprise'
    admin = 'admin'


class User(Base):
    __tablename__ = 'users'

    # ID định danh người dùng: Chuỗi UUID 36 ký tự. Tự động sinh UUID bằng Python (default=lambda: str(uuid.uuid4())) để đảm bảo tương thích mọi loại Database.
    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()))

    # Email đăng nhập: Bắt buộc, duy nhất, chuẩn hóa chữ thường (lowercase)
    email = Column(String(255), unique=True, nullable=False)

    # Chuỗi mật khẩu đã được mã hóa một chiều (Argon2id/bcrypt). nullable=True để hỗ trợ tài khoản Đăng nhập bằng Google/LinkedIn (OAuth)
    password_hash = Column(String(255), nullable=True)

    # Trạng thái tài khoản người dùng (mặc định là pending_verification khi vừa đăng ký xong)
    status = Column(Enum(UserStatus),
                    default=UserStatus.pending_verification, nullable=False)

    # Thời điểm xác thực Email thành công (null nếu chưa verify)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Số điện thoại theo chuẩn quốc tế E.164 (VD: +84912345678). Duyệt định dạng quốc tế để gửi SMS OTP chuẩn xác
    phone_e164 = Column(String(20), unique=True, nullable=True)

    # Thời điểm xác thực Số điện thoại thành công
    phone_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Mốc thời gian lần đăng nhập gần nhất của người dùng
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Số lần nhập sai mật khẩu liên tiếp. Dùng để tính toán cơ chế tự động khóa tài khoản tạm thời
    failed_login_count = Column(Integer, default=0, nullable=False)

    # Mốc thời gian bị khóa tạm thời. Nếu hiện tại < locked_until thì tài khoản bị chặn đăng nhập ngay cả khi gõ đúng mật khẩu
    locked_until = Column(DateTime(timezone=True), nullable=True)

    # Ngôn ngữ hiển thị giao diện ưa thích (Mặc định vi-VN)
    locale = Column(String(10), default='vi-VN', nullable=False)

    # Múi giờ hiển thị của người dùng (Mặc định Asia/Ho_Chi_Minh). Đặt tên thuộc tính cột trùng tên nhưng đã đổi tên import bên trên thành dt_timezone để tránh đè biến (shadowing).
    timezone = Column(String(50), default='Asia/Ho_Chi_Minh', nullable=False)
    role = Column(Enum(UserRole), default=UserRole.freelancer, nullable=False)
    avatar_path = Column(String(255), nullable=True)

    # Mốc thời gian tạo bản ghi (Tự động ghi nhận thời gian UTC từ DB)
    created_at = Column(DateTime(timezone=True),
                        server_default=text('CURRENT_TIMESTAMP'), nullable=False)

    # Mốc thời gian cập nhật bản ghi lần cuối (Tự động cập nhật khi sửa dữ liệu)
    updated_at = Column(DateTime(timezone=True), server_default=text(
        'CURRENT_TIMESTAMP'), onupdate=lambda: datetime.now(dt_timezone.utc), nullable=False)

    # Đánh dấu xóa mềm (soft delete). Nếu != null nghĩa là tài khoản đã bị xóa/ẩn, không mất dữ liệu lịch sử
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Quan hệ 1-1 với hồ sơ Freelancer
    freelancer_profile = relationship(
        'FrelancerProfile', uselist=False, back_populates='user')

    # Quan hệ 1-N với các Tổ chức/Doanh nghiệp mà user làm owner
    organizations = relationship('Organization', back_populates='user')

    # Quan hệ với refresh token được lưu trong DB
    refresh_tokens = relationship(
        'RefreshToken', back_populates='user', cascade='all, delete-orphan')

    # Quan hệ với token đặt lại mật khẩu
    password_reset_tokens = relationship(
        'PasswordResetToken', back_populates='user', cascade='all, delete-orphan')

    # Quan hệ với token xác thực email
    email_verification_tokens = relationship(
        'EmailVerificationToken', back_populates='user', cascade='all, delete-orphan')

    # Quan hệ với thông báo người dùng
    notifications = relationship(
        'Notification', back_populates='user', cascade='all, delete-orphan')

    # Quan hệ với hạn mức AI của người dùng
    ai_usage_quotas = relationship(
        'AIUsageQuota', back_populates='user', cascade='all, delete-orphan')
