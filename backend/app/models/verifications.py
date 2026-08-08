import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, Float, JSON, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

# ==============================================================================
# ENUMS QUẢN LÝ QUY TRÌNH XÁC MINH VÀ TRUST PASSPORT
# ==============================================================================

class EvidenceTypeEnum(str, enum.Enum):
    """
    Phân loại loại tệp minh chứng mà Freelancer đính kèm.
    """
    DIPLOMA = "DIPLOMA"                    # Bằng đại học / cao đẳng
    CERTIFICATE = "CERTIFICATE"            # Chứng chỉ chuyên môn (AWS, PMP, IELTS...)
    PORTFOLIO_SCREENSHOT = "PORTFOLIO_SCREENSHOT"  # Ảnh chụp sản phẩm, hợp đồng, chứng nhận dự án
    OTHER = "OTHER"                        # Minh chứng khác


class EvidenceStatusEnum(str, enum.Enum):
    """
    Trạng thái của tệp minh chứng.
    """
    UPLOADED = "UPLOADED"                  # Mới tải lên thành công
    PENDING = "PENDING"                    # Đã đóng gói vào Case gửi Admin
    VERIFIED = "VERIFIED"                  # Admin chấp nhận minh chứng này
    REJECTED = "REJECTED"                  # Admin từ chối minh chứng này


class VerificationCaseStatusEnum(str, enum.Enum):
    """
    Trạng thái của một Hồ sơ/Case gửi tới Admin duyệt.
    """
    PENDING = "PENDING"                    # Đang chờ Admin xem xét trong hàng đợi
    IN_REVIEW = "IN_REVIEW"                # Admin đang mở xem xét
    VERIFIED = "VERIFIED"                  # Admin phê duyệt toàn bộ hồ sơ
    PARTIALLY_VERIFIED = "PARTIALLY_VERIFIED"  # Admin chỉ duyệt 1 phần các trường
    NEEDS_MORE_INFO = "NEEDS_MORE_INFO"    # Admin yêu cầu Freelancer bổ sung thêm minh chứng
    REJECTED = "REJECTED"                  # Admin từ chối/Bác bỏ toàn bộ (phát hiện gian lận)


class VerificationDecisionActionEnum(str, enum.Enum):
    """
    Hành động quyết định của Admin với một Case.
    """
    VERIFY = "VERIFY"                      # Phê duyệt toàn bộ
    PARTIALLY_VERIFY = "PARTIALLY_VERIFY"  # Phê duyệt một phần
    REQUEST_MORE_INFO = "REQUEST_MORE_INFO"# Yêu cầu bổ sung thêm thông tin
    REJECT = "REJECT"                      # Từ chối bác bỏ


class VerificationReasonCodeEnum(str, enum.Enum):
    """
    Mã lý do có cấu trúc (reason code) theo MASTER-DOC §M.6.
    Admin PHẢI chọn 1 code khi REJECT/REQUEST_MORE_INFO; free-text notes không thay thế.
    Mỗi code map với 1 action family để validate ở decision endpoint.
    """
    # ── VERIFY family (tuỳ chọn, dùng để thống kê) ──
    EVIDENCE_SUFFICIENT = "EVIDENCE_SUFFICIENT"
    EDUCATION_VERIFIED = "EDUCATION_VERIFIED"
    EXPERIENCE_VERIFIED = "EXPERIENCE_VERIFIED"
    SKILL_VERIFIED = "SKILL_VERIFIED"
    # ── PARTIALLY_VERIFY family ──
    PARTIAL_FIELDS_VERIFIED = "PARTIAL_FIELDS_VERIFIED"
    EVIDENCE_SUFFICIENT_FOR_FIELDS = "EVIDENCE_SUFFICIENT_FOR_FIELDS"
    # ── REQUEST_MORE_INFO family (BẮT BUỘC) ──
    MISSING_DEGREE = "MISSING_DEGREE"
    MISSING_CERTIFICATE = "MISSING_CERTIFICATE"
    MISSING_PORTFOLIO = "MISSING_PORTFOLIO"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    TIMELINE_UNCLEAR = "TIMELINE_UNCLEAR"
    # ── REJECT family (BẮT BUỘC) ──
    DEGREE_NOT_VERIFIED = "DEGREE_NOT_VERIFIED"
    CERTIFICATE_FAKE = "CERTIFICATE_FAKE"
    EXPERIENCE_FABRICATED = "EXPERIENCE_FABRICATED"
    IDENTITY_MISMATCH = "IDENTITY_MISMATCH"
    DUPLICATE_PROFILE = "DUPLICATE_PROFILE"
    POLICY_VIOLATION = "POLICY_VIOLATION"
    # ── Generic ──
    OTHER = "OTHER"


