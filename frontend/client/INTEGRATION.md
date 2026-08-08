# INTEGRATION.md — Kế hoạch kết nối Frontend ↔ Backend

> **Mục đích:** Tài liệu tra cứu để nối `frontend/client/**` với `backend/app/**` (FastAPI + SQLAlchemy).
> **Ngày tạo:** 07/08/2026 02:38 (UTC+7)
> **Phạm vi:** Toàn bộ frontend (`frontend/client/`): 15 file page (`pages/*.tsx` × 15, trong đó `NotFound.tsx` gắn với route catch-all `*`) — 14 path mount riêng biệt + 1 catch-all = 15 `<Route>` trong `App.tsx`; 71 endpoint của backend; theo Sprint 1–4.
> **Quyết định kiến trúc (đã chốt):**
> 1. **Auth:** JWT lưu `localStorage` (`access_token`, `refresh_token`).
> 2. **Network:** Vite proxy `/api/v1/*` → `http://localhost:${PORT_API}/api/v1/*` (chỉ dùng trong dev). Production build sẽ dùng `VITE_API_BASE` để override. Mọi port đọc từ env — xem §16.7 của `INDEX.md` và `./scripts/dev.sh`.
> 3. **Data layer:** React Query (`@tanstack/react-query` đã cài ở `App.tsx:7,25,28,53`).

---

## 1. Bối cảnh hiện tại (state-of-the-world)

### Frontend (`frontend/client/`)
- **15 file page** (`pages/*.tsx`) gồm 14 page chính + 1 `NotFound.tsx` (catch-all). 14 page chính đều dùng **mock array hardcode** (xem `pages/JobsList.tsx:5-14`, `pages/Matching.tsx:5-13`, `pages/Wallet.tsx:6-7`).
- **0 file** nào gọi `fetch` / `axios` / `apiClient` (grep `fetch(\|axios\|apiClient` = 0 hit trong `client/`).
- React Query `QueryClient` đã khởi tạo ở `App.tsx:7,25,28,53` nhưng **chưa có query/mutation nào** dùng nó.
- Dev Express (`server/index.ts`) chỉ có `/api/ping` + `/api/demo`. Sẽ được **giữ nguyên** (không xóa) cho local dev fallback.

### Backend (`backend/`)
- **FastAPI** ở `backend/main.py`, 13 router mount dưới prefix `/api/v1` (xem `main.py:119-131`).
- **71 endpoint** trong 13 module (`backend/app/routers/*.py`):
  - cv=10, contracts=8, profiles=8, proposals=7, jobs=7, communications=6, auth=5, finance=4, admin_system=4, disputes=5, admin_cv=3, users=2, email_verification=2.
- Mọi response đều bọc trong `BaseResponse` (`backend/app/schemas/default.py:5-26`):
  ```ts
  type BaseResponse<T> = {
    status_code: number;
    message: string;
    data: T | null;
    error: { detail: string } | null;
    timestamp: string;
    path: string;
  };
  ```
- **Quy ước field name:** Python dùng `snake_case` (vd: `job_id`, `created_at`), nhưng response JSON **dùng `camelCase`** cho các schema CV (qua `Field(..., alias="documentId")` ở `schemas/cv.py:14`). Xem chi tiết tại `cv.py:14,15,16,17,20,31-39,55-61,72-77,88,97`. → Frontend nên định nghĩa TS type khớp camelCase (vd: `documentId`, `originalFilename`, `taskType`) cho các response của CV. **Non-CV schemas** (jobs, contracts, wallet, disputes, proposals) giữ nguyên `snake_case` (vd: `JobListOut` ở `schemas/jobs.py:77-91` đều là snake_case).
- Auth dùng JWT (header `Authorization: Bearer <token>`), enforced qua `get_current_user` dependency.
- **Chưa chạy local** (port 8000 không listen lúc viết doc này). Backend sẽ chạy qua `cd backend && uvicorn main:app --reload --port 8000`.

### CORS
Backend đã set `allow_origins=["*"]` (`main.py:108-114`) — OK cho dev. Prod phải giới hạn lại.

---

## 2. Cấu trúc thư mục sẽ thêm vào frontend

```
frontend/client/
├── api/
│   ├── client.ts              # fetch wrapper (base URL, auth header, refresh)
│   ├── queryKeys.ts           # hằng số key cho React Query (group theo domain)
│   └── endpoints.ts           # tập trung toàn bộ path tuyệt đối
├── auth/
│   ├── AuthContext.tsx        # Context + hook useAuth()
│   ├── ProtectedRoute.tsx     # <ProtectedRoute/> bọc route cần login
│   └── tokenStorage.ts        # get/set/clear access_token + refresh_token
├── hooks/
│   ├── use-jobs.ts            # useJobs, useJob, useCreateJob, useUpdateJob, useDeleteJob
│   ├── use-wallet.ts          # useWallet, useTransactions, useDeposit, useWithdraw
│   ├── use-matching.ts        # (deferred — xem §6)
│   ├── use-proposals.ts       # (Sprint 2)
│   ├── use-contracts.ts       # (Sprint 3)
│   └── ... (mỗi router 1 file hook)
└── lib/
    └── format.ts              # formatCurrency, formatDate, statusVi (ánh xạ enum → tiếng Việt)
└── types/
    ├── api.ts                 # ApiError, BaseResponse<T> (xem §1)
    ├── auth.ts                # TokenOut (snake_case, optional refresh_token), User (built from JWT sub + FreelancerProfileOut)
    ├── profile.ts             # FreelancerProfileOut, OrganizationProfileOut
    ├── jobs.ts                # JobOut, JobCreate, JobSearchQuery, JobStatusEnum
    ├── contracts.ts           # ContractOut, MilestoneOut, WorkSubmissionOut
    ├── wallet.ts              # WalletOut, TransactionOut, TransactionTypeEnum
    ├── proposals.ts           # ProposalOut, ProposalCreate
    ├── disputes.ts            # DisputeOut, DisputeEvidenceOut, DisputeStatusEnum
    ├── cv.ts                  # CVUploadResponse, CVParseTaskResponse, CVParseResultDetailResponse (chú ý: **camelCase** qua Pydantic alias — xem §1)
    └── notifications.ts       # NotificationOut
```

**Lưu ý:** Backend chỉ tạo schemas Pydantic; không có file TS cho frontend. Frontend **tự viết TS types** mirror Pydantic schema (khuyến nghị dùng tool như `openapi-typescript` sau khi backend stable). Ở giai đoạn đầu, copy từ `backend/app/schemas/*.py` sang `frontend/client/types/*.ts` là đủ.

---

