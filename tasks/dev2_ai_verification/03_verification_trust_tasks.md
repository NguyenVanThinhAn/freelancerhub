# TASK 2.3: Admin Verification & Trust Passport
**Nhánh:** Dev 2 (AI, CV & Trust Core)
**Tài liệu tham chiếu:** `MASTER-DOC.md` (Phần L: State Machine, Phần I: Data Schema)

## 1. Tổng quan
Giải quyết nửa sau của quá trình: Upload minh chứng bằng cấp (Evidences), Admin review đối soát dữ liệu và xuất Trust Passport cho Freelancer.

## 2. Yêu cầu Models & Database
- **Model `cv_evidences`**: Lưu bằng chứng đi kèm (Bằng ĐH, chứng chỉ, screenshot Portfolio). Gồm `storage_key`, `evidence_type`, `status`.
- **Model `verification_cases` & `verification_decisions`**: Gói toàn bộ CV Document và Evidence lại thành 1 Case gửi cho Admin. Quyết định của Admin (Duyệt/Từ chối) sẽ lưu vào `verification_decisions` kèm lý do.
- **Model `trust_passport_entries`**: Bảng dữ liệu cuối cùng được công khai. Chỉ những field nào được Admin duyệt (Level: `PLATFORM_VERIFIED`) mới được đưa vào đây.

## 3. Routers & APIs
### Cho Freelancer (`app/routers/cv.py`):
- **[POST] /api/v1/cv/documents/{id}/evidence**: Tải lên hình ảnh/tệp tin minh chứng (Bằng cấp, HĐLĐ...).
- **[POST] /api/v1/cv/documents/{id}/submit-verification**: Đẩy hồ sơ sang `PENDING_VERIFICATION` tạo Case cho Admin duyệt.
- **[GET] /api/v1/freelancer/trust-passport**: Lấy điểm uy tín và các mác xanh (verified badges) đang có hiệu lực của mình.

### Cho Admin (`app/routers/admin_cv.py`):
- Mọi API dưới đây yêu cầu Dependency kiểm tra Role là `admin`.
- **[GET] /api/v1/admin/verifications**: Lấy danh sách hàng đợi Case đang Pending.
- **[GET] /api/v1/admin/verifications/{caseId}**: Xem chi tiết 3 cột (Data AI đọc được - Data Freelancer sửa - Ảnh Bằng chứng) để đối soát.
- **[PATCH] /api/v1/admin/verifications/{caseId}/decision**: Admin gửi Request:
  - Hành động: `REQUEST_MORE_INFO` (Trả về bắt bổ sung), `VERIFY` (Duyệt toàn bộ), `PARTIALLY_VERIFY` (Chỉ duyệt vài trường), `REJECT` (Bắt gian lận).
  - Viết logic Trigger: Nếu `VERIFY` -> Tự động ghi/update vào bảng `trust_passport_entries` với Level `PLATFORM_VERIFIED`.
