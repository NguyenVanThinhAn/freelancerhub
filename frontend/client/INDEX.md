# INDEX.md — Frontend Navigation & Debug Reference

> **Mục đích:** Tra cứu nhanh khi debug navigation, route, sidebar, flow và cross-check với DOCS.
> **Ngày tạo:** 07/08/2026 01:57 (UTC+7)
> **Cập nhật lần 12:** 07/08/2026 19:18 (UTC+7) — Thêm §16 API Debug Index, §17 Rule Files, debug logging client.ts + server/index.ts.
> **Phạm vi:** `frontend/client/**` (16 page + 3 layout + 1 stepper + 6 hooks + 3 api files + assets)
> **Liên quan:** `INTEGRATION.md` — kế hoạch nối Frontend ↔ Backend (FastAPI), phân theo Sprint.

---

## 1. Bảng tra cứu nhanh — Page ↔ Route ↔ Sidebar ↔ Active

| # | File page | Route | Có trong sidebar? | Sidebar label | `active` trong BusinessShell | Default `active` map (BusinessShell.tsx:12-20) |
|---:|---|---|:---:|---|---|---|
| 1 | `pages/Login.tsx` | `/login` | ❌ | — | — | **Public** |
| 2 | `pages/Index.tsx` | `/` | ✅ | Tổng quan | dynamic | **Protected** |
| 2 | `pages/CreateJob.tsx` | `/create-job` | ✅ | Tạo JD | "Tạo JD" | **Protected** · wire useCreateJob |
| 3 | `pages/AIProcessing.tsx` | `/ai-processing` | ❌ | — | "Tạo JD" | **Protected** |
| 4 | `pages/GeneratedJD.tsx` | `/generated-jd` | ❌ | — | "Tạo JD" | **Protected** |
| 5 | `pages/ContentInput.tsx` | `/content-input` | ❌ | — | "Tin tuyển dụng" ⚠️ | **Protected** |
| 6 | `pages/ContentResult.tsx` | `/content-result` | ❌ | — | — | **Protected** |
| 7 | `pages/JobsList.tsx` | `/jobs` | ✅ | Tin tuyển dụng | "Tin tuyển dụng" | **Protected** · wire useJobs |
| 8 | `pages/Matching.tsx` | `/matching` | ✅ | AI Matching | "AI Matching" | **Protected** |
| 9 | `pages/CandidateDetail.tsx` | `/candidate-detail` | ❌ | — | "AI Matching" | **Protected** |
| 10 | `pages/ExplainableMatching.tsx` | `/explainable-matching` | ✅ | Explainable AI | "Explainable AI" | **Protected** |
| 11 | `pages/InterviewScheduler.tsx` | `/interview-scheduler` | ✅ | Phỏng vấn | "Phỏng vấn" | **Protected** |
| 12 | `pages/ContractMilestone.tsx` | `/contract-milestone` | ✅ | Hợp đồng | "Hợp đồng" | **Protected** |
| 13 | `pages/ProjectWorkspace.tsx` | `/project-workspace` | ❌ | — | "Hợp đồng" | **Protected** |
| 14 | `pages/Wallet.tsx` | `/wallet` | ✅ | Thanh toán | "Thanh toán" | **Protected** · wire useWallet |
| 15 | `pages/NotFound.tsx` | `*` | ❌ | — | — | n/a |

**Tổng:** 16 page (15 + Login). Tất cả (trừ `/login`) là **Protected** → `<ProtectedRoute>`.
**Sidebar có route hợp lệ:** 9/9 (đều có `route:` trong `AppSidebar.tsx:24-30`, mỗi cái đều khớp 1 route thật trong App.tsx).

---

## 2. Sidebar — nguồn dữ liệu (`layout/AppSidebar.tsx:23-31`)