> ⚠️ **Trạng thái thực tế của frontend (round 13, 2026-08-07 16:46):**
> - §2 **ĐÃ THỰC HIỆN**: Tạo `client/api/` (client.ts, queryKeys.ts, endpoints.ts), `client/auth/` (AuthContext.tsx, ProtectedRoute.tsx, tokenStorage.ts), `client/types/api.ts`, `client/hooks/use-jobs.ts`, `client/hooks/use-wallet.ts`, `client/hooks/use-notifications.ts`, `client/hooks/use-organization.ts`. App.tsx mount AuthProvider + ProtectedRoute. Login page created.
> - Frontend **ĐÃ KẾT NỐI**: JobsList ✅, Wallet ✅, Settings ✅, Index ✅, CreateJob ✅, Matching ✅, ContractMilestone ✅, ProjectWorkspace ✅. Còn lại: CandidateDetail, ContentInput, ContentResult, AIProcessing, GeneratedJD, InterviewScheduler.

## 3. Lớp network — `client/api/client.ts`

```ts
const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

let accessToken: string | null = localStorage.getItem("access_token");
export function setAccessToken(t: string | null) {
  accessToken = t;
  if (t) localStorage.setItem("access_token", t);
  else localStorage.removeItem("access_token");
}

let onUnauthorized: () => void = () => {};
export function setOnUnauthorized(cb: () => void) { onUnauthorized = cb; }

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = init;
  const h = new Headers(headers);
  if (auth && accessToken) h.set("Authorization", `Bearer ${accessToken}`);
  if (rest.body && !(rest.body instanceof FormData) && !h.has("Content-Type")) {
    h.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers: h });

  if (res.status === 401 && auth) {
    onUnauthorized();           // gọi AuthContext xử lý refresh hoặc logout
  }

  const json = (await res.json()) as BaseResponse<T>;
  if (!res.ok || json.status_code >= 400) {
    throw new ApiError(json.status_code ?? res.status, json.message, json.error);
  }
  return json.data as T;
}
```

**Vite proxy** — sửa `vite.config.ts`:
```ts
server: {
  proxy: {
    "/api/v1": {
      target: "http://localhost:8000",
      changeOrigin: true,
    },
  },
  // ... host, port, fs giữ nguyên
}
```

---

## 4. AuthContext — flow đăng nhập / refresh

### 4.1 Token storage
| Key | Type | Lifetime |
|---|---|---|
| `access_token` | string | 15 phút (server config) |
| `refresh_token` | string | 7 ngày |
| `user` | JSON | cho đến khi logout |

### 4.2 `AuthProvider` (đặt trong `App.tsx` sau `QueryClientProvider`)

```tsx
// File: client/auth/AuthContext.tsx
// Imports (khai báo ở đầu file, snippet này bỏ qua):
//   import { createContext, useContext, useState, useEffect, ReactNode } from "react";
//   import { useNavigate } from "react-router-dom";
//   import { apiFetch, setAccessToken, setOnUnauthorized, ApiError } from "@/api/client";
//   import { FreelancerProfileOut } từ schema backend
// Helpers (file riêng client/auth/tokenStorage.ts):
//   export function loadUser(): User | null { ... }
//   export function decodeJwtSub(token: string): string | null {
//     const payload = JSON.parse(atob(token.split('.')[1]));
//     return payload.sub;
//   }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser());
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    const tokens = await apiFetch<TokenOut>("/auth/login", {
      method: "POST", auth: false, body: JSON.stringify({ email, password }),
    });
    setAccessToken(tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);
    // Lưu ý: backend CHƯA có endpoint /auth/me trả về User identity.
    // Cách tạm thời: decode JWT payload (không cần verify ở client) để lấy `sub` (user_id).
    // JWT của backend trả `sub` qua `create_access_token(user.id)` (xem services/auth.py:49).
    // Khi backend bổ sung endpoint thì thay bằng apiFetch<User>("/auth/me").
    const userId = decodeJwtSub(tokens.access_token) ?? "";
    const profile = await apiFetch<FreelancerProfileOut>("/freelancer/profile").catch(() => null);
    const u: User | null = profile ? { id: userId, email, ...profile } : null;
    setUser(u);
    if (u) localStorage.setItem("user", JSON.stringify(u));
  };

  const logout = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  }, [navigate]);

  // set onUnauthorized để apiFetch tự gọi logout khi 401
  useEffect(() => setOnUnauthorized(logout), [logout]);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
```

### 4.3 Auth requirement map (verified by Python AST script `/tmp/check_auth.py`)

| Total | 71 |
|---|---|
| **Public** (no token) | **1** — `/jobs`, `/jobs/{id}`, `/freelancers/{id}/trust-passport` |
| **Auth required** (Bearer token) | **51** — Breakdown: 3 admin CV `/admin/verifications*` + 4 admin system (`/admin/users`, `/admin/users/{id}/lock`, `/unlock`, `/quotas/me`) + 1 password change + 2 notifications + 4 chat + 8 contracts/milestones/deliverables + 5 disputes + 4 finance + 2 categories + 3 jobs CRUD + 8 profiles + 7 proposals |

**Lưu ý quan trọng:**
- **CV endpoints đã có auth ✅:** Toàn bộ 9 CV endpoints cần auth giờ đều có `Depends(get_current_user)`. `freelancer_id` được lấy từ JWT token. `/freelancers/{id}/trust-passport` giữ public (client xem profile freelancer).
- **Admin protection verified:** 3 endpoint `/admin/verifications*` có `dependencies=[Depends(require_role('admin'))]` ở decorator (line 227) + `admin_user: User = Depends(require_role('admin'))` ở signature (lines 102, 160, 232). → Frontend **phải ẩn các nút admin** nếu không phải role admin.
- `/jobs` (list) và `/jobs/{id}` (detail) là **public** — không cần token. Tất cả mutation khác (`POST/PATCH/DELETE /jobs` + 2 `/categories`) đều auth-required.
- `/auth/login`, `/auth/refresh`, `/auth/reset-password`, `/auth/reset-password/confirm`, `/auth/email-verification`, `/auth/email-verification/confirm` cũng là public (client `apiFetch()` phải đặt `auth: false` cho 6 endpoint này).

### 4.4 Auto-refresh (nâng cấp sau)
Hiện tại: 401 → logout. Có thể nâng cấp lên "thử `POST /auth/refresh` 1 lần trước khi logout" bằng cách `onUnauthorized` async; đề xuất làm ở Sprint 2.

---

## 5. Bảng ánh xạ Page ↔ Endpoint (theo Sprint)

> **Quy ước đọc:** Mỗi dòng = 1 action. **Phase** = sprint nên triển khai. **Mock cần xoá** = biến/dữ liệu hardcode trong file cần thay bằng React Query.

### Phase 1 (Foundation) — Ưu tiên cao nhất, không cần backend phức tạp