# Map action → tập reason code hợp lệ. Dùng ở admin_cv decision endpoint để validate.
# Theo MASTER-DOC §M.6:
#   - REJECT    phải có reason code (free-text notes không đủ).
#   - REQUEST_MORE_INFO phải có reason code.
#   - VERIFY / PARTIALLY_VERIFY reason code là optional nhưng vẫn cho phép ghi nhận.
REASON_CODE_BY_ACTION: dict = {
    VerificationDecisionActionEnum.VERIFY: frozenset({
        VerificationReasonCodeEnum.EVIDENCE_SUFFICIENT,
        VerificationReasonCodeEnum.EDUCATION_VERIFIED,
        VerificationReasonCodeEnum.EXPERIENCE_VERIFIED,
        VerificationReasonCodeEnum.SKILL_VERIFIED,
        VerificationReasonCodeEnum.OTHER,
    }),
    VerificationDecisionActionEnum.PARTIALLY_VERIFY: frozenset({
        VerificationReasonCodeEnum.PARTIAL_FIELDS_VERIFIED,
        VerificationReasonCodeEnum.EVIDENCE_SUFFICIENT_FOR_FIELDS,
        VerificationReasonCodeEnum.OTHER,
    }),
    VerificationDecisionActionEnum.REQUEST_MORE_INFO: frozenset({
        VerificationReasonCodeEnum.MISSING_DEGREE,
        VerificationReasonCodeEnum.MISSING_CERTIFICATE,
        VerificationReasonCodeEnum.MISSING_PORTFOLIO,
        VerificationReasonCodeEnum.INSUFFICIENT_EVIDENCE,
        VerificationReasonCodeEnum.TIMELINE_UNCLEAR,
        VerificationReasonCodeEnum.OTHER,
    }),
    VerificationDecisionActionEnum.REJECT: frozenset({
        VerificationReasonCodeEnum.DEGREE_NOT_VERIFIED,
        VerificationReasonCodeEnum.CERTIFICATE_FAKE,
        VerificationReasonCodeEnum.EXPERIENCE_FABRICATED,
        VerificationReasonCodeEnum.IDENTITY_MISMATCH,
        VerificationReasonCodeEnum.DUPLICATE_PROFILE,
        VerificationReasonCodeEnum.POLICY_VIOLATION,
        VerificationReasonCodeEnum.OTHER,
    }),
}


# ==============================================================================
# SQLALCHEMY MODELS
# ==============================================================================

class CVEvidence(Base):
    """
    Bảng lưu trữ thông tin các file minh chứng (Bằng cấp, chứng chỉ, screenshot) do Freelancer tải lên.
    """
    __tablename__ = "cv_evidences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cv_document_id = Column(String(36), ForeignKey("cv_documents.id"), nullable=False)
    freelancer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    evidence_type = Column(Enum(EvidenceTypeEnum), nullable=False, default=EvidenceTypeEnum.OTHER)
    original_filename = Column(String(255), nullable=False)
    mime_type = Column(String(255), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    storage_key = Column(String(255), nullable=False)
    status = Column(Enum(EvidenceStatusEnum), nullable=False, default=EvidenceStatusEnum.UPLOADED)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    document = relationship("CVDocument", backref="evidences")
    freelancer = relationship("User", foreign_keys=[freelancer_id])


class VerificationCase(Base):
    """
    Bảng gói toàn bộ thông tin CV và Evidences thành 1 Case giao dịch cho Admin xác minh.
    """
    __tablename__ = "verification_cases"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    cv_document_id = Column(String(36), ForeignKey("cv_documents.id"), nullable=False)
    freelancer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    status = Column(Enum(VerificationCaseStatusEnum), nullable=False, default=VerificationCaseStatusEnum.PENDING)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by_admin_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    document = relationship("CVDocument", backref="verification_cases")
    freelancer = relationship("User", foreign_keys=[freelancer_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by_admin_id])
    decisions = relationship("VerificationDecision", back_populates="case", cascade="all, delete-orphan")


class VerificationDecision(Base):
    """
    Bảng lưu vết lịch sử quyết định của Admin khi phê duyệt một Case.
    """
    __tablename__ = "verification_decisions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    verification_case_id = Column(String(36), ForeignKey("verification_cases.id"), nullable=False)
    admin_id = Column(String(36), ForeignKey("users.id"), nullable=False)

    action = Column(Enum(VerificationDecisionActionEnum), nullable=False)
    reason_code = Column(Enum(VerificationReasonCodeEnum), nullable=True)
    reason = Column(Text, nullable=True)
    verified_field_paths = Column(JSON, nullable=True)  # Mảng các field_path được duyệt PLATFORM_VERIFIED

    idempotency_key = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    case = relationship("VerificationCase", back_populates="decisions")
    admin = relationship("User", foreign_keys=[admin_id])


class TrustPassportEntry(Base):
    """
    Bảng lưu trữ chính thức các mác xanh (Verified Badges) đã được Admin đối soát và phê duyệt.
    Mọi thông tin ở đây có mức độ tin cậy PLATFORM_VERIFIED và được hiển thị công khai.
    """
    __tablename__ = "trust_passport_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    freelancer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    field_path = Column(String(255), nullable=False)
    value_json = Column(JSON, nullable=False)
    badge_name = Column(String(100), nullable=False)  # Ví dụ: "Verified Degree: Software Engineering"
    verification_case_id = Column(String(36), ForeignKey("verification_cases.id"), nullable=False)
    
    verified_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)  # Theo MASTER-DOC Phần L.1.4: badge có thể hết hạn
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    freelancer = relationship("User", foreign_keys=[freelancer_id])
    case = relationship("VerificationCase")

    __table_args__ = (
        UniqueConstraint("freelancer_id", "field_path", name="uix_passport_freelancer_field"),
    )