```ts
const navItems: NavItem[] = [
  { label: "Tổng quan",       icon: LayoutDashboard, route: "/" },                     // line 24
  { label: "Tạo JD",          icon: FileText,        route: "/create-job" },           // line 25
  { label: "AI Matching",     icon: UsersRound,      route: "/matching" },             // line 26
  { label: "Explainable AI",  icon: Sparkles,        route: "/explainable-matching" },// line 27
  { label: "Tin tuyển dụng",  icon: BriefcaseBusiness,route: "/jobs" },                // line 28
  { label: "Phỏng vấn",       icon: CalendarDays,    route: "/interview-scheduler" },  // line 29
  { label: "Hợp đồng",        icon: FileText,        route: "/contract-milestone" },  // line 30
  { label: "Thanh toán",      icon: WalletCards,     route: "/wallet" },               // line 31
];
```

**Cơ chế click → navigate:** `AppSidebar.tsx:80-86` gọi `onSelect?.({ label, icon, route })` → `BusinessShell.handleSelect` (`BusinessShell.tsx:30-33`).

→ **"Explainable AI"** không có trong `DEFAULT_ROUTE` (chỉ có 7 entry) nhưng có `item.route` → dùng `item.route` thẳng. OK.

**Auth:** Tất cả route (trừ `/login`) được bọc bởi `<ProtectedRoute>` trong `App.tsx`. Nếu chưa login → redirect `/login`.

---

## 3. Routes — khai báo (`App.tsx:34-49`)

| Line | Path | Element | Comment |
|---:|---|---|---|
| 34 | `/` | Index | |
| 35 | `/create-job` | CreateJob | |
| 36 | `/ai-processing` | AIProcessing | |
| 37 | `/generated-jd` | GeneratedJD | |
| 38 | `/content-input` | ContentInput | |
| 39 | `/jobs` | JobsList | |
| 40 | `/matching` | Matching | |
| 41 | `/candidate-detail` | CandidateDetail | |
| 42 | `/explainable-matching` | ExplainableMatching | |
| 43 | `/interview-scheduler` | InterviewScheduler | |
| 44 | `/contract-milestone` | ContractMilestone | |
| 45 | `/project-workspace` | ProjectWorkspace | |
| 46 | `/wallet` | Wallet | |
| 47 | `/content-result` | ContentResult | |
| 49 | `*` | NotFound | catch-all — **phải đặt cuối** ✓ |

**Index `active` dynamic:** xem `pages/Index.tsx:50` — `<BusinessShell active={active}>` với `active` được tính từ logic internal của Index (ngoài sidebar).

---

## 4. Internal `navigate()` calls (kiểm tra mọi link internal)

| # | File (line) | Target | Tồn tại? |
|---:|---|---|:---:|
| 1 | `ContentResult.tsx:13` | `/content-input` | ✅ |
| 2 | `ContentResult.tsx:61` | `/content-input` | ✅ |
| 3 | `ContentInput.tsx:245` | `/content-result` | ✅ |
| 4 | `GeneratedJD.tsx:103` | `/create-job` | ✅ |
| 5 | `CreateJob.tsx:222` | `/ai-processing` | ✅ |
| 6 | `AIProcessing.tsx:113` | `/generated-jd` | ✅ |
| 7 | `AIProcessing.tsx:119` | `/create-job` | ✅ |
| 8 | `InterviewScheduler.tsx:11` | `/candidate-detail` | ✅ |
| 9 | `ExplainableMatching.tsx:12` | `/candidate-detail` | ✅ |
| 10 | `CandidateDetail.tsx:13` | `/matching` | ✅ |
| 11 | `JobsList.tsx:22` | `/create-job` | ✅ |

**Quy tắc:** Mọi `navigate()` đều absolute path và target đều có route. Không có relative path.

---

## 5. Flow đầy đủ (chuỗi click mặc định)

### Job Creation Flow
```
JobsList → CreateJob → AIProcessing → GeneratedJD → (CreateJob | GeneratedJD redirect jobs)
                                    ↘ (back)
```

### Content Generation Flow
```
JobsList → ContentInput → ContentResult → (ContentInput back)
        ↑ (NOT từ CreateJob — không có link)
```

### Matching Flow
```
Matching → CandidateDetail → InterviewScheduler → (CandidateDetail back)
                                       ↘ ExplainableMatching (sub-route of AI Matching)
```

### Contract Flow
```
ContractMilestone → ProjectWorkspace (sub-flow, same "Hợp đồng" sidebar)
```

