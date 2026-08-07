# TASK 3.1: Marketplace & Proposals
**Nhánh:** Dev 3 (Business & FinTech)
**Tài liệu tham chiếu:** `MERGED-DOCUMENT.md` (Phần F: Marketplace & AI Matching)

## 1. Tổng quan
Xây dựng bảng tin tìm việc (Job Board) cho doanh nghiệp đăng dự án, và cho phép Freelancer tìm kiếm, nộp hồ sơ ứng tuyển (Proposal) kèm báo giá.

## 2. Yêu cầu Models & Database
- Khởi tạo Data Schema (Tham chiếu Phần F của `doc.txt`):
  - **`categories`**: Quản lý danh mục ngành nghề (IT, Design, Marketing...).
  - **`jobs`**: Quản lý tin tuyển dụng. ID, `organization_id`, `title`, `description`, `budget_min`, `budget_max`, `job_type` (fixed/hourly), `status` (open, closed, in_progress).
  - **`job_skills`**: Bảng N-N nối Job và Skill.
  - **`proposals`**: Quản lý hồ sơ ứng tuyển. ID, `job_id`, `freelancer_id`, `cover_letter`, `bid_amount`, `estimated_duration`, `status` (pending, accepted, rejected).

## 3. Routers & APIs
### Job Management (`app/routers/jobs.py`):
- **[POST] /api/v1/jobs**: Doanh nghiệp tạo tin tuyển dụng mới.
- **[PATCH] /api/v1/jobs/{id}**: Sửa nội dung tin (nếu chưa có người ứng tuyển) hoặc Đóng tin.
- **[GET] /api/v1/my-jobs**: Lấy danh sách tin tuyển dụng của công ty mình.
- **[GET] /api/v1/jobs/{id}/proposals**: Xem danh sách Freelancer đã nộp hồ sơ vào tin của mình.

### Marketplace & Đấu thầu (`app/routers/proposals.py`):
- **[GET] /api/v1/jobs**: Lấy danh sách tin tuyển dụng đang Public. Hỗ trợ Search (Fulltext hoặc Like), Filter (Theo Category, theo khoảng Budget, theo Skills).
- **[POST] /api/v1/jobs/{id}/apply**: Freelancer nộp Proposal (yêu cầu gửi Bid Amount và Cover Letter).
- **[PATCH] /api/v1/proposals/{proposalId}/decision**: Doanh nghiệp Accept hoặc Reject Proposal của Freelancer. Nếu Accept, tự động kích hoạt tạo Contract (Task 3.2).

## 4. Chú ý liên kết hệ thống
- Phải dùng Dependency giả lập `mock_get_current_user` với role `enterprise` khi gọi Job API, và role `freelancer` khi gọi Proposal API.
- Tương lai (Phase 2) module này sẽ gọi qua module AI Matching để gợi ý Job cho Freelancer.
