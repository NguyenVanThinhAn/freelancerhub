import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, Float, JSON, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

# ==============================================================================
# ENUMS QUẢN LÝ MỨC ĐỘ MINH CHỨNG (EVIDENCE LEVELS)
# ==============================================================================

class FieldEvidenceLevelEnum(str, enum.Enum):
    """
    Quản lý mức độ minh chứng và độ tin cậy của từng thông tin trong CV.
    
    Các mức độ:
    - AI_EXTRACTED: Thông tin do AI bóc tách tự động từ file CV gốc (chưa được xác nhận).
    - USER_CONFIRMED: Dữ liệu đã được Freelancer kiểm tra và tự xác nhận hoặc chỉnh sửa lại.
    - PLATFORM_VERIFIED: Dữ liệu đã được Admin của Sàn đối soát qua bằng cấp/chứng chỉ và phê duyệt (Hợp lệ cao nhất).
    - REJECTED: Dữ liệu bị bác bỏ do thông tin không chính xác hoặc bằng chứng giả mạo.
    """
    AI_EXTRACTED = "AI_EXTRACTED"
    USER_CONFIRMED = "USER_CONFIRMED"
    PLATFORM_VERIFIED = "PLATFORM_VERIFIED"
    REJECTED = "REJECTED"


# ==============================================================================
# SQLALCHEMY MODELS
# ==============================================================================

class CVParseResult(Base):
    """
    Bảng lưu trữ tổng hợp kết quả phân tích CV từ AI (Bức tranh tổng thể).
    """
    __tablename__ = "cv_parse_results"

    # ID định danh duy nhất (UUID) cho bản ghi kết quả
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # FK trỏ về bảng cv_documents (Mỗi file CV chỉ có 1 kết quả phân tích duy nhất - Unique)
    cv_document_id = Column(String(36), ForeignKey("cv_documents.id"), nullable=False, unique=True)
    
    # Phiên bản cấu hình Schema (Mặc định là "1.0")
    schema_version = Column(String(20), default="1.0", nullable=False)
    
    # Điểm tự tin trung bình của toàn bộ file CV (Giá trị từ 0.0 đến 1.0)
    overall_confidence = Column(Float, nullable=True)
    
    # Phần trăm độ đầy đủ của hồ sơ CV (Giá trị từ 0% đến 100%)
    completeness_percent = Column(Integer, nullable=True)
    
    # Danh sách các trường thông tin quan trọng bị thiếu (Ví dụ: ["personalInfo.phone", "skills"])
    missing_fields = Column(JSON, nullable=True)
    
    # Danh sách các thông tin xung đột hoặc vô lý (Ví dụ: Mốc thời gian làm việc chéo nhau)
    conflicts = Column(JSON, nullable=True)
    
    # Đường dẫn lưu file văn bản thô (Raw text) bóc tách từ PDF
    raw_text_storage_key = Column(String(255), nullable=True)
    
    # Thời gian khởi tạo bản ghi kết quả
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Quan hệ (Relationship): 1 kết quả phân tích chứa nhiều trường dữ liệu vết chi tiết
    extracted_fields = relationship("CVExtractedField", back_populates="parse_result", cascade="all, delete-orphan")


class CVExtractedField(Base):
    """
    Bảng lưu vết chi tiết (Provenance) từng trường thông tin mà AI bóc tách được.
    Dùng để hiển thị nguồn gốc, độ tin cậy và minh chứng riêng lẻ cho từng ô dữ liệu.
    """
    __tablename__ = "cv_extracted_fields"

    # ID định danh duy nhất (UUID) cho mỗi trường dữ liệu
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # FK trỏ về bản ghi kết quả phân tích cv_parse_results
    cv_parse_result_id = Column(String(36), ForeignKey("cv_parse_results.id"), nullable=False)
    
    # Đường dẫn định danh trường (Ví dụ: "personalInfo.email", "workExperiences[0].company")
    field_path = Column(String(255), nullable=False)
    
    # Giá trị thực tế của trường (Lưu dưới dạng JSON để linh hoạt chứa Chuỗi, Số, Mảng)
    value_json = Column(JSON, nullable=False)
    
    # Điểm tin cậy của riêng trường này do AI chấm (Giá trị từ 0.0 đến 1.0)
    confidence = Column(Float, nullable=True)
    
    # Trang số mấy trong file PDF gốc chứa thông tin này (null nếu không xác định được)
    source_page = Column(Integer, nullable=True)
    
    # Đoạn văn bản gốc trong PDF/ảnh chứa thông tin này trước khi AI chuẩn hóa
    source_text = Column(Text, nullable=True)
    
    # Cấp độ minh chứng của trường (AI_EXTRACTED, USER_CONFIRMED, PLATFORM_VERIFIED...)
    evidence_level = Column(Enum(FieldEvidenceLevelEnum), nullable=False, default=FieldEvidenceLevelEnum.AI_EXTRACTED)
    
    # Thời điểm Freelancer bấm xác nhận/chỉnh sửa trường này
    user_confirmed_at = Column(DateTime, nullable=True)
    
    # Thời điểm Admin phê duyệt minh chứng cho trường này
    platform_verified_at = Column(DateTime, nullable=True)

    # Quan hệ (Relationship) trỏ ngược lại kết quả tổng hợp
    parse_result = relationship("CVParseResult", back_populates="extracted_fields")

    # Ràng buộc duy nhất: Mỗi kết quả phân tích chỉ có 1 field_path duy nhất
    __table_args__ = (
        UniqueConstraint("cv_parse_result_id", "field_path", name="uix_result_field_path"),
    )
