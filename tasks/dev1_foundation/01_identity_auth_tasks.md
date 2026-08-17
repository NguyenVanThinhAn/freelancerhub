# TASK 1.1: Identity & Authentication Core
**Nhánh:** Dev 1 (Foundation & Social)
**Tài liệu tham chiếu:** `MERGED-DOCUMENT.md` (Phần D: Identity & Access)

## 1. Tổng quan
Hoàn thiện toàn bộ luồng Đăng ký, Đăng nhập, quản lý Phiên (Session) bằng JWT, và cấu hình phân quyền (Role-based access control) cho toàn hệ thống.

## 2. Yêu cầu Models & Database
- Tinh chỉnh các models đã có: `users`, `organizations`, `freelancer_profiles`.
- Đảm bảo các ràng buộc:
  - `email`, `phone_e164` (Unique).
  - Cột `status` trong `users` có Enum `pending_verification`, `active`, `suspended`, `locked`, `deleted`.
  - Quản lý `failed_login_count` và `locked_until` để phòng chống brute-force.
- (Tùy chọn) Xây dựng bảng `user_sessions` (nếu cần quản lý token blacklist) hoặc dùng Redis.

## 3. Routers & APIs (`app/routers/auth.py`)
- **[POST] /api/v1/auth/login**:
  - Nhận `email`, `password`.
  - Hash compare (`passlib`).
  - Xử lý lock account nếu sai pass quá 5 lần.
  - Sinh AccessToken (hạn ngắn, ví dụ 15 phút) và RefreshToken (hạn dài, ví dụ 7 ngày).
- **[POST] /api/v1/auth/refresh**: Sinh AccessToken mới từ RefreshToken hợp lệ.
- **[POST] /api/v1/auth/change-password**: Yêu cầu mật khẩu cũ, cập nhật mật khẩu mới (có hash).
- **[POST] /api/v1/auth/reset-password**: Luồng quên mật khẩu (Gửi email token, đặt lại mật khẩu).

## 4. Middleware & Dependency (`app/core/dependencies.py`)
- Viết Dependency `get_current_user`:
  - Đọc Token từ `Authorization: Bearer <token>`.
  - Verify signature và expiry.
  - Truy vấn User tương ứng trong DB.
- Viết các Dependency phân quyền:
  - `require_role(role: str)` (Ví dụ: `require_role("freelancer")`).
  - Áp dụng vào Router để chặn truy cập trái phép.

## 5. Security Checklist
- Mật khẩu phải dùng `bcrypt` hoặc `argon2`.
- Không bao giờ trả mật khẩu về trong bất kỳ response nào.
- Password phải tuân thủ độ phức tạp (8+ ký tự, có chữ và số).