| # | Page (frontend) | Action | Method | Endpoint | Auth? | Mock hiện tại cần xoá |
|---:|---|---|---|---|:-:|---|
| 1 | **Index** `/` | Lấy dashboard tổng quan | GET | TBD — chưa có `/dashboard`. Dùng `GET /jobs?status=OPEN` + `GET /contracts/my` + `GET /wallet` | mixed | toàn bộ hằng số trong `Index.tsx` |
| 2 | **JobsList** `/jobs` | Danh sách JD | GET | `/jobs?status=OPEN&page=1&page_size=20` | ❌ public | `const jobs` (lines 5-13) |
| 3 | **JobsList** | Tạo JD → chuyển trang | — | navigate sang `/create-job` | — | — |
| 4 | **CreateJob** `/create-job` | Submit form tạo JD | POST | `/jobs` (body: `JobCreate`) | ✅ | hardcode value trong `<Field value="..."/>` (lines 52-71) |
| 5 | **AIProcessing** `/ai-processing` | (deferred) | — | Sprint 3 — AI chưa có endpoint | — | — |
| 6 | **GeneratedJD** `/generated-jd` | (deferred) | — | Sprint 3 | — | — |
| 7 | **ContentInput** `/content-input` | (deferred) | — | Sprint 3 | — | — |
| 8 | **ContentResult** `/content-result` | (deferred) | — | Sprint 3 | — | — |
| 9 | **Matching** `/matching` | (deferred) | — | Chưa có endpoint AI matching trong backend. Phải tự build hoặc đợi | — | `const candidates` |
| 10 | **CandidateDetail** `/candidate-detail` | (deferred) | — | Cần `/freelancers/{id}` (hiện không có) | — | hardcode Nguyễn Thu Hà |
| 11 | **ExplainableMatching** `/explainable-matching` | Lưu shortlist | POST | TBD — chưa có `/shortlist` endpoint. Hiện chỉ alert | — | `alert("Lưu shortlist...")` |
| 12 | **InterviewScheduler** `/interview-scheduler` | Gửi lời mời phỏng vấn | POST | TBD — chưa có `/interviews` endpoint | — | `alert("Gửi lời mời")` |
| 13 | **ContractMilestone** `/contract-milestone` | Tạo hợp đồng | POST | `/contracts` | ✅ | wizard mock |
| 14 | **ProjectWorkspace** `/project-workspace` | Submit milestone | POST | `/milestones/{id}/submit` | ✅ | — |
| 15 | **Wallet** `/wallet` | Số dư ví | GET | `/wallet` | ✅ | `24,750,000 ₫` hardcode (line 42) |
| 16 | **Wallet** | Lịch sử giao dịch | GET | `/wallet/transactions` | ✅ | `const transactions` (line 7) |
| 17 | **Wallet** | Nạp tiền | POST | `/wallet/deposit` | ✅ | `openDeposit` chỉ navigate |
| 18 | **Wallet** | Rút tiền | POST | `/wallet/withdraw` | ✅ | `openWithdraw` chỉ navigate |
| 19 | **Wallet** | Danh sách dự án ký quỹ | GET | `/contracts/my` (filter status) | ✅ | `const projects` (line 6) |

### Phase 2 (Auth + Profile + Notifications)

| # | Page / Context | Action | Method | Endpoint | Auth? |
|---:|---|---|---|---|:-:|
| 20 | **Login (new page)** `/login` | Login | POST | `/auth/login` | ❌ public |
| 21 | **Login** | Register freelancer | POST | `/register/freelancer` | ❌ public |
| 22 | **Login** | Register business | POST | `/register/business` | ❌ public |
| 23 | **TopBar** | Bell badge → dropdown notifications | GET | `/notifications` | ✅ |
| 24 | **TopBar** | Đánh dấu đã đọc | PATCH | `/notifications/{id}/read` | ✅ |
| 25 | **AppSidebar** | User avatar dropdown | GET | `/organization/profile` | ✅ |
| 26 | **Settings (new)** `/settings` | Xem profile | GET | `/freelancer/profile` | ✅ |
| 27 | **Settings** | Sửa profile | PATCH | `/freelancer/profile` | ✅ |
| 28 | **Settings** | Skills | PUT | `/freelancer/skills` | ✅ |
| 29 | **Settings** | Portfolio | POST | `/freelancer/portfolio` | ✅ |
| 30 | **Settings** | Avatar | POST | `/users/avatar` (multipart) | ✅ |
| 31 | **Settings** | Đổi mật khẩu | POST | `/auth/change-password` | ✅ |
| 32 | **Settings** | Reset mật khẩu | POST | `/auth/reset-password` | ❌ public |
| 33 | **Settings** | Confirm reset | POST | `/auth/reset-password/confirm` | ❌ public |
| 34 | **Settings** | Org logo | POST | `/organization/logo` (multipart) | ✅ |
| 35 | **Settings** | Org profile | GET/PATCH | `/organization/profile` | ✅ |
| 36 | **Settings** | Email verification | POST | `/auth/email-verification` + `/auth/email-verification/confirm` | ❌ public (cả 2) |
| 37 | **TopBar** | Quota (còn lượt AI) | GET | `/quotas/me` | ✅ |

### Phase 3 (CV Intelligence — Sprint 2–3 backend, frontend tích hợp Sprint 3)

| # | Page (cần tạo mới) | Action | Method | Endpoint | Auth? ⚠️ |
|---:|---|---|---|---|:-:|
| 38 | `/freelancer/upload` (CV-01) | Upload CV | POST | `/cv/upload` (multipart, `freelancer_id` từ form) | ❌ public (mock) |
| 39 | (internal) | Bắt đầu parse | POST | `/cv/documents/{id}/parse` | ❌ public |
| 40 | (internal) | Poll task | GET | `/cv/tasks/{task_id}` | ❌ public |
| 41 | (internal) | Lấy kết quả parsed | GET | `/cv/documents/{id}/result` | ❌ public |
| 42 | (internal) | Review/sửa | PATCH | `/cv/documents/{id}/review` | ❌ public |
| 43 | `/freelancer/verification/evidence` (CV-05) | Upload evidence | POST | `/cv/documents/{id}/evidence` (multipart, `freelancer_id` từ form) | ❌ public |
| 44 | (CV-05) | Submit verification | POST | `/cv/documents/{id}/submit-verification` | ❌ public |
| 45 | `/freelancer/verification/:caseId` (CV-06) | Resubmit | POST | `/cv/documents/{id}/resubmit-verification` | ❌ public |
| 46 | `/freelancer/trust-passport` (CV-07) | Lấy trust passport | GET | `/freelancer/trust-passport` | ❌ public (mock) |
| 47 | `/freelancers/:id/trust-passport` | Public view | GET | `/freelancers/{id}/trust-passport` | ❌ public |