---

## 6. Assets — khớp import ↔ file thực

| Import `@/assets/...` từ | Tên file thực sự | Kích thước | Resolved URL |
|---|---|---:|---|
| `AppSidebar.tsx:13` | `nâng-cấp-trải-nghiệm-tuyển-dụng-với-ai.png` | 2466×1280 | `/client/assets/nâng-cấp-trải-nghiệm-tuyển-dụng-với-ai.png?import` |
| `AppSidebar.tsx:14` | `icon_w.png` | 2048×2048 | `/client/assets/icon_w.png?import` |
| `CreateJob.tsx:6` | `robot-ai.png` | 1024×881 | `/client/assets/robot-ai.png?import` |
| `AIProcessing.tsx:5` | `jd-2.png` | 1984×2172 | `/client/assets/jd-2.png?import` |
| `Index.tsx:17` | `nâng-cấp-trải-ngiệm-tuyển-dụng-với-ai.png` | (giống trên) | (giống trên) |
| `TopBar.tsx:2` | `icon_w.png` | (giống trên) | (giống trên) |

**Asset thừa không dùng:**
- `assets/jd.png` (1024×832) — không có import nào.

→ **Verify đã chạy:** `curl /client/assets/icon_w.png` → 200 image/png 1.3MB (OK), `?import` → 200 text/javascript (module). Assets serve đúng. Sai lầm quadruple-check trước là test URL sai (`/src/assets/`), file thực sự tồn tại và serve đúng.

---

## 7. DOCS canonical route CV-01 → CV-08 (cross-check)

| Code | Screen | Canonical Route | Đã implement? | Sprint |
|---|---|---|:---:|---|
| CV-01 | Upload CV | `/freelancer/upload` | ❌ | Sprint 1 |
| CV-02 | AI Processing | `/freelancer/upload` (internal) | n/a | Sprint 2 |
| CV-03 | Parsed Result | `/freelancer/upload` (internal) | n/a | Sprint 2 |
| CV-04 | Missing Info | `/freelancer/upload` (internal) | n/a | Sprint 2 |
| CV-05 | Evidence Upload | `/freelancer/verification/evidence` | ❌ | Sprint 3 |
| CV-06 | Verification Status | `/freelancer/verification/:caseId` | ❌ | Sprint 4 |
| CV-07 | Trust Passport | `/freelancer/trust-passport` | ❌ | Sprint 3 |
| CV-08 | Admin Review | `/admin/verifications/:caseId` | ❌ | Sprint 4 |

**Nguồn:** `DOCS/MASTER-DOC.md` Phần R (Screen Change List) + `DOCS/MERGED-DOCUMENT.md` Phần R.

→ 5 page CV-01/05/06/07/08 thuộc Sprint 1-4, **không phải bug hiện tại**. Project đang ở Sprint 1-2 (foundation + profile/communication), CV module chưa triển khai.

---

## 8. Common debugging commands

```bash
# ── API Debugging ──────────────────────────────────────────────────────────────

# Start backend (FastAPI on :8000)
cd backend && uvicorn main:app --reload

# Check backend is running
curl http://localhost:8000/docs
lsof -i :8000

# ── Vite Terminal ──────────────────────────────────────────────────────────────

# Watch vite log (shows proxy errors = backend not running)
tail -f /Users/admin/.cursor/projects/Users-admin-Downloads-freelancerhub/terminals/353360.txt

# ── Browser Console (enable API debug) ─────────────────────────────────────────
# In DevTools console:
localStorage.setItem("apiDebug", "1")  // enable API call logging
localStorage.removeItem("apiDebug")    // disable

# ── Manual API testing ──────────────────────────────────────────────────────────

# Test proxy (should get 502 JSON if backend is down)
curl http://localhost:8080/api/v1/wallet

# Test local Express endpoints
curl http://localhost:8080/api/ping

# ── General ────────────────────────────────────────────────────────────────────

# List all routes (compiled)
curl -s http://localhost:8080/client/App.tsx | grep -oE 'path: "[^"]+"' | sort -u

# Test asset
curl -sI 'http://localhost:8080/client/assets/icon_w.png?import'

# Find @/assets imports
grep -rn "@/assets" frontend/client/

# Check navigate calls
grep -rn "navigate(" frontend/client/pages/

# Check BusinessShell active args
grep -n "active=" frontend/client/pages/*.tsx

# Check duplicate routes (compiled)
curl -s http://localhost:8080/client/App.tsx | grep -oE 'path: "[^"]+"' | sort | uniq -d

# Project docs
ls -1 frontend/AGENTS.md DOCS/*.md process/*.md tasks/**/*.md | head
```

