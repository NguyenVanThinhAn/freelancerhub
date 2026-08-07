from sqlalchemy import Column, String, Enum, text, ForeignKey
from sqlalchemy.orm import relationship
import enum
import uuid
from app.database import Base


class VerificationStatus(str, enum.Enum):
    """
    Enum định nghĩa các trạng thái xác minh doanh nghiệp:
    - unverified: Mới tạo, chưa nộp hồ sơ/giấy phép kinh doanh
    - pending: Đã gửi hồ sơ xác minh, đang chờ Admin/Moderator duyệt
    - verified: Đã được Admin phê duyệt chính chủ thành công
    - rejected: Bị từ chối do hồ sơ giả mạo, thiếu thông tin hoặc sai sót
    - expired: Giấy phép kinh doanh hoặc trạng thái xác minh đã hết hạn
    """
    unverified = 'unverified'
    pending = 'pending'
    verified = 'verified'
    rejected = 'rejected'
    expired = 'expired'


class Organization(Base):
    __tablename__ = 'organizations'

    # ID định danh tổ chức/doanh nghiệp: Chuỗi UUID 36 ký tự. Tự động sinh UUID bằng Python (default=lambda: str(uuid.uuid4())) để tương thích mọi loại Database.
    id = Column(String(36), primary_key=True,
                default=lambda: str(uuid.uuid4()))

    # Tên chính thức của doanh nghiệp/tổ chức
    name = Column(String(200), nullable=False)

    # Chuỗi định danh thân thiện với URL (URL-friendly string) sinh từ tên công ty (VD: 'fpt-software-jsc'). Dùng cho đường dẫn trang công ty công khai
    slug = Column(String(220), unique=True, nullable=False)

    # Mã số thuế của doanh nghiệp (Thu thập để xác minh và xuất hóa đơn)
    tax_code = Column(String(30), unique=True, nullable=True)

    # Địa chỉ Website chính thức của doanh nghiệp
    website = Column(String(255), nullable=True)

    # Đoạn mô tả chi tiết, giới thiệu quy mô, lĩnh vực hoạt động của doanh nghiệp
    description = Column(String(1000), nullable=True)
    industry = Column(String(100), nullable=True)

    # Trạng thái xác minh doanh nghiệp (Dùng Enum VerificationStatus để quản lý chặt chẽ)
    verification_status = Column(
        Enum(VerificationStatus), default=VerificationStatus.unverified, nullable=False)
    logo_path = Column(String(255), nullable=True)

    # Khóa ngoại liên kết tới người dùng (User) đóng vai trò làm Chủ sở hữu (Owner) của Tổ chức này. 1 User có thể sở hữu 1 hoặc nhiều Organization.
    owner_user_id = Column(String(36), ForeignKey('users.id'), nullable=False)

    # Quan hệ tham chiếu ngược tới Model User
    user = relationship('User', back_populates='organizations')