> **⚠️ Cảnh báo bảo mật:** Toàn bộ 10 endpoint CV hiện **không có auth** (xem `cv.py:74` default mock `freelancer_id` ở form body). Frontend **tạm thời** vẫn wire được nhưng cần đẩy cảnh báo này lên backend team để thêm `Depends(get_current_user)` + lấy `freelancer_id` từ token (KHÔNG từ form), trước khi go-live.

### Phase 4 (Proposals, Contracts, Disputes, Admin)

| # | Page | Action | Method | Endpoint | Auth? |
|---:|---|---|---|---|:-:|
| 48 | **Matching** | Lấy candidates cho 1 job | GET | TBD — chưa có `/jobs/{id}/candidates`. Cần thêm backend hoặc dùng mock | — |
| 49 | (freelancer view) | Proposals của tôi | GET | `/proposals/my` | ✅ |
| 50 | **CandidateDetail** | Proposals của 1 job | GET | `/jobs/{job_id}/proposals` | ✅ |
| 51 | (submit) | Tạo proposal | POST | `/jobs/{job_id}/proposals` | ✅ |
| 52 | | Accept proposal | POST | `/proposals/{id}/accept` | ✅ |
| 53 | | Reject | POST | `/proposals/{id}/reject` | ✅ |
| 54 | | Withdraw | POST | `/proposals/{id}/withdraw` | ✅ |
| 55 | **ContractMilestone** | Contracts của tôi | GET | `/contracts/my` | ✅ |
| 56 | **ProjectWorkspace** | Chi tiết contract | GET | `/contracts/{id}` | ✅ |
| 57 | | Submit milestone | POST | `/milestones/{id}/submit` | ✅ |
| 58 | | Approve deliverable | POST | `/deliverables/{id}/approve` | ✅ |
| 59 | | Reject deliverable | POST | `/deliverables/{id}/reject` | ✅ |
| 60 | | Complete contract | POST | `/contracts/{id}/complete` | ✅ |
| 61 | **Disputes (new)** | Mở dispute | POST | `/disputes` | ✅ |
| 62 | | Chi tiết dispute | GET | `/disputes/{id}` | ✅ |
| 63 | | Disputes của contract | GET | `/contracts/{id}/disputes` | ✅ |
| 64 | | Thêm evidence | POST | `/disputes/{id}/evidence` | ✅ |
| 65 | | Resolve | POST | `/disputes/{id}/resolve` | ✅ |
| 66 | **Admin (new)** | Danh sách verifications | GET | `/admin/verifications` | ✅ admin |
| 67 | | Chi tiết case | GET | `/admin/verifications/{case_id}` | ✅ admin |
| 68 | | Admin decision | PATCH | `/admin/verifications/{case_id}/decision` | ✅ admin |
| 69 | **Admin** | Users list | GET | `/admin/users` | ✅ admin |
| 70 | | Lock/unlock | PATCH | `/admin/users/{id}/lock` + `/unlock` | ✅ admin |
| 71 | **CreateJob** | Categories | GET/POST | `/categories` | ✅ |
| 72 | **Messages (new)** | Chat threads | GET/POST | `/chat/threads` + `/chat/threads/{id}/messages` | ✅ |

> **Body format đặc biệt:**
> - `POST /chat/threads/{id}/messages` body là `dict` không typed (`communications.py:108`). Backend expect `{content_text: "..."}`. Frontend: `apiFetch("/chat/threads/" + threadId + "/messages", {method: "POST", body: JSON.stringify({content_text: msg})})`.
> - `POST /cv/documents/{id}/evidence` body multipart `title, evidence_type, file, freelancer_id` (`cv.py:372`). `freelancer_id` Optional (sẽ fallback về `doc.freelancer_id`).
> - `POST /cv/upload` body multipart `file, freelancer_id` (`cv.py:70`). Default `freelancer_id = "mock-freelancer-uuid-123"` — **cần fix backend**.
> - **⚠️ `POST /contracts` KHÔNG có JSON body — dùng query params!** (`contracts.py:83-92`). Backend accept `job_id, freelancer_id, total_amount, proposal_id` (Optional) làm query params trực tiếp (không có `ContractCreate` Pydantic schema). Frontend **phải** dùng: `apiFetch(\`/contracts?job_id=\${jobId}&freelancer_id=\${flId}&total_amount=\${amt}\`, {method: "POST"})`. **Cũng yêu cầu user phải là Organization owner** (`contracts.py:93-97`); nếu user chỉ là freelancer → 403.
> - **⚠️ `POST /jobs` cũng yêu cầu user là Organization owner** (`jobs.py:118-122`). Freelancer account không thể tạo job — chỉ business user (đã register qua `/register/business` có Organization) mới được. Đây là business logic check quan trọng cho `CreateJob` page.
> - `POST /contracts/{id}/milestones` body JSON `MilestoneCreate` (`contracts.py:120`) — fields: `title, description, amount, due_date` (xem `schemas/contracts.py:28-32`).

> **⚠️ Query params vs Body — quy tắc format (CRITICAL PATTERN):**
> - **Query params**: Backend dùng **snake_case** (Python convention). Frontend phải gọi đúng snake_case:
>   - `GET /jobs?status=OPEN&page=1&page_size=20&category_id=X&skill_ids=Y&payment_type=FIXED&budget_min=0&budget_max=100` (`jobs.py:54-64`).
>   - `GET /admin/verifications?status_filter=PENDING&page=1&limit=20` (`admin_cv.py:96-101`). Lưu ý: tên Python là `status_filter`, KHÔNG phải `statusFilter`.
>   - `GET /wallet/transactions?limit=50` (`finance.py:79-85`).
>   - `GET /jobs/{id}/proposals` — không có query, nhưng `GET /jobs` có 9 query params.
> - **Body JSON**: Phần lớn schemas dùng **camelCase alias** (`Field(..., alias="...")` + `populate_by_name=True`). Frontend gửi camelCase là đúng:
>   - `POST /cv/upload` → multipart (camelCase optional), `POST /cv/documents/{id}/review` body `{schemaVersion, changes}` (camelCase).
>   - `POST /admin/verifications/{id}/decision` body `{action, reason, verifiedFieldPaths}` (camelCase literal).
>   - Ngoại lệ: `POST /chat/threads/{id}/messages` body `{content_text}` (snake_case, không alias), `POST /proposals` body `{cover_letter, bid_amount, estimated_duration}` (snake_case).
> - **Verify từng endpoint**: mở `schemas/*.py` xem field có `alias=` không. Nếu CÓ → dùng camelCase. Nếu KHÔNG → dùng snake_case.
> - **Response body**: Luôn trả camelCase (do alias tự động khi serialize). Frontend TypeScript types nên đặt tên camelCase.