---

## 9. Common 404 / error patterns

| Pattern | Nguyên nhân thường gặp |
|---|---|
| `404 Error: User attempted to access non-existent route` | User paste URL sai vào thanh địa chỉ (không có trong code) |
| `Failed to reload ... importing non-existent modules` | HMR transient — file được save nhiều lần liên tiếp |
| `<img>` broken | File `@/assets/*.png` không tồn tại — verify trước khi sửa (xem §6) |
| Asset URL trả 200 HTML | Test nhầm URL `/src/assets/` — đúng URL là `/client/assets/` |
| Sidebar click không navigate | `item.route` không có trong `DEFAULT_ROUTE` và cũng không có trong `navItems` → **đã fix round 8**: button bị `disabled` với `opacity-40` + `title="Tính năng đang phát triển (Sprint 4)"` (`AppSidebar.tsx:78-91`). Sprint 4 sẽ thêm route thật cho 2 items này. |

---

## 10. Per-page index (lần 7)

Mỗi page có: route, breadcrumb, button handlers, dead-UI, mock data, edge cases.

| Page | File | Route | Has navigate? | Dead buttons (no onClick) | Internal state |
|---|---|---|:---:|---|---|
| **Index** | `Index.tsx` | `/` | ✅ → /create-job (2 buttons) | `Xem tất cả`, `Xem chi tiết`, `Xem báo cáo`, `Mở trên Marketplace` | `active="Tổng quan"` |
| **CreateJob** | `CreateJob.tsx` | `/create-job` | ✅ → /ai-processing | `Lưu bản nháp`, `Chỉnh sửa` | `selectedSkills`, `selectedTools` |
| **AIProcessing** | `AIProcessing.tsx` | `/ai-processing` | ✅ → /generated-jd, /create-job | `Chỉnh sửa`, `Xem chi tiết yêu cầu` | (none) |
| **GeneratedJD** | `GeneratedJD.tsx` | `/generated-jd` | ✅ → /create-job | `Đăng tin tuyển dụng`, `Lưu bản nháp`, `Tạo lại bằng AI` (header), AI recommendations button, `Xem chi tiết preview` | `editing: string | null` |
| **ContentInput** | `ContentInput.tsx` | `/content-input` | ✅ → /content-result | Channel/tone/length buttons (visual only), `Lưu bản nháp`, `Chỉnh sửa` | (none) |
| **ContentResult** | `ContentResult.tsx` | `/content-result` | ✅ → /content-input (×2) | `Lưu & duyệt` | `copied: boolean` + `socialPost` const + `handleCopy` (navigator.clipboard.writeText) |
| **JobsList** | `JobsList.tsx` | `/jobs` | ✅ → /create-job | Search filter, dropdown, pagination, `Xuất Excel`, `Xem báo cáo`, `Xem chi tiết` | (none — mock data) |
| **Matching** | `Matching.tsx` | `/matching` | ✅ eye icon → /candidate-detail (FIXED lần 13, trước đó chỉ i===0) | `MessageCircle`, `MoreHorizontal` per row | (none — 7 mock candidates) |
| **CandidateDetail** | `CandidateDetail.tsx` | `/candidate-detail` | ✅ → /interview-scheduler, /explainable-matching, /matching | `Lưu shortlist`, `Nhắn tin` | (none — hardcoded Nguyễn Thu Hà) |
| **ExplainableMatching** | `ExplainableMatching.tsx` | `/explainable-matching` | ✅ → /candidate-detail | `Mời phỏng vấn`, `Lưu shortlist` (in ComparisonHeader) | `active="Explainable AI"` (FIXED lần 5) |
| **InterviewScheduler** | `InterviewScheduler.tsx` | `/interview-scheduler` | ✅ → /candidate-detail (×3) | interview type/day/platform buttons, `Lưu nháp`, `Gửi lời mời`, `Chỉnh sửa`, `Xem thêm khung giờ` | `time: string` (FIXED lần 13: time→endTime cho 4 slots thay vì chỉ 14:00) |
| **ContractMilestone** | `ContractMilestone.tsx` | `/contract-milestone` | ❌ wizard 4-step không có navigation (DEFERRED — cần 3 section content) | `Quay lại`, `Lưu nháp`, `Tạo hợp đồng`, `Thêm milestone`, edit/trash, `Tìm hiểu thêm`, `Nạp tiền` | (none) |
| **ProjectWorkspace** | `ProjectWorkspace.tsx` | `/project-workspace` | ❌ | `Mở trên Marketplace`, `Tiếp tục làm việc`, `Xem tất cả` (multiple), `Xem chi tiết milestone`, `Xem báo cáo` | Tabs không có state |
| **Wallet** | `Wallet.tsx` | `/wallet` | ❌ | `Rút tiền`, `Nạp tiền` (multiple), `Xem chi tiết`, `Xem tất cả`, `Xem báo cáo`, `Quản lý`, `Thêm tài khoản` | Tabs không có state |
| **NotFound** | `NotFound.tsx` | `*` | `<a href="/">` (full reload) | — | (none) |

