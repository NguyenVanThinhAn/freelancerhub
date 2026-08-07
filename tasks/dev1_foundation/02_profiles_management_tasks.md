# TASK 1.2: Profiles Management
**Nhánh:** Dev 1 (Foundation & Social)
**Tài liệu tham chiếu:** `MERGED-DOCUMENT.md` (Phần E: Profiles & Trust)

## 1. Tổng quan
Cho phép Freelancer và Enterprise cập nhật, chỉnh sửa hồ sơ (Profile) chi tiết của mình. Đồng thời xây dựng cơ sở hạ tầng lưu trữ avatar/logo.

## 2. Yêu cầu Models & Database
- Tinh chỉnh Model `freelancer_profiles`:
  - `title`, `bio`, `years_of_experience`, `hourly_rate`, `availability_status`.
  - Liên kết kỹ năng: Tạo bảng trung gian `freelancer_skills` (N-N) để liên kết Freelancer với bộ từ điển Skills của hệ thống.
- Tinh chỉnh Model `organizations`:
  - `name`, `industry`, `description`, `website`, `tax_id`, `verification_status`.
- (Tùy chọn) Bảng `portfolios` cơ bản cho Freelancer (Chỉ title, description, link/ảnh).

## 3. Routers & APIs (`app/routers/profiles.py`)
### Dành cho Freelancer:
- **[GET] /api/v1/freelancer/profile**: Lấy profile cá nhân (join `users` và `freelancer_profiles`).
- **[PATCH] /api/v1/freelancer/profile**: Cập nhật bio, title, hourly_rate.
- **[PUT] /api/v1/freelancer/skills**: Cập nhật danh sách kỹ năng hiện có.
- **[POST] /api/v1/freelancer/portfolio**: Thêm link portfolio cá nhân (Behance, Github...).

### Dành cho Enterprise (Organization):
- **[GET] /api/v1/organization/profile**: Lấy thông tin tổ chức.
- **[PATCH] /api/v1/organization/profile**: Cập nhật tên công ty, mô tả, industry.

### Quản lý File tĩnh (Tùy chọn MVP):
- **[POST] /api/v1/users/avatar**: Upload ảnh đại diện.
- **[POST] /api/v1/organization/logo**: Upload logo công ty.

## 4. Chú ý liên kết hệ thống (Integration)
- File Upload avatar/logo nên dùng Object Storage có link public, hoặc lưu local (phục vụ mục đích MVP).
- Mọi API trong module này đều bắt buộc phải đi qua `get_current_user` từ Task 1.1 để định danh người dùng.