---

## 6. Pattern triển khai React Query (chuẩn)

### Query (đọc)
```ts
// hooks/use-jobs.ts
export function useJobs(filters: JobSearchQuery) {
  return useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => {
      // Lọc undefined và ép enum/string về string trước khi build query string.
      const qs = new URLSearchParams(
        Object.entries(filters)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => [k, String(v)])
      ).toString();
      return apiFetch<JobOut[]>(`/jobs?${qs}`);
    },
    staleTime: 30_000,
  });
}
```

### Mutation (ghi)
```ts
export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: JobCreate) =>
      apiFetch<JobOut>("/jobs", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    onError: (err: ApiError) => toast.error(err.message),
  });
}
```

### Trong page
```tsx
const { data: jobs, isLoading, error } = useJobs({ status: "OPEN", page: 1 });
if (isLoading) return <Skeleton />;
if (error) return <ErrorState message={(error as ApiError).message} />;
return <JobsTable rows={jobs ?? []} />;
```

---

## 7. Quy ước thay thế mock — checklist cho mỗi page

Khi sửa 1 page, làm theo thứ tự:
1. **Tìm tất cả `const ... = [...]` ở top file** → đó là mock.
2. **Tìm `<Field value="..."/>`** (CreateJob, Index) → đó là default value sẽ điền từ API.
3. **Tìm `alert("...sẽ kết nối backend Sprint N")`** → đó là placeholder mutation.
4. **Thay bằng:** `useQuery`/`useMutation` + loading state (Skeleton) + error state (Sonner toast + retry).
5. **Giữ nguyên layout/shadcn classes**, chỉ swap data source.
6. **Không xoá mock cũ ngay** — comment out + dòng `// TODO(api): remove after wiring` để dễ rollback.

---

## 8. Environment variables

### `frontend/.env` (thêm dòng)
```
VITE_API_BASE=/api/v1
```

### `frontend/.env.production` (tạo mới)
```
VITE_API_BASE=https://api.freelancerhub.vn/api/v1
```

### `vite.config.ts` (thêm proxy)
```ts
server: {
  proxy: {
    "/api/v1": { target: "http://localhost:8000", changeOrigin: true },
  },
  // host/port/fs giữ nguyên
}
```

---

## 9. Chạy local cùng lúc Frontend + Backend

```bash
# Terminal 1
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
# → mở http://localhost:8080
# → frontend gọi /api/v1/* → Vite proxy → http://localhost:8000/api/v1/*
```

Kiểm tra nhanh:
```bash
curl -s http://localhost:8080/api/v1/ | head   # → 404 từ FastAPI nhưng KHÔNG phải proxy error
curl -s http://localhost:8000/                # → {"message":"FreelancerHub AI Backend API đang hoạt động!"}
```

---

## 10. Mapping Mock ↔ Schema Backend (mẫu)

### `JobsList` (line 5-13)
```ts
const jobs = [
  ["Senior Business Analyst", "Business Analysis", "Đang tuyển", ...],
];
```
↔ Backend `JobListOut` (`schemas/jobs.py:77-91`):
```ts
{
  id: string; title: string; description: string;
  category_id: string | null; budget_min: number | null; budget_max: number | null;
  payment_type: "FIXED" | "HOURLY"; status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  created_at: string; skills: { id, name }[];
}
```
**Khác biệt cần xử lý:**
- "Phòng ban" → lấy từ `category_id` qua JOIN `categories` (cần endpoint `/categories`).
- "Đang tuyển/Sắp đóng/..." → map `status` qua `lib/format.ts::statusVi`.
- "Kênh đăng", "Ứng viên", "Hiệu suất", "Cập nhật" → **chưa có field trong backend**. Cần bổ sung schema `JobListOut` hoặc tạo endpoint riêng (`/jobs/{id}/stats`).
- "JD-2024-XX" → format `id.slice(0,8)` hoặc thêm field `code`.

### `Wallet` (line 6)
```ts
const projects = [
  ["Xây dựng Website E-commerce", "Nguyễn Minh Đức", "25.000.000 ₫", ...],
];
```
↔ Backend `/contracts/my` → list `ContractOut` (`schemas/contracts.py:76-90`):
```ts
{ id; job_id; freelancer_id; organization_id; total_amount; status; start_date; end_date; created_at; milestones[] }
```
- "Ký quỹ (₫)" → `total_amount` (**không phải `budget`** — `ContractOut` không có field `budget`).
- "Đã giải ngân" → `sum(milestones[status=PAID].amount)`.
- "Còn lại" → `total_amount - sum(milestones[status=PAID].amount)`.
- Job title & freelancer name → phải JOIN `Job.title` và `User.full_name` từ `job_id` / `freelancer_id` (cần endpoint bổ sung hoặc backend JOIN sẵn — `ContractOut` hiện KHÔNG có nested `job` / `freelancer`).

Tương tự cho `Wallet` (line 6-7, line 42):
- `GET /wallet` → `WalletOut` (`schemas/wallets.py:22-28`): `balance` ↔ "Số dư khả dụng", `locked_balance` ↔ "Ký quỹ đang giữ".
- `GET /wallet/transactions` → list `TransactionOut`: `transaction_type` enum (DEPOSIT / WITHDRAWAL / ESCROW_LOCK / ESCROW_RELEASE / PAYMENT_SENT / PAYMENT_RECEIVED).
- "Số dư sau GD" và "Mô tả chi tiết" không có sẵn — phải tự tính running total + JOIN `reference_id`.

### `Matching` (line 5-13)
↔ **CHƯA CÓ ENDPOINT**. Cần tự build trong backend (module AI matching) hoặc hardcode với fallback `useQuery({ enabled: false })`.

---

## 11. Công việc cần làm theo thứ tự (action items)

### Sprint 0 (BLOCKER — phải xong trước Sprint 1)
- [ ] **🚨 [Backend] Fix bảo mật CV endpoints** — thêm `Depends(get_current_user)` + lấy `freelancer_id` từ JWT cho cả 10 endpoint CV (`cv.py`). Bỏ default mock `freelancer_id="mock-freelancer-uuid-123"` ở `/cv/upload` và `/cv/documents/{id}/evidence`.

### Sprint 1 (Tuần 1)
- [x] Tạo `client/api/client.ts`, `queryKeys.ts`, `endpoints.ts`
- [x] Cập nhật `vite.config.ts` thêm proxy
- [x] Tạo `client/auth/{AuthContext,ProtectedRoute,tokenStorage}.ts(x)`
- [x] Tạo page `Login` (`/login`) + `Register` (chọn freelancer/business)
- [x] Mount `AuthProvider` trong `App.tsx`
- [x] Wire `TopBar` bell → `GET /notifications`
- [x] Wire `TopBar` avatar → `GET /organization/profile`
- [x] Wire `Sidebar` quota indicator → `GET /quotas/me`

