from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, AliasChoices
from app.models.cv_documents import DocumentStatusEnum, TaskStatusEnum, TaskTypeEnum

# ==============================================================================
# PYDANTIC SCHEMAS CHO CV UPLOAD & TASK POLLING
# ==============================================================================

class CVUploadResponse(BaseModel):
    """
    Schema định dạng JSON trả về sau khi đăng ký/upload file CV thành công.
    """
    id: str = Field(..., alias="documentId", description="ID duy nhất của CV Document")
    original_filename: str = Field(..., alias="originalFilename", description="Tên file gốc lúc upload")
    mime_type: str = Field(..., alias="mimeType", description="MIME type của file")
    size_bytes: int = Field(..., alias="sizeBytes", description="Kích thước file tính bằng Bytes")
    sha256: str = Field(..., description="Mã băm SHA256 chống trùng lặp")
    status: DocumentStatusEnum = Field(..., description="Trạng thái hiện tại của CV")
    created_at: datetime = Field(..., alias="createdAt", description="Thời điểm tải lên")

    class Config:
        from_attributes = True
        populate_by_name = True


class CVParseTaskResponse(BaseModel):
    """
    Schema định dạng JSON trả về cho màn hình Polling kiểm tra tiến độ xử lý CV.
    """
    id: str = Field(..., alias="taskId", description="ID duy nhất của tác vụ")
    cv_document_id: str = Field(..., alias="documentId", description="ID của CV document tương ứng")
    task_type: TaskTypeEnum = Field(..., alias="taskType", description="Loại tác vụ (CLASSIFY, OCR, NORMALIZE...)")
    status: TaskStatusEnum = Field(..., description="Trạng thái chạy ngầm (QUEUED, RUNNING, SUCCEEDED, FAILED)")
    progress_percent: int = Field(..., alias="progressPercent", description="Phần trăm tiến độ hoàn thành (0 - 100%)")
    current_step: Optional[str] = Field(None, alias="currentStep", description="Ghi chú bước đang làm hiện tại")
    attempt_count: int = Field(0, alias="attemptCount", description="Số lần đã thử lại")
    error_code: Optional[str] = Field(None, alias="errorCode", description="Mã lỗi nếu task thất bại")
    error_message: Optional[str] = Field(None, alias="errorMessage", description="Chi tiết lỗi nếu task thất bại")

    class Config:
        from_attributes = True
        populate_by_name = True


# ==============================================================================
# PYDANTIC SCHEMAS CHO CV RESULT & USER REVIEW
# ==============================================================================

class CVExtractedFieldDetail(BaseModel):
    """
    Schema thông tin chi tiết của 1 ô dữ liệu bóc tách được (Provenance).
    """
    id: str = Field(..., description="ID của field")
    field_path: str = Field(..., alias="fieldPath", description="Đường dẫn định danh trường (vd: personalInfo.email)")
    value: Any = Field(..., alias="value", description="Giá trị dữ liệu")
    confidence: Optional[float] = Field(None, description="Điểm tin cậy (0.0 -> 1.0)")
    source_page: Optional[int] = Field(None, alias="sourcePage", description="Số trang trong PDF gốc")
    source_text: Optional[str] = Field(None, alias="sourceText", description="Văn bản gốc trước khi AI chuẩn hóa")
    evidence_level: str = Field(..., alias="evidenceLevel", description="Cấp độ minh chứng (AI_EXTRACTED, USER_CONFIRMED...)")
    requires_user_review: bool = Field(False, alias="requiresUserReview", description="Đánh dấu cần User kiểm tra (nếu confidence < 0.7)")

    class Config:
        from_attributes = True
        populate_by_name = True


class CVParseResultDetailResponse(BaseModel):
    """
    Schema kết quả tổng hợp chi tiết trả về cho màn hình Review của Freelancer.
    """
    document_id: str = Field(..., alias="documentId", description="ID của file CV Document")
    overall_confidence: Optional[float] = Field(None, alias="overallConfidence", description="Điểm tự tin trung bình")
    completeness_percent: Optional[int] = Field(None, alias="completenessPercent", description="Phần trăm hoàn thiện hồ sơ")
    missing_fields: List[str] = Field(default_factory=list, alias="missingFields", description="Danh sách trường bị thiếu")
    conflicts: List[Any] = Field(default_factory=list, description="Danh sách xung đột dữ liệu")
    extracted_fields: List[CVExtractedFieldDetail] = Field(default_factory=list, alias="extractedFields", description="Chi tiết các ô dữ liệu")

    class Config:
        from_attributes = True
        populate_by_name = True


class CVFieldReviewChange(BaseModel):
    """
    Schema cấu hình 1 ô dữ liệu Freelancer muốn chỉnh sửa hoặc xác nhận.
    """
    # validation_alias: accept both snake_case (frontend) and camelCase
    field_path: str = Field(
        ...,
        validation_alias=AliasChoices("field_path", "fieldPath"),
        serialization_alias="fieldPath",
        description="Đường dẫn trường cần sửa (vd: personalInfo.email)"
    )
    value: Any = Field(..., description="Giá trị mới do Freelancer cập nhật")
    action: str = Field("EDIT", description="Hành động: CONFIRM hoặc EDIT")


class CVReviewRequest(BaseModel):
    """
    Schema Body gửi lên API Request khi Freelancer nộp bản chỉnh sửa CV.
    """
    schema_version: str = Field("1.0", alias="schemaVersion", description="Phiên bản schema")
    changes: List[CVFieldReviewChange] = Field(..., description="Danh sách các thay đổi")
