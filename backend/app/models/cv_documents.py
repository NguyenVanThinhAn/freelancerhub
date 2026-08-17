import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from app.database import Base

# ==============================================================================
# ENUMS QUẢN LÝ TRẠNG THÁI VÀ PHÂN LOẠI
# ==============================================================================

class DocumentStatusEnum(str, enum.Enum):
    """
    Quản lý vòng đời (State Machine) của một file CV từ khi tải lên đến khi được duyệt.
    
    Các trạng thái:
    - NOT_STARTED: Khởi tạo bản ghi nhưng chưa bắt đầu làm gì cả.
    - UPLOADED: File đã được tải lên Storage thành công, chờ xử lý.
    - EXTRACTING: Hệ thống đang dùng code thuần (pdfplumber) để bóc tách text.
    - PARSED: Đã bóc tách thô xong và AI đã chuyển thành JSON.
    - NEEDS_USER_REVIEW: Cần Freelancer vào xem lại và xác nhận dữ liệu AI đọc.
    - NEEDS_MORE_INFO: Admin yêu cầu Freelancer bổ sung thêm thông tin.
    - NEEDS_EVIDENCE: Hệ thống hoặc Admin yêu cầu up thêm bằng chứng (bằng cấp...).
    - PENDING_VERIFICATION: Đang nằm trong hàng đợi chờ Admin phê duyệt.
    - PARTIALLY_VERIFIED: Admin chỉ duyệt một phần thông tin, một số phần bị bác bỏ.
    - VERIFIED: Admin duyệt toàn bộ, CV hợp lệ và đưa vào Trust Passport.
    - REJECTED: CV bị Admin từ chối (có thể do giả mạo, spam).
    - UPLOAD_FAILED: Quá trình tải file lên Storage gặp lỗi mạng hoặc kích thước.
    - PARSING_FAILED: Lỗi khi OCR hoặc AI không đọc được dữ liệu.
    - EXPIRED: CV đã quá hạn (nếu có quy định thời gian lưu trữ).
    """
    NOT_STARTED = "NOT_STARTED"
    UPLOADED = "UPLOADED"
    EXTRACTING = "EXTRACTING"
    PARSED = "PARSED"
    NEEDS_USER_REVIEW = "NEEDS_USER_REVIEW"
    NEEDS_MORE_INFO = "NEEDS_MORE_INFO"
    NEEDS_EVIDENCE = "NEEDS_EVIDENCE"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    PARTIALLY_VERIFIED = "PARTIALLY_VERIFIED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    UPLOAD_FAILED = "UPLOAD_FAILED"
    PARSING_FAILED = "PARSING_FAILED"
    EXPIRED = "EXPIRED"

class DocumentTypeEnum(str, enum.Enum):
    """
    Phân loại định dạng của file CV để chọn Engine xử lý phù hợp.
    
    Các định dạng:
    - PDF_TEXT: File PDF chuẩn, có thể bôi đen copy chữ (dùng thư viện nhẹ bóc text).
    - PDF_SCAN: File PDF toàn ảnh scan, không bôi đen được (bắt buộc dùng OCR).
    - DOCX: File Word.
    - IMAGE: File ảnh (PNG, JPG) - bắt buộc dùng OCR.
    """
    PDF_TEXT = "PDF_TEXT"
    PDF_SCAN = "PDF_SCAN"
    DOCX = "DOCX"
    IMAGE = "IMAGE"

class TaskTypeEnum(str, enum.Enum):
    """
    Các loại tác vụ chạy ngầm (Background Task) để xử lý CV.
    
    Các loại tác vụ:
    - CLASSIFY: Phân loại xem file là Text hay Scan.
    - TEXT_EXTRACT: Bóc tách text thuần từ file.
    - OCR: Chạy công cụ nhận diện chữ trong ảnh.
    - NORMALIZE: Đẩy vào AI (LLM) để chuẩn hóa đoạn text lộn xộn thành JSON.
    - COMPLETENESS_CHECK: AI rà soát xem hồ sơ có bị thiếu thông tin gì không (số ĐT, email...).
    """
    CLASSIFY = "CLASSIFY"
    TEXT_EXTRACT = "TEXT_EXTRACT"
    OCR = "OCR"
    NORMALIZE = "NORMALIZE"
    COMPLETENESS_CHECK = "COMPLETENESS_CHECK"

class TaskStatusEnum(str, enum.Enum):
    """
    Trạng thái của một Background Task đang chạy.
    
    Các trạng thái:
    - QUEUED: Đã đưa vào hàng đợi, đang chờ Worker xử lý.
    - RUNNING: Worker đang thực hiện (như đang gọi API OpenAI...).
    - SUCCEEDED: Task hoàn thành thành công.
    - FAILED: Task gặp lỗi (crash, timeout, hết quota AI).
    - CANCELLED: Bị người dùng hoặc hệ thống hủy bỏ.
    """
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

# ==============================================================================
# SQLALCHEMY MODELS
# ==============================================================================

class CVDocument(Base):
    """
    Bảng lưu trữ thông tin cơ bản nhất (Metadata) của 1 file CV mà Freelancer tải lên.
    """
    __tablename__ = "cv_documents"

    # ID định danh duy nhất (UUID) cho file CV
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # FK trỏ về user (Freelancer) sở hữu CV này
    freelancer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Tên file gốc lúc tải lên (ví dụ: "Nguyen_Van_A_CV.pdf")
    original_filename = Column(String(255), nullable=False)
    
    # Loại file theo chuẩn MIME (vd: "application/pdf")
    mime_type = Column(String(255), nullable=False)
    
    # Dung lượng file tính bằng bytes (để check giới hạn 10MB)
    size_bytes = Column(Integer, nullable=False)
    
    # Mã băm SHA-256 nội dung file để phát hiện up trùng file cũ
    sha256 = Column(String(64), nullable=False)
    
    # Đường dẫn vật lý lưu trên hệ thống lưu trữ (AWS S3 hoặc folder local)
    storage_key = Column(String(255), nullable=False)
    
    # Phân loại file là Text hay Scan (null nếu chưa phân loại xong)
    document_type = Column(Enum(DocumentTypeEnum), nullable=True)
    
    # Số trang của tài liệu (null nếu chưa bóc tách)
    page_count = Column(Integer, nullable=True)
    
    # Trạng thái hiện tại của CV trong luồng duyệt
    status = Column(Enum(DocumentStatusEnum), nullable=False, default=DocumentStatusEnum.UPLOADED)
    
    # Thời gian tạo và cập nhật bản ghi
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Quan hệ (Relationship): 1 file CV có thể có nhiều tác vụ (Task) chạy ngầm phía sau
    parse_tasks = relationship("CVParseTask", back_populates="document", cascade="all, delete-orphan")


class CVParseTask(Base):
    """
    Bảng lưu trữ thông tin tiến trình của các tác vụ chạy ngầm xử lý CV (Task Queue).
    Dùng để API có thể trả về phần trăm hoàn thành (progress) cho Frontend.
    """
    __tablename__ = "cv_parse_tasks"

    # ID định danh tác vụ
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # FK trỏ về bảng cv_documents (Task này xử lý cho file CV nào)
    cv_document_id = Column(String(36), ForeignKey("cv_documents.id"), nullable=False)
    
    # Loại tác vụ (Đang chạy OCR hay đang gọi AI Normalize?)
    task_type = Column(Enum(TaskTypeEnum), nullable=False)
    
    # Trạng thái tác vụ (Đang chạy, Xong, hay Lỗi)
    status = Column(Enum(TaskStatusEnum), nullable=False, default=TaskStatusEnum.QUEUED)
    
    # Phần trăm hoàn thành (từ 0 đến 100) để làm UI Progress bar
    progress_percent = Column(Integer, default=0)
    
    # Ghi chú rõ bước hiện tại đang làm gì (vd: "Đang gọi API GPT-4...")
    current_step = Column(String(120), nullable=True)
    
    # Số lần thử lại (nếu task bị lỗi mạng, hệ thống có thể cho retry)
    attempt_count = Column(Integer, default=0)
    
    # Mã lỗi và thông báo lỗi (nếu task FAILED) để debug
    error_code = Column(String(100), nullable=True)
    error_message = Column(String(255), nullable=True)
    
    # Thời gian bắt đầu và kết thúc tác vụ (để đo đạc tốc độ xử lý AI)
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)

    # Quan hệ (Relationship) trỏ ngược lại file CV
    document = relationship("CVDocument", back_populates="parse_tasks")