### Sprint 2 (Tuần 2)
- [x] Wire `JobsList` → `GET /jobs` + `useJobs`
- [x] Wire `CreateJob` submit → `POST /jobs` + `useCreateJob`
- [x] Wire `Wallet` → `GET /wallet` + `GET /wallet/transactions`
- [x] Wire `Index` → `GET /jobs` + `GET /wallet` (dashboard stats)
- [x] Wire `JobsList` edit/delete → `PATCH/DELETE /jobs/{id}`

### Sprint 3 (Tuần 3)
- [x] Tạo `client/types/cv.ts` + `client/hooks/use-cv.ts` (10 CV endpoints + 2 trust-passport endpoints)
- [x] CV upload page `/freelancer/upload` (CV-01/02/03/04) — `pages/CVUpload.tsx`
- [x] Evidence page `/freelancer/verification/evidence` (CV-05) — `pages/Evidence.tsx` (route: `/freelancer/verification/evidence/:documentId`)
- [x] Trust Passport page `/freelancer/trust-passport` (CV-07) — `pages/TrustPassport.tsx`
- [x] Auto-refresh token (AuthContext) — `AuthContext.tsx:53-95` (decode exp, refresh 60s trước khi hết hạn)
- [x] Loading/Error skeletons dùng `components/ui/skeleton.tsx` — primitives sẵn (`Skeleton`), composed helpers ở `components/ui/skeleton-compositions.tsx` (`CardSkeleton`, `ListRowSkeleton`, `GridSkeleton`, `ListSkeleton`)

### Sprint 4 (Tuần 4)
- [x] Wire matching flow — `/jobs/{id}/candidates` (alias của `/jobs/{id}/proposals`) + job selector ở `Matching.tsx`
- [x] Wire shortlist flow — `POST/GET /shortlists` (explainable matching + candidate detail "Lưu shortlist")
- [x] Wire proposals → `/proposals/*` (`use-proposals.ts` + `ProposalDetail.tsx` với accept/reject/shortlist)
- [x] Wire disputes → `/disputes/*` + `/contracts/{id}/disputes` (Disputes.tsx + evidence submit UI)
- [x] Admin pages → `/admin/users`, `/admin/verifications` (AdminUsers + AdminVerifications với decision workflow)
- [x] Messages/chat → `/chat/*` (Messages.tsx với thread list + real-time message polling)
- [x] JWT role claim — thêm `role` vào JWT payload để frontend authorize admin UI

---

## 12. Rủi ro & câu hỏi mở

1. **Mock data chứa field không có trong schema** (vd: "Kênh đăng", "Hiệu suất", "JD code") → cần quyết định: mở rộng schema backend hay bỏ field khỏi UI?
2. **AI matching / AI processing** chưa có endpoint backend → mock screen sẽ giữ nguyên cho đến khi module AI hoàn thành.
3. **Auth UI** chưa có ở frontend → cần tạo page `/login` + `/register` (route mới, thêm vào `App.tsx`).
4. **CORS `*`** chỉ OK cho dev. Production phải giới hạn origin.
5. **`tsconfig.json strict: false`** (`tsconfig.json:19`) — khi gọi API dễ silent null bug. Đề xuất bật `strictNullChecks` ít nhất cho file mới.
6. **Một số endpoint admin yêu cầu `require_role('admin')`** (`admin_cv.py:227`, `admin_system.py:13,35,56`). Frontend cần ẩn các nút admin nếu `user.role !== "admin"`.
7. **Không có endpoint `/auth/me`** — cần decode JWT payload ở client để lấy `user_id` (xem §4.2 workaround). Nếu backend bổ sung endpoint thì đổi.
8. **`/freelancers/{id}` không có** trong backend (chỉ có `/freelancers/{id}/trust-passport`). Frontend cần tự build `/freelancers/{id}` profile hoặc dùng `/freelancer/profile` cho user hiện tại.
9. ~~Bảo mật CV endpoints~~ — **ĐÃ FIX** ✅ (2026-08-07): Thêm `Depends(get_current_user)` cho 9/10 CV endpoints. `freelancer_id` lấy từ JWT. `/freelancers/{id}/trust-passport` giữ public đúng spec.
10. ~~Mock auth helpers chưa dùng~~ — **ĐÃ FIX** ✅ (dead code, không ảnh hưởng).
11. ~~Bảo mật proposal accept/reject~~ — **ĐÃ FIX** ✅ (2026-08-07): Ownership check trong router `/accept` và `/reject` — verify `org.owner_user_id == current_user.id`.
12. ~~JWT secret default yếu~~ — **ĐÃ FIX** ✅ (2026-08-07): `security.py` bây giờ `raise ValueError` nếu `JWT_SECRET` < 32 chars. `.env` đã set secret ≥32.
13. ~~Refresh token không rotate~~ — **ĐÃ FIX** ✅ (2026-08-07): `refresh_access_token` giờ revoke old token + issue new refresh token mới.
14. ~~DisputeCreate thiếu severity~~ — **ĐÃ FIX** ✅ (2026-08-07): Thêm `severity: Optional[str] = "medium"` vào `DisputeCreate`.
15. ~~CreateThreadRequest schema ở sai chỗ~~ — Cosmetic, không ảnh hưởng. Có thể refactor sau.
16. **Email service chưa implement** (`services/auth.py:12-19` placeholder SMTP) — Production phải tích hợp SMTP/SendGrid. Hiện dev vẫn dùng được vì token trả trong response body.
17. **Sidebar items "Tin nhắn" + "Cài đặt" không có `route:`** trong `AppSidebar.tsx:32-33` (đã biết từ INDEX.md §2, chưa được fix). Click sẽ không navigate. **Frontend đã fix lần 8**: button disabled với opacity-40 + tooltip "Tính năng đang phát triển (Sprint 4)" (`AppSidebar.tsx:78-90`). Sprint 4 sẽ thêm route cho 2 items này.
18. **Model class name typo: `FrelancerProfile`** (`models/freelancers.py:6`) — thiếu chữ 'e' trong "Freelancer". Schema (`schemas/profiles.py`) dùng đúng `FreelancerProfileOut`, `FreelancerProfileUpdate`. Nhưng Model dùng `FrelancerProfile` (không có 'e'). **Đây là typo nghiêm trọng**: tất cả 4 routers + 4 models + 1 service đều reference đúng tên typo `FrelancerProfile`. Nếu đổi tên Model thành `FreelancerProfile` (chính tả đúng), phải update 9+ files. **Backend nên fix**: đổi `models/freelancers.py:6` class name thành `FreelancerProfile`, sau đó `grep -r 'FrelancerProfile' backend/app/` để update tất cả references (9 locations: `routers/profiles.py:8`, `routers/disputes.py:11`, `routers/contracts.py:13`, `routers/proposals.py:8`, `models/users.py:87`, `models/contracts.py:52`, `models/proposals.py:31`, `models/portfolio_items.py:20`, `models/freelancer_skills.py:14`).
19. **`availability_status` là String không phải Enum** (`models/freelancers.py:32`): model dùng `Column(String(30))` thay vì `Enum(...)` cho trường availability_status ('available', 'limited', 'unavailable'). Backend không enforce valid values → frontend/ghi vào 'AVAILABLE', 'invalid_value', etc. đều được. **Backend nên fix**: thêm `AvailabilityStatus(str, enum.Enum)` với 3 giá trị, dùng `Enum` column type thay vì String.
20. **🚨 Bảo mật: `.env` không có `.gitignore`** (`backend/.env`): File chứa REAL API keys (`GROQ_API_KEY`, `OPENROUTER_API_KEY`) — không nên commit. Backend hiện không có `.gitignore`. **Tạo file `backend/.gitignore`** với nội dung: `*.pyc __pycache__/ .env .venv/ *.db *.db-journal node_modules/ dist/ build/ *.log`. Frontend `.env` cũng chưa có `VITE_API_BASE` → **đã thêm round 10** (`.env:7`).

