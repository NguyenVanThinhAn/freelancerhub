# TASK 2.2: AI Parsing & OCR Engine
**Nhánh:** Dev 2 (AI, CV & Trust Core)
**Tài liệu tham chiếu:** `MASTER-DOC.md` (Phần M: Verification Rules, K: API Contract)

## 1. Tổng quan
Xây dựng Worker xử lý bóc tách văn bản từ PDF/Hình ảnh và chuẩn hóa qua AI để trả về cấu trúc JSON đồng nhất.

## 2. Yêu cầu Models & Database
- **Model `cv_parse_results` & `cv_extracted_fields`**:
  - `cv_parse_results`: Lưu JSON tổng hợp, `overall_confidence`, `missing_fields`, `conflicts`.
  - `cv_extracted_fields`: Lưu vết (provenance) của từng trường cụ thể (Ví dụ: trường `email` lấy từ trang 1, text gốc là gì, `confidence` bao nhiêu). Enum `evidence_level` mặc định là `AI_EXTRACTED`.

## 3. Lõi xử lý (Engine Pipeline)
- Viết `app/services/cv_engine/` gồm các module:
  - **Document Classifier**: Nhận biết file PDF đang là Text (có thể bôi đen chữ) hay Scan (toàn ảnh).
  - **Text Extractor**: Dùng `pdfplumber` hoặc `PyMuPDF` để lấy chữ trực tiếp (nhanh, rẻ).
  - **OCR Fallback**: Dùng Tesseract OCR cho các file ảnh (PNG/JPG) hoặc PDF dạng scan.
  - **AI Normalizer**: Xây dựng schema JSON và có thể dùng Local LLM (hoặc OpenAI/Gemini API nếu có) để chuẩn hóa đoạn text lộn xộn thành JSON có cấu trúc (`personalInfo`, `skills`, `workExperiences`). Tính điểm Confidence cho từng field. Đưa ra danh sách `missing_fields` (thiếu SĐT, thiếu skill...).

## 4. Routers & APIs (`app/routers/cv.py`)
- **[GET] /api/v1/cv/documents/{id}/result**:
  - Trả về JSON Result từ bảng `cv_parse_results` cho Frontend.
- **[PATCH] /api/v1/cv/documents/{id}/review**:
  - Freelancer đọc kết quả của AI và sửa đổi (nếu AI sai).
  - Backend cập nhật field đó và chuyển `evidence_level` thành `USER_CONFIRMED`. Lịch sử chỉnh sửa phải được Audit. Trạng thái tài liệu chuyển sang `NEEDS_EVIDENCE` hoặc `PENDING_VERIFICATION`.
