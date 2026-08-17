# TASK 1.3: Communication & System Admin
**Nhánh:** Dev 1 (Foundation & Social)
**Tài liệu tham chiếu:** `MERGED-DOCUMENT.md` (Phần H: Communication, Admin & AI Quota)

## 1. Tổng quan
Xây dựng nền tảng giao tiếp cơ bản (Nhắn tin, Thông báo - Notifications) và quản lý hạn mức sử dụng tính năng AI (AI Quota) cho người dùng.

## 2. Yêu cầu Models & Database
- **Hệ thống Chat (`chat_threads`, `chat_messages`)**:
  - `chat_threads`: ID, `job_id` (nếu liên quan đến Job), `created_at`. Dùng bảng trung gian `thread_participants` (Thread ID, User ID) để gán người dùng.
  - `chat_messages`: ID, `thread_id`, `sender_id`, `content_text`, `created_at`.
- **Thông báo (`notifications`)**:
  - ID, `user_id`, `type` (Ví dụ: `JOB_INVITE`, `MESSAGE_RECEIVED`, `CV_VERIFIED`), `title`, `message`, `is_read`, `action_url`, `created_at`.
- **AI Quota (`ai_usage_quotas`, `ai_usage_logs`)**:
  - `ai_usage_quotas`: `user_id`, `feature` (Ví dụ: `CV_PARSING`, `AI_MATCHING`), `limit_count`, `used_count`, `reset_date`.
  - Dùng để chống lạm dụng API của nền tảng.

## 3. Routers & APIs
### Communication (`app/routers/communications.py`):
- **[GET] /api/v1/notifications**: Lấy danh sách thông báo của user hiện tại, phân trang, sort theo thời gian giảm dần.
- **[PATCH] /api/v1/notifications/{id}/read**: Đánh dấu đã đọc.
- **[POST] /api/v1/chat/threads**: Tạo luồng chat mới (Giữa Freelancer và Enterprise).
- **[GET] /api/v1/chat/threads/{id}/messages**: Lấy lịch sử chat.
- **[POST] /api/v1/chat/threads/{id}/messages**: Gửi tin nhắn mới.

### Admin & Quotas (`app/routers/admin_system.py`):
- **[GET] /api/v1/admin/users**: (Dành cho Role Admin) Lấy danh sách toàn bộ người dùng để quản trị (khóa, mở khóa tài khoản).
- **[GET] /api/v1/quotas/me**: Xem số lượt sử dụng AI còn lại (Dành cho Freelancer/Enterprise).

## 4. Chú ý liên kết
- Các module khác (ví dụ CV Verification, Jobs) sẽ gọi các hàm Service Notifications để bắn thông báo (ví dụ: `send_notification(user_id, "CV_VERIFIED", "Hồ sơ của bạn đã được duyệt!")`).
- Dev 1 chịu trách nhiệm viết hàm Service `send_notification` này để cung cấp cho toàn hệ thống.
