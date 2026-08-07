# TASK 3.2: Contracts & Milestones
**Nhánh:** Dev 3 (Business & FinTech)
**Tài liệu tham chiếu:** `MERGED-DOCUMENT.md` (Phần G: Contracts, Milestones)

## 1. Tổng quan
Xây dựng logic quản lý Hợp đồng (Contracts) sinh ra sau khi Doanh nghiệp chấp nhận Proposal. Quản lý chia nhỏ Hợp đồng thành nhiều Giai đoạn (Milestones).

## 2. Yêu cầu Models & Database
- Khởi tạo Data Schema (Tham chiếu Phần G của `doc.txt`):
  - **`contracts`**: ID, `job_id`, `proposal_id`, `organization_id`, `freelancer_id`, `total_amount`, `status` (draft, active, completed, cancelled, disputed).
  - **`milestones`**: Hợp đồng được chia thành các mốc. ID, `contract_id`, `title`, `amount`, `due_date`, `status` (pending, funded, work_submitted, approved, paid).
  - **`work_submissions`**: Bảng phụ lưu nội dung/file bàn giao của Freelancer cho từng Milestone.

## 3. Routers & APIs (`app/routers/contracts.py`)
- **[GET] /api/v1/contracts**: Lấy danh sách hợp đồng (Tự động lọc theo User: Freelancer thấy HĐ của mình, Enterprise thấy HĐ của công ty).
- **[GET] /api/v1/contracts/{id}**: Lấy chi tiết hợp đồng và danh sách các Milestones bên trong.
- **[POST] /api/v1/contracts/{id}/milestones**: (Enterprise) Thêm cột mốc mới vào hợp đồng (Nếu là hợp đồng mở).
- **[POST] /api/v1/milestones/{id}/submit-work**: (Freelancer) Nộp sản phẩm (gửi link hoặc file đính kèm) để yêu cầu nghiệm thu Milestone.
- **[PATCH] /api/v1/milestones/{id}/review**: (Enterprise) Duyệt (Approve) hoặc Từ chối (Reject/Request Changes) sản phẩm bàn giao. Nếu Approve, sẽ kích hoạt trả tiền (Task 3.3).

## 4. Chú ý liên kết hệ thống
- Flow trạng thái Milestone rất quan trọng: `pending` -> Enterprise nạp tiền -> `funded` -> Freelancer nộp bài -> `work_submitted` -> Enterprise duyệt -> `approved`.
- Liên kết chặt chẽ với module Tài chính để giải ngân.