---

## 13. Action plan — Hướng dẫn fix backend bugs

Phần này cung cấp **code mẫu cụ thể** (Python) để dev team sửa từng bug backend đã flag ở §12. Mỗi fix có file:line tham chiếu, đoạn code đề xuất, và cách test.

### 13.1 Fix #9 — Auth cho 10 CV endpoints (CRITICAL)

**Vấn đề:** Tất cả endpoint `/cv/*` và `/freelancer/trust-passport`, `/freelancers/{id}/trust-passport` đều **không có `Depends(get_current_user)`** và nhận `freelancer_id` từ form body thay vì từ JWT.

**File cần sửa:** `backend/app/routers/cv.py`

**Cách fix (refactor từng endpoint):**

```python
# ❌ Hiện tại (cv.py:70)
@router.post("/upload")
def upload_cv(
    request: Request,
    file: UploadFile = File(...),
    freelancer_id: str = Form("mock-freelancer-uuid-123"),  # ← INSECURE
    db: Session = Depends(get_db)
):
    ...

# ✅ Sau khi fix
@router.post("/upload")
def upload_cv(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),  # ← Lấy user từ JWT
    db: Session = Depends(get_db)
):
    # Lấy freelancer_id từ JWT, KHÔNG từ form
    profile = db.query(FrelancerProfile).filter(
        FrelancerProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=403, detail="User không có freelancer profile")
    freelancer_id = profile.user_id
    ...
```

**Áp dụng cho 10 endpoint:** `/cv/upload`, `/cv/documents/{id}/parse`, `/cv/documents/{id}/result`, `/cv/documents/{id}/evidence`, `/cv/documents/{id}/fields/{fid}/confirm`, `/cv/documents/{id}/fields/{fid}/edit`, `/cv/documents/{id}/fields/{fid}/reject`, `/cv/documents/{id}/submit`, `/cv/documents/{id}/finalize`, `/freelancer/trust-passport`, `/freelancers/{id}/trust-passport`.

**Verify:** `curl -X POST http://localhost:8000/api/v1/cv/upload` (không có `Authorization` header) → phải trả 401 Unauthorized.

### 13.2 Fix #11 — Ownership check cho `/proposals/{id}/accept|reject` ✅ ĐÃ FIX

**Vấn đề:** Service `accept_proposal` và `reject_proposal` không verify current user là Organization owner của Job.

**File cần sửa:** `backend/app/services/proposals.py`

**Cách fix:**

```python
# ❌ Hiện tại (services/proposals.py:60-81)
def accept_proposal(db: Session, proposal_id: str) -> Optional[Proposal]:
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal: return None
    job = db.query(Job).filter(Job.id == proposal.job_id).first()
    if job: job.status = JobStatus.IN_PROGRESS
    ...

# ✅ Sau khi fix
def accept_proposal(
    db: Session,
    proposal_id: str,
    current_user_id: str  # ← THÊM
) -> Optional[Proposal]:
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal: return None

    job = db.query(Job).filter(Job.id == proposal.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # CHECK OWNERSHIP
    organization = db.query(Organization).filter(
        Organization.id == job.organization_id
    ).first()
    if not organization or organization.owner_user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền accept proposal này")

    job.status = JobStatus.IN_PROGRESS
    db.query(Proposal).filter(Proposal.job_id == proposal.job_id).update(
        {Proposal.status: ProposalStatus.REJECTED}
    )
    proposal.status = ProposalStatus.ACCEPTED
    db.commit()
    return proposal
```

**Update router** (`routers/proposals.py:106-117`):

```python
@router.post('/proposals/{proposal_id}/accept')
def accept_proposal(
    request: Request,
    proposal_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    proposal = proposal_service.accept_proposal(db, proposal_id, current_user.id)  # ← truyền user.id
    if not proposal:
        raise HTTPException(status_code=404, detail='Proposal không tìm thấy')
    ...
```

Tương tự cho `/reject` (`services/proposals.py:84-90`).

**Verify:** Login user A (Org owner) → POST `/proposals/{other_org_proposal_id}/accept` → phải trả 403.

### 13.3 Fix #12 — JWT secret phải ≥32 chars ✅ ĐÃ FIX

**File cần sửa:** `backend/app/core/security.py`

**Cách fix:**

```python
# ❌ Hiện tại (security.py:8)
JWT_SECRET = os.environ.get('JWT_SECRET', 'changeme1234567890')

# ✅ Sau khi fix — refuse to start nếu secret quá yếu
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET or len(JWT_SECRET.encode('utf-8')) < 32:
    raise ValueError(
        "JWT_SECRET env var is required and must be ≥32 characters. "
        "Generate one with: export JWT_SECRET=$(openssl rand -hex 32)"
    )
```

**Setup cho dev:**
```bash
export JWT_SECRET=$(openssl rand -hex 32)
echo $JWT_SECRET > .env.jwt_secret  # gitignore
```

**Production:** Set trên hosting platform (vd: Vercel/Render env vars).

### 13.4 Fix #14 — `DisputeCreate` schema thiếu `severity` ✅ ĐÃ FIX

**Vấn đề:** Model có `severity NOT NULL` nhưng schema `DisputeCreate` thiếu field này → insert fail.