### Bug navigation đã fix (qua 13 lần check)

| # | Bug | File | Fix |
|---:|---|---|---|
| 1 | `active="AI Matching"` khi đang ở ExplainableMatching | `ExplainableMatching.tsx:12` | → `active="Explainable AI"` (lần 5) |
| 2 | 2 CTA button không có onClick | `Index.tsx:57,158` | thêm `onClick={() => navigate("/create-job")}` (lần 6) |
| 3 | Eye icon chỉ navigate i===0 | `Matching.tsx:22` | → `() => navigate("/candidate-detail")` cho mọi i (lần 13) |
| 4 | "Sao chép" button không thực sự copy | `ContentResult.tsx:72` | extract `socialPost` const + `handleCopy` dùng `navigator.clipboard.writeText` (lần 13) |
| 5 | `time === "14:00" ? "15:00" : "15:30"` time logic buggy | `InterviewScheduler.tsx` | 4-arm ternary map cho 09:00/10:30/14:00/15:30 (lần 13) |

### Bug đã ghi nhận (chưa fix — scope lớn)

| # | Bug | Action | Sprint |
|---:|---|---|---|
| 6 | `ContractMilestone.tsx` wizard 4-step không có navigation step 1/3/4 | Cần thêm 3 section content (~200 dòng) | Sprint 4 |
| 7 | `ContentInput.tsx` không link từ JobsList/CreateJob | Thêm nav button | Sprint 3 |
| 8 | 50+ shadcn components unused | Có thể cleanup (tree-shaking loại bỏ) | Maintenance |

---

## 11. Components/Hooks/Lib index (lần 11)

### Components
- `components/JobStepper.tsx` — Multi-step indicator. Default: 3 steps "Nhập nhu cầu / AI tạo JD / Chỉnh sửa & đăng". Tone: `indigo` / `violet`. Used by: CreateJob, AIProcessing, GeneratedJD, ContentInput, ContentResult.

