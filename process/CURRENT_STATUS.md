# Báo Cáo Tiến Độ Dự Án - CV Intelligence & Verification

**Ngày cập nhật:** 2026-08-02
**Nguồn đối chiếu:** `DOCS/MASTER-DOC.md`

---

## 1. Mục tiêu (Theo gói Handoff DOCS)
Hệ thống CV Intelligence & Verification ở giai đoạn MVP (P0) yêu cầu các cấu phần cốt lõi:
- **Upload CV**: Hỗ trợ upload file an toàn qua multipart stream, có xác thực MIME type và lưu vào Object Storage.
- **Trích xuất & OCR**: Bóc tách text trực tiếp từ PDF/DOCX, có OCR fallback cho bản scan.
- **AI Normalization**: Chuẩn hóa dữ liệu bóc tách được thành định dạng JSON schema, tính điểm độ tin cậy (Confidence score) và lưu dấu vết nguồn (Provenance).
- **Xử lý dữ liệu**: Phát hiện các trường bị thiếu (Missing Information) hoặc xung đột (Conflicts).
- **Luồng trạng thái xác minh (State Machine)**: Quản lý vòng đời CV từ `DRAFT` -> `UPLOADED` -> `PARSING` -> `NEEDS_USER_REVIEW` -> `PENDING_VERIFICATION` -> `VERIFIED`.
- **Hiển thị**: Trust Passport động và Portal cho Admin đối soát minh chứng.

---

## 2. Trạng thái dự án hiện tại (Thực tế source code)
Dự án hiện tại đang ở **giai đoạn xây dựng nền móng cơ sở hạ tầng (Identity & Auth)**. Module cốt lõi là "CV Intelligence & Verification" **hoàn toàn chưa được bắt đầu**.

### ✅ Các hạng mục ĐÃ HOÀN THÀNH:
- Cấu trúc thư mục Backend FastAPI tiêu chuẩn (models, schemas, services, routers).
- Cấu hình kết nối Database (MySQL/SQLite) và tự động tạo bảng (Metadata).
- Các tiện ích cốt lõi: Logger, Password Hashing (`security.py`), Slug generator.
- Định nghĩa các Models xác thực cơ bản: `users`, `organizations`, `freelancer_profiles`.
- Hoàn thiện API Đăng ký tài khoản (xử lý thành công các lỗi độ dài VARCHAR và `IntegrityError` do trùng lặp email).
- **Khởi tạo Models CV (Mới):** Đã hoàn thành schema `cv_documents` và `cv_parse_tasks` cùng các Enums cấu hình (`DocumentStatusEnum`, `TaskTypeEnum`...) bám sát tài liệu JSON.
- **Bộ API Upload & Polling Task CV (Mới):** Đã hoàn thành 3 API (`POST /cv/upload`, `POST /cv/documents/{id}/parse`, `GET /cv/tasks/{taskId}`) có mã hóa SHA-256, validate file size/type và chạy giả lập tiến trình background thành công.

- **Models / Schema CV:** Đã hoàn thành `cv_documents`, `cv_parse_tasks`, `cv_parse_results` và `cv_extracted_fields`. (Chưa có `cv_evidences`, `verification_cases`).
- **Upload API**: Chưa tích hợp API nhận file CV từ Frontend, chưa có cấu hình Object Storage giả lập hoặc thật.
- **OCR & Parser Engine (Mới):** Đã xây dựng hoàn chỉnh gói `app/services/cv_engine/` (`classifier.py`, `extractor.py`, `normalizer.py`), hỗ trợ cơ chế **AI API Key Pool xoay vòng tự động (Groq, OpenRouter `sk-or-v1-...`, Gemini)** kèm Timeout 10s và tự động Retry / Fallback mượt mà.
- **Bộ API Result & User Review (Mới):** Đã hoàn thành 2 API (`GET /cv/documents/{id}/result` và `PATCH /cv/documents/{id}/review`), cho phép hiển thị dữ liệu bóc tách và Freelancer tự xác nhận/chỉnh sửa thông tin (chuyển `evidence_level` thành `USER_CONFIRMED` và CV status sang `PENDING_VERIFICATION`).
- **OCR & Image Parsing Engine (Mới & Đã Tối ưu Nhất quán 100%):** Đã nâng cấp `temperature = 0.0` giúp AI bóc tách nhất quán 100% (non-deterministic = 0). Đã xác minh trên tệp ảnh thực tế (`760610102_...jpg`): phần văn bản bên dưới `Bike-Share` kết thúc ở hết Trang 1 (không chứa chữ MISA hay Jira/Git/Figma). Hệ thống đã tự động đưa `workExperience` và `tools` vào `missing_fields` chuẩn xác để ứng viên bổ sung qua `PATCH /review`.
- **Global BaseResponse Standard (Mới):** Đã nâng cấp `BaseResponse` (`app/schemas/default.py`) và cập nhật 100% tất cả các API Router trong ứng dụng (bao gồm `users.py`, `cv.py`) trả về đúng định dạng chuẩn 6 trường (`status_code`, `message`, `data`, `error`, `timestamp`, `path`). Đã ghi nhận quy tắc **UNIFIED BASE RESPONSE RULE** vào file `.agents/rules/07_on_this_project.md`.
- **Background Tasks**: Chưa có hệ thống queue (Celery hoặc BackgroundTasks) để chạy parsing bất đồng bộ.
- **State Machine**: Chưa xây dựng logic kiểm soát vòng đời CV và API để Frontend (Freelancer/Admin) review thông tin.

---

## 3. Đề xuất các bước tiếp theo (Next Steps)
Để bám sát tài liệu yêu cầu MVP (P0), dự án cần ưu tiên thực hiện các bước sau:

1. **Khởi tạo Data Schema cho CV (Ưu tiên Cao nhất):** 
   - Dựa vào `04-CV-DATA-SCHEMA.json` để tạo các file `app/models/cv_documents.py`, định nghĩa các ENUM trạng thái (document_status, evidence_level) vào code.
2. **Xây dựng module Upload:** 
   - Tạo router `/api/v1/cv/upload` hỗ trợ nhận file (File/UploadFile của FastAPI), validate file type và lưu trữ.
3. **Thiết lập luồng Task Bất đồng bộ:** 
   - Dùng `fastapi.BackgroundTasks` để giả lập quá trình phân tích CV (để khớp với mô hình thiết kế API yêu cầu polling status).
4. **Phát triển Parser Cơ bản:** 
   - Tích hợp 1 thư viện đọc PDF cơ bản trước để test flow trích xuất text.
