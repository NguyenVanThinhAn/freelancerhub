# TASK 3.3: Finance, Escrow Wallets & Disputes
**Nhánh:** Dev 3 (Business & FinTech)
**Tài liệu tham chiếu:** `MERGED-DOCUMENT.md` (Phần G: Finance & Disputes)

## 1. Tổng quan
Xây dựng hệ thống Ví tiền (Wallets), cơ chế Ký quỹ (Escrow) đảm bảo an toàn cho cả hai bên, lịch sử giao dịch và quy trình xử lý Khiếu nại (Disputes).

## 2. Yêu cầu Models & Database
- Khởi tạo Data Schema (Tham chiếu Phần G của `doc.txt`):
  - **`wallets`**: ID, `user_id` hoặc `organization_id`, `balance_available`, `balance_escrowed`.
  - **`transactions`**: ID, `wallet_id`, `amount`, `type` (deposit, withdrawal, escrow_hold, escrow_release), `reference_id` (trỏ về Milestone ID).
  - **`disputes`**: ID, `contract_id`, `milestone_id`, `initiator_id`, `reason`, `status` (open, under_review, resolved_freelancer, resolved_enterprise, split).

## 3. Lõi xử lý Tài chính (FinTech Logic)
- **Escrow Hold (Nạp quỹ tạm giữ)**: Khi Enterprise đồng ý bắt đầu 1 Milestone, hệ thống trừ tiền từ `balance_available` của Enterprise và cộng vào tài khoản ảo (Escrow System Wallet) hoặc `balance_escrowed`.
- **Escrow Release (Giải ngân)**: Khi Enterprise bấm `Approve` Milestone (Từ Task 3.2), hệ thống lập tức trừ tiền từ Escrow và cộng vào `balance_available` của Freelancer. Giao dịch này phải bọc trong **Database Transaction** (`BEGIN...COMMIT`) chặt chẽ.

## 4. Routers & APIs (`app/routers/finance.py`)
- **[GET] /api/v1/wallets/me**: Xem số dư ví (Khả dụng & Đang tạm giữ).
- **[GET] /api/v1/transactions**: Xem lịch sử dòng tiền.
- **[POST] /api/v1/disputes**: (Freelancer hoặc Enterprise) Bấm nút Khiếu nại/Tranh chấp nếu không thống nhất được chất lượng sản phẩm. Kích hoạt khóa trạng thái Milestone và Hợp đồng.
- **[PATCH] /api/v1/admin/disputes/{id}/resolve**: (Chỉ dành cho Admin) Phán quyết tranh chấp và chia tỷ lệ tiền giải ngân.

## 5. Chú ý liên kết hệ thống
- Mọi logic cộng trừ tiền (`transactions`, `wallets`) phải sử dụng Transaction của Database (VD: `db.commit()` sau khi ghi đủ cả 2 chiều, nếu lỗi 1 chiều phải `db.rollback()`). Tránh tối đa hiện tượng lủng tiền.