### Hooks
- `hooks/use-mobile.tsx` — Detect mobile < 768px. **Unused in app code** (chỉ shadcn sidebar dùng).
- `hooks/use-toast.ts` — shadcn toast hook. **Unused in app code**.
- `hooks/use-jobs.ts` — **WIRED** — useJobs (stats + recent jobs table), useCategories, useUpdateJob, useDeleteJob. Used by: Index, JobsList.
- `hooks/use-wallet.ts` — **WIRED** — useWallet, useTransactions, useContractProjects, useDeposit, useWithdraw. Used by: Index, Wallet.
- `hooks/use-notifications.ts` — **WIRED** — useNotifications, useMarkNotificationRead. Used by: TopBar.
- `hooks/use-organization.ts` — **WIRED** — useOrganizationProfile. Used by: Settings.
- `hooks/use-proposals.ts` — **NEW** — useMyProposals, useJobProposals, useProposal, useCreateProposal, useAcceptProposal, useRejectProposal, useWithdrawProposal. Used by: Matching.
- `hooks/use-contracts.ts` — **NEW** — useMyContracts, useContract, useCreateContract, useCreateMilestone, useSubmitMilestone, useApproveDeliverable, useRejectDeliverable, useCompleteContract. Used by: ContractMilestone.
- `hooks/use-wallet.ts` — **WIRED** — useWallet, useTransactions, useContractProjects, useDeposit, useWithdraw. Used by: Index, Wallet.
- `hooks/use-notifications.ts` — **WIRED** — useNotifications, useMarkNotificationRead. Used by: TopBar.
- `hooks/use-organization.ts` — **WIRED** — useOrganizationProfile. Used by: Settings.

### API Layer (NEW)
- `api/client.ts` — `apiFetch`, `apiGet`, `apiPost`, `apiPatch`, `apiDelete`, `ApiError`, token management.
- `api/endpoints.ts` — tất cả 71 endpoint constants.
- `api/queryKeys.ts` — React Query key constants.
- `auth/AuthContext.tsx` — `useAuth()`, `AuthProvider`, login/logout.
- `auth/ProtectedRoute.tsx` — redirect to /login if not authenticated.
- `auth/tokenStorage.ts` — `decodeJwtSub`.
- `types/api.ts` — `BaseResponse<T>`, `ApiError`.

---

## 12. Layout internals (lần 9)

### `BusinessShell` (`layout/BusinessShell.tsx`)
- Compose `AppSidebar` + `TopBar` + main content.
- State `sidebarOpen` cho mobile drawer.
- `handleSelect`: `item.route ?? DEFAULT_ROUTE[item.label]`.
- `active: string` prop compares with `NavItem.label` để highlight.

### `AppSidebar` (`layout/AppSidebar.tsx`)
- 10 nav items (8 routes + 2 dead: "Tin nhắn"/"Cài đặt").
- Show: desktop `lg:static lg:translate-x-0`, mobile drawer (`fixed inset-y-0`, overlay).
- "Tin nhắn" có badge "5" (static).
- "Khám phá tính năng AI" footer button — dead.

### `TopBar` (`layout/TopBar.tsx`)
- Search input + `⌘ K` indicator (no keybinding handler).
- `Bell` với badge "3" (static, no dropdown).
- User avatar `Công ty ABC / Enterprise` (no dropdown).

### UI shadcn usage map
- App code dùng **3/50 shadcn components**: `sonner`, `toaster`, `tooltip` (chỉ trong App.tsx).
- 47 shadcn components (`button`, `card`, `input`, `dialog`, etc.) **không dùng** — pure custom Tailwind.
- Tree-shaking sẽ loại bỏ unused khi production build.

---

## 13. Backend / API / Shared (lần 12)

### Server (`server/index.ts`)
- `POST /api/ping` → `{"message":"ping pong"}` ✅ live
- `GET /api/demo` → handler riêng
- Express middleware: cors, json, urlencoded.
- **NEW** Request logger middleware (active when `API_DEBUG=1`).
- **NEW** Catch-all `/api/v1/**` → 502 JSON with helpful error message.
- App code **không consume** API nào (mock data).

### Shared (`shared/api.ts`)
- `interface DemoResponse { message: string }`
- App code **không import** `@shared`.

### Test
- `lib/utils.spec.ts` — 5/5 pass.

---

## 16. API Debug Index (lần 1 — 07/08/2026)

### 16.1 How to Enable Debug Logging

**Frontend API calls (browser console):**
```bash
# Enable
localStorage.setItem("apiDebug", "1")
# Disable
localStorage.removeItem("apiDebug")
# Then reload page — every API call logs:
#   [API] → GET /api/v1/wallet (auth)       ← outgoing request (blue)
#   [API] ← 200 OK /api/v1/wallet | data: present  ← success (green)
#   [API] ✗ ERR ... | status: 500 | detail: ...    ← error (red)
```