**File cần sửa:** `backend/app/schemas/disputes.py`

**Cách fix:**

```python
# ❌ Hiện tại (schemas/disputes.py:15-18)
class DisputeCreate(BaseModel):
    contract_id: str
    milestone_id: Optional[str] = None
    reason: str

# ✅ Sau khi fix
class DisputeSeverityEnum(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    CRITICAL = 'critical'

class DisputeCreate(BaseModel):
    contract_id: str
    milestone_id: Optional[str] = None
    reason_code: str = 'other'  # ← optional, default 'other' (lowercase per model)
    severity: DisputeSeverityEnum = DisputeSeverityEnum.MEDIUM  # ← THÊM, default 'medium'
```

**Verify:** `curl -X POST /disputes -d '{"contract_id": "x", "reason": "test"}'` → phải accept (default medium severity).

### 13.5 Fix (Round 6) — `POST /contracts` phải dùng JSON body

**Vấn đề:** Endpoint nhận `job_id, freelancer_id, total_amount, proposal_id` làm query params (vì không có Pydantic schema), inconsistent với mọi endpoint khác.

**File cần sửa:** `backend/app/schemas/contracts.py` + `backend/app/routers/contracts.py:83-113`

**Cách fix:**

```python
# Thêm vào schemas/contracts.py:
class ContractCreate(BaseModel):
    job_id: str
    freelancer_id: str
    total_amount: float
    proposal_id: Optional[str] = None

# Update router contracts.py:83-92:
@router.post('/contracts')
def create_contract(
    request: Request,
    payload: ContractCreate,  # ← JSON body thay vì query params
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check Organization ownership (giống POST /jobs)
    organization = db.query(Organization).filter(
        Organization.owner_user_id == current_user.id
    ).first()
    if not organization:
        raise HTTPException(status_code=403, detail='Bạn không có tổ chức')

    contract = contract_service.create_contract(
        db=db,
        organization_id=organization.id,
        job_id=payload.job_id,
        freelancer_id=payload.freelancer_id,
        total_amount=payload.total_amount,
        proposal_id=payload.proposal_id
    )
    ...
```

**Verify:** `curl -X POST /contracts -H "Content-Type: application/json" -d '{"job_id":"x","freelancer_id":"y","total_amount":1000}'` → 201 Created.

### 13.6 Fix #13 — Refresh token rotation ✅ ĐÃ FIX

**Vấn đề:** Refresh token không được rotate khi `/auth/refresh`.

**File cần sửa:** `backend/app/services/auth.py:96-100`

**Cách fix (optional):**

```python
def refresh_access_token(db: Session, refresh_token: str):
    # ... existing validation ...
    token_record = db.query(RefreshToken).filter(...).first()
    if not token_record or token_record.expires_at < datetime.now(timezone.utc):
        raise HTTPException(...)

    # REVOKE old refresh token
    token_record.revoked = True
    token_record.used_at = datetime.now(timezone.utc)

    # ISSUE new tokens
    new_access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id)

    new_token_hash = hash_token(new_refresh_token)
    db.add(RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token_hash=new_token_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    ))
    db.commit()

    return {
        'access_token': new_access_token,
        'refresh_token': new_refresh_token,  # ← THÊM
        'token_type': 'bearer'
    }
```

**Frontend cần update:** `useAuth.refreshToken()` phải lưu `new_refresh_token` (không chỉ `access_token`).

### 13.7 Fix #15 (cosmetic) — Move `CreateThreadRequest` to schemas/

**File cần tạo:** `backend/app/schemas/communications.py`
**File cần sửa:** `backend/app/routers/communications.py:17-18` (xóa class, thay bằng `from app.schemas.communications import CreateThreadRequest`)

**Cách fix:**

```python
# Tạo mới app/schemas/communications.py:
from pydantic import BaseModel

class CreateThreadRequest(BaseModel):
    participant_id: str

# Sửa app/routers/communications.py:
# Xóa lines 17-18 (class CreateThreadRequest)
# Thêm vào imports:
from app.schemas.communications import CreateThreadRequest
```

### 13.8 Fix #16 — Email service thật

**File cần sửa:** `backend/app/services/auth.py:12-19` + tạo mới `backend/app/services/email.py`

**Cách fix (skeleton):**

```python
# Tạo mới app/services/email.py:
import smtplib
from email.mime.text import MIMEText
import os

def send_email(to: str, subject: str, body: str):
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_pass = os.environ.get('SMTP_PASS')

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = smtp_user
    msg['To'] = to

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)

# Update app/services/auth.py:12-19:
from app.services.email import send_email

def _send_password_reset_email(user_email: str, reset_token: str):
    body = f"Click link to reset: https://freelancerhub.vn/reset-password?token={reset_token}"
    send_email(user_email, "Reset your password", body)
```

**Env vars cần thêm:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.

### 13.9 Fix #10 (cleanup) — Xóa mock auth helpers

**File cần sửa:** `backend/app/core/auth.py`

**Cách fix:**

```bash
# Sau khi đã chắc chắn không router nào dùng:
rm backend/app/core/auth.py
```

**Verify trước khi xóa:**
```bash
grep -r "from app.core.auth import\|admin_required\|freelancer_required\|get_current_user_optional" backend/app/
# Expected output: chỉ thấy 'app/core/auth.py' ở import line, không có usage
```

---

### Checklist cho backend team

| # | Priority | Fix | ETA |
|---|---|---|---|
| 1 | ✅ FIXED | ~~#9 Auth cho 10 CV endpoints~~ | Sprint 0 ✅ DONE |
| 2 | ✅ FIXED | ~~#11 Ownership check accept/reject proposal~~ | Sprint 0 ✅ DONE |
| 3 | ✅ FIXED | ~~#12 JWT secret ≥32 chars~~ | Sprint 0 ✅ DONE |
| 4 | ✅ FIXED | ~~#14 DisputeCreate severity~~ | Sprint 1 ✅ DONE |
| 5 | 🟠 HIGH | POST /contracts JSON body | Sprint 1 |
| 6 | ✅ FIXED | ~~#13 Refresh token rotation~~ | Sprint 2 ✅ DONE |
| 7 | 🟢 LOW | #15 Move schema to correct file | Sprint 2 |
| 8 | 🟡 MEDIUM | #16 Real email service | Sprint 3 |
| 9 | 🟢 LOW | #10 Xóa dead code auth.py | Sprint 4 |

**Tổng thời gian ước tính:** 4 sprints (4 tuần) nếu làm full-time. Sprint 0 (3 critical) chỉ tốn ~6 giờ dev.

---

---

*Khi update file này: thay đổi mapping table, thêm endpoint mới từ backend, hoặc thêm page mới → sửa đồng thời `INDEX.md`.*