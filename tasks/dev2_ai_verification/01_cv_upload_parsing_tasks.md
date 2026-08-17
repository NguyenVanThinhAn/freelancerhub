# TASK 2.1: CV Upload & Task Orchestration
**Nhánh:** Dev 2 (AI, CV & Trust Core)
**Tài liệu tham chiếu:** `MASTER-DOC.md` (Phần L: State Machine, K: API Contract)

## 1. Tổng quan
Đảm nhiệm xây dựng cấu trúc CSDL chính cho module CV. Viết API upload file an toàn và quản lý luồng các tác vụ bóc tách bất đồng bộ (Queueing).

## 2. Yêu cầu Models & Database
- Khởi tạo Data Schema (Tham chiếu `04-CV-DATA-SCHEMA.json`):
  - Model `cv_documents`: Quản lý metadata CV (ID, `freelancer_id`, `filename`, `mime_type`, `sha256`, `status`). Cấu hình Status Enum: `NOT_STARTED`, `UPLOADED`, `EXTRACTING`, `PARSED`, `UPLOAD_FAILED`...
  - Model `cv_parse_tasks`: Quản lý tiến trình (Task Queue), gồm `status`, `progress_percent`, `current_step`, `error_message`.

## 3. Routers & APIs (`app/routers/cv.py`)
- **[POST] /api/v1/cv/upload**:
  - Validations: Chỉ nhận file PDF, DOCX, PNG, JPG. Kích thước <= 10MB. 
  - Tính mã SHA256 để chống trùng lặp.
  - Upload file lên Object Storage (S3) hoặc lưu local server tạm cho MVP.
  - Insert bản ghi vào bảng `cv_documents`.
- **[POST] /api/v1/cv/documents/{id}/parse**:
  - Tạo một `cv_parse_tasks` với trạng thái `QUEUED`.
  - Khởi tạo Background Task / Celery task (sẽ gọi Engine ở Task 2.2).
  - Trả về HTTP 202 Accepted kèm `taskId`.
- **[GET] /api/v1/cv/tasks/{taskId}**:
  - API dùng để Frontend polling trạng thái (progress 0-100%).

## 4. State Machine Rule (Bắt buộc tuân thủ)
- Endpoint `/parse` chỉ được gọi khi document đang ở trạng thái `UPLOADED` hoặc `PARSING_FAILED`.
- Frontend KHÔNG được phép tự gọi API để ép trạng thái thành `VERIFIED`. Việc đổi trạng thái phải nằm ở Backend.