**Express server logs (terminal):**
```bash
API_DEBUG=1 npm run dev   # in frontend/
# Output: [API] 12:14:19.123 → GET /api/v1/wallet
```

### 16.2 API Debug Matrix — Hook → Endpoint → Backend Route

| # | Hook | File | Endpoint | Backend (FastAPI) | Status |
|---:|---|---|---|---|:---:|
| 1 | `useJobs` | `hooks/use-jobs.ts:63` | `GET /jobs` | ⚠️ wired | ✅ live (Index, JobsList) |
| 2 | `useMyJobs` | `hooks/use-jobs.ts:79` | `GET /jobs/my` | ❌ not wired | — |
| 3 | `useJob(id)` | `hooks/use-jobs.ts:87` | `GET /jobs/:id` | ❌ not wired | — |
| 4 | `useCategories` | `hooks/use-jobs.ts:96` | `GET /categories` | ⚠️ wired | ✅ live (JobsList) |
| 5 | `useCreateJob` | `hooks/use-jobs.ts:104` | `POST /jobs` | ❌ not wired | Will fail |
| 6 | `useUpdateJob` | `hooks/use-jobs.ts:121` | `PATCH /jobs/:id` | ⚠️ wired | ✅ live (JobsList edit modal) |
| 7 | `useDeleteJob` | `hooks/use-jobs.ts:138` | `DELETE /jobs/:id` | ⚠️ wired | ✅ live (JobsList delete) |
| 8 | `useWallet` | `hooks/use-wallet.ts:50` | `GET /wallet` | ⚠️ wired | ✅ live (Index, Wallet) |
| 9 | `useTransactions` | `hooks/use-wallet.ts:58` | `GET /wallet/transactions?limit=N` | ⚠️ wired | ✅ live (Wallet) |
| 10 | `useContractProjects` | `hooks/use-wallet.ts:66` | `GET /contracts/my` | ⚠️ wired | ✅ live (Wallet) |
| 11 | `useDeposit` | `hooks/use-wallet.ts:74` | `POST /wallet/deposit` | ⚠️ wired | ✅ live (Wallet) |
| 12 | `useWithdraw` | `hooks/use-wallet.ts:91` | `POST /wallet/withdraw` | ⚠️ wired | ✅ live (Wallet) |
| 13 | `useNotifications` | `hooks/use-notifications.ts:17` | `GET /notifications` | ⚠️ wired | ✅ live (TopBar) |
| 14 | `useMarkNotificationRead` | `hooks/use-notifications.ts:25` | `PATCH /notifications/:id/read` | ⚠️ wired | ✅ live (TopBar) |
| 15 | `useOrganizationProfile` | `hooks/use-organization.ts:17` | `GET /organization/profile` | ⚠️ wired | ✅ live (Settings) |
| 16 | `login()` | `auth/AuthContext.tsx:58` | `POST /auth/login` | ❌ not wired | Will fail (ECONNREFUSED) |

**Pages wired to backend (2026-08-07):**
- ✅ **Index.tsx** — useJobs (stats + recent jobs table) + useWallet (budget)
- ✅ **JobsList.tsx** — useJobs + useCategories + useUpdateJob + useDeleteJob
- ✅ **Wallet.tsx** — useWallet + useTransactions + useContractProjects + useDeposit + useWithdraw
- ✅ **Settings.tsx** — useOrganizationProfile
- ✅ **CreateJob.tsx** — useCreateJob (form state) + useCategories + navigate /ai-processing on success
- ✅ **Matching.tsx** — useJobProposals (backend proxy) + useProposals hooks, skeleton loading
- ✅ **ContractMilestone.tsx** — useMyContracts + useCreateMilestone (wizard step 2 milestone CRUD), live total calculation, send contract placeholder
- ✅ **ProjectWorkspace.tsx** — useMyContracts + useContract (milestone detail, progress), useSubmitMilestone (nộp bài), Skeleton loading
- ⚠️ **TopBar.tsx** — useNotifications + useMarkNotificationRead

### 16.3 Backend is NOT Running — Expected Behavior

