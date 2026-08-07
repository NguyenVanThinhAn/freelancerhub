from sqlalchemy import Column, String, DECIMAL, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class FrelancerProfile(Base):
    __tablename__ = 'freelancer_profiles'

    # Khóa ngoại liên kết trực tiếp tới bảng users.id. Đồng thời đóng vai trò làm Khóa chính (Primary Key) để đảm bảo quan hệ 1:1 tuyệt đối giữa User và Freelancer Profile.
    user_id = Column(String(36), ForeignKey(
        'users.id', ondelete='CASCADE'), primary_key=True)

    # Tên hiển thị công khai trên sàn Freelance (VD: "Nguyễn Văn A" hoặc nickname)
    display_name = Column(String(150), nullable=False)

    # Chức danh/Khẩu hiệu ngắn gọn xuất hiện ngay bên dưới tên (VD: "Senior Fullstack Developer (React/Node.js) - 5 năm kinh nghiệm"). Đóng vai trò tạo ấn tượng nhanh với nhà tuyển dụng.
    headline = Column(String(200), nullable=True)

    # Đoạn văn bản giới thiệu bản thân, phong cách làm việc và thế mạnh chuyên môn
    bio = Column(String(255), nullable=True)

    # Số năm kinh nghiệm làm việc (Dạng số thập phân, VD: 3.5 năm)
    experience_years = Column(DECIMAL(precision=4, scale=1), default=0)

    # Mức thù lao mong muốn tính theo giờ (VD: 250000.00)
    hourly_rate = Column(DECIMAL(precision=18, scale=2), nullable=True)

    # Đơn vị tiền tệ của mức thù lao (Mặc định: 'VND')
    currency = Column(String(3), default='VND')

    # Trạng thái sẵn sàng nhận việc ('available': Đang rảnh sẵn sàng làm việc, 'limited': Nhận bán thời gian/hạn chế, 'unavailable': Đang bận dự án). Đóng vai trò làm tiêu chí lọc và ưu tiên cho thuật toán AI Matching.
    availability_status = Column(String(30), default='available')

    # Tỷ lệ phần trăm hoàn thiện hồ sơ (từ 0% đến 100%). Đóng vai trò đo lường mức độ chỉn chu của profile (VD: Nhập tên + Bio + Skill = 80%), dùng để gợi ý Freelancer tự bổ sung thông tin và làm tiêu chí xếp hạng tìm kiếm.
    profile_completion = Column(Integer, default=0)

    # Đường dẫn/Khóa định danh (Storage Key/Path) của file CV gốc lưu trên hệ thống Object Storage (như AWS S3 / Cloud Storage). Database không lưu file nặng trực tiếp mà chỉ lưu key này để sinh URL tải file an toàn khi cần.
    cv_storage_key = Column(String(255), nullable=True)

    # Dữ liệu bóc tách CV tự động bằng AI dưới dạng JSON (Object/Dict chứa danh sách kỹ năng, học vấn, kinh nghiệm làm việc). Lưu dạng JSON/JSONB linh hoạt để phục vụ thuật toán AI Matching quét và truy vấn nhanh.
    parsed_cv_json = Column(JSON, nullable=True)

    # Quan hệ 1-N với kỹ năng Freelancer qua bảng trung gian freelancer_skills
    skills = relationship(
        'FreelancerSkill', back_populates='profile', cascade='all, delete-orphan')

    # Quan hệ 1-N với portfolio cá nhân
    portfolio_items = relationship(
        'PortfolioItem', back_populates='profile', cascade='all, delete-orphan')

    # Quan hệ tham chiếu ngược tới Model User
    user = relationship('User', back_populates='freelancer_profile')