When backend is down, the Vite proxy returns `ECONNREFUSED`. Terminal shows:
```
12:14:19 PM [vite] http proxy error: /api/v1/wallet
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1135:18)
```

This is **expected**. Pages like Wallet, JobsList use React Query's `useQuery` which will show:
- `isLoading: true` initially
- `error: Error("Invalid JSON response from /api/v1/... (status 0)")` after fetch fails
- UI should render error state gracefully

**JobsList currently shows error state ✅** (line 48: `error ? ...text-red-500...`). Wallet similarly handles `isLoading` state.

### 16.4 How to Wire a Real Backend

1. Start FastAPI backend on port 8000: `cd backend && uvicorn main:app --reload`
2. Verify: `curl http://localhost:8000/docs` (Swagger UI)
3. Check Vite terminal — `ECONNREFUSED` should disappear
4. Enable debug: `localStorage.setItem("apiDebug", "1")` in browser
5. Reload page — console shows `[API] → GET /api/v1/wallet (auth)` and `[API] ← ...`
6. Backend must return `BaseResponse<T>` shape (see `types/api.ts`)

### 16.5 Response Shape Contract

Frontend expects every API response to match:

```ts
interface BaseResponse<T> {
  status_code: number;   // 200 = ok, 400+ = error
  message: string;        // human-readable
  data: T | null;         // payload (null on error)
  error: { detail: string } | null;
  timestamp: string;
  path: string;
}
```

If backend returns raw `{ key: value }` (not wrapped), `json.data` is `null` and pages receive empty data.

### 16.6 Proxy Architecture

```
Browser → Vite :8080 → proxy → FastAPI :8000
                              ↓
                    /api/ping, /api/demo → Express (local mock)
                    /api/v1/**           → FastAPI backend
```

- Vite proxy config: `vite.config.ts:11-16`
- `target: "http://localhost:8000"` — verify backend is on port 8000

---

## 17. Rule Files

| File | Scope | Purpose |
|---|---|---|
| `.cursor/rules/api-debug.mdc` | alwaysApply | Frontend-backend debugging guide, error patterns, architecture |

---

## 14. Vite/TS config (lần 11)

### `vite.config.ts`
- Host `::`, port 8080.
- `fs.allow: ["./client", "./shared", "index.html"]`.
- `outDir: "dist/spa"`.
- Plugin: `react()` + `expressPlugin()` (mount server vào dev server).
- ⚠️ **Vite deprecation**: `__dirname` → dùng `import.meta.dirname` khi upgrade major.

### `tsconfig.json`
- Target ES2020, react-jsx, bundler.
- Paths: `@/*` → `./client/*`, `@shared/*` → `./shared/*`.
- ⚠️ **`strict: false`** — không check strict null/undefined. Risk sinh bug silent.
- `noUnusedLocals/Parameters/ImplicitAny/StrictNullChecks` đều `false`.
- `tsc --noEmit` pass: 0 errors.

---

## 15. DOCS cross-check (lần 12)

### Nguồn
- `DOCS/MASTER-DOC.md` (96KB) — canonical spec.
- `DOCS/MERGED-DOCUMENT.md` (155KB) — merged version.
- `DOCS/doc.txt` (45KB) — legacy.
- `process/CURRENT_STATUS.md` — updated 2026-08-02.

### Sprint status
- **Sprint 1** (foundation): identity/auth, profile management, communication/admin scaffold.
- **Sprint 2** (in progress): CV upload + parsing + AI OCR + state machine.
- **Sprint 3** (planned): trust passport, evidence upload, verification queue.
- **Sprint 4** (planned): admin review, status timeline, observability.

### Frontend scope
- Đang ở **business/fintech demo** (15 page, 14 route) — không phải CV module.
- 5 page CV-01/05/06/07/08 thuộc Sprint 1-4, **chưa implement** (CV module backend đang phát triển).

---

*INDEX.md này dùng để tra cứu nhanh các quan hệ page↔route↔sidebar↔flow. Khi có thay đổi (thêm page, route, sidebar entry, asset, hoặc DOCS update), cập nhật lại file này.*
