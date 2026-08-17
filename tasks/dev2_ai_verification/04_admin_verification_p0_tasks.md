# TASK 2.4: Admin Verification Review — P0 Gap (Reason Code, Audit Log, Idempotency)

**Nhánh:** Dev 2 (AI, CV & Trust Core)
**Bối cảnh:** Theo MASTER-DOC.md §M.6 *Admin decision rules* + Screen Change List §H.1 CV-08, gói P0 cần bổ sung 3 cơ chế bắt buộc trước khi CV-08 đủ tiêu chuẩn production:
1. Reason code (bắt buộc, không thay thế bằng free-text)
2. Audit log (mỗi admin action ghi `admin_id`, `prior_state`, `new_state`, `reason_code`, `notes`, `timestamp`)
3. Idempotency (cùng `Idempotency-Key` + cùng payload → trả về cùng response, không sinh audit log trùng)

**Đối tượng:** Backend FastAPI + Frontend React (AdminVerifications page)
**Phụ thuộc:** TASK 2.3 (đã có)

---

## 1. Tổng quan thay đổi

```
Decision Request Flow (mới):
  Client → generate UUID → header Idempotency-Key: <uuid>
                       → body { action, reason_code, notes, verifiedFieldPaths }
        → POST /admin/verifications/{caseId}/decision
        → check Idempotency-Key cache (in-memory hoặc DB)
            ├─ HIT (same payload)  → return cached response
            ├─ HIT (diff payload)  → 409 IDEMPOTENCY_KEY_CONFLICT
            └─ MISS                 → execute decision
                  ├─ validate     (action ↔ reason_code mapping)
                  ├─ snapshot     (prior case.status)
                  ├─ apply        (update case, doc, evidences, trust_passport_entries)
                  ├─ write audit  (audit_log row)
                  ├─ write decision (verification_decisions row)
                  ├─ notify       (existing _send_verification_notification)
                  └─ cache        (store response by Idempotency-Key, TTL 24h)

  Client → GET /admin/verifications/{caseId}/audit
        → return verification_decisions + audit_logs (chronological)
```

---

## 2. Reason Code Enum

### 2.1 Mapping action ↔ reason_code (theo §M.6)

| Action | Reason code bắt buộc | Reason code chấp nhận |
|---|---|---|
| `VERIFY` | không bắt buộc (notes tuỳ chọn) | `EVIDENCE_SUFFICIENT`, `EDUCATION_VERIFIED`, `EXPERIENCE_VERIFIED`, `SKILL_VERIFIED` |
| `PARTIALLY_VERIFY` | không bắt buộc (notes tuỳ chọn) | `PARTIAL_FIELDS_VERIFIED`, `EVIDENCE_SUFFICIENT_FOR_FIELDS` |
| `REQUEST_MORE_INFO` | **BẮT BUỘC** | `MISSING_DEGREE`, `MISSING_CERTIFICATE`, `MISSING_PORTFOLIO`, `INSUFFICIENT_EVIDENCE`, `TIMELINE_UNCLEAR`, `OTHER` (+ notes required) |
| `REJECT` | **BẮT BUỘC** | `DEGREE_NOT_VERIFIED`, `CERTIFICATE_FAKE`, `EXPERIENCE_FABRICATED`, `IDENTITY_MISMATCH`, `DUPLICATE_PROFILE`, `POLICY_VIOLATION`, `OTHER` (+ notes required) |

### 2.2 Enum Python

```python
# backend/app/models/verifications.py
class VerificationReasonCodeEnum(str, enum.Enum):
    # ── VERIFY family ──
    EVIDENCE_SUFFICIENT = "EVIDENCE_SUFFICIENT"
    EDUCATION_VERIFIED = "EDUCATION_VERIFIED"
    EXPERIENCE_VERIFIED = "EXPERIENCE_VERIFIED"
    SKILL_VERIFIED = "SKILL_VERIFIED"
    PARTIAL_FIELDS_VERIFIED = "PARTIAL_FIELDS_VERIFIED"
    EVIDENCE_SUFFICIENT_FOR_FIELDS = "EVIDENCE_SUFFICIENT_FOR_FIELDS"
    # ── REQUEST_MORE_INFO family ──
    MISSING_DEGREE = "MISSING_DEGREE"
    MISSING_CERTIFICATE = "MISSING_CERTIFICATE"
    MISSING_PORTFOLIO = "MISSING_PORTFOLIO"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    TIMELINE_UNCLEAR = "TIMELINE_UNCLEAR"
    # ── REJECT family ──
    DEGREE_NOT_VERIFIED = "DEGREE_NOT_VERIFIED"
    CERTIFICATE_FAKE = "CERTIFICATE_FAKE"
    EXPERIENCE_FABRICATED = "EXPERIENCE_FABRICATED"
    IDENTITY_MISMATCH = "IDENTITY_MISMATCH"
    DUPLICATE_PROFILE = "DUPLICATE_PROFILE"
    POLICY_VIOLATION = "POLICY_VIOLATION"
    # ── Generic ──
    OTHER = "OTHER"
```

### 2.3 Validation rule trong decision endpoint

```python
# backend/app/routers/admin_cv.py
REQUIRED_REASON_CODES = {
    VerificationDecisionActionEnum.REQUEST_MORE_INFO: {
        VerificationReasonCodeEnum.MISSING_DEGREE,
        VerificationReasonCodeEnum.MISSING_CERTIFICATE,
        VerificationReasonCodeEnum.MISSING_PORTFOLIO,
        VerificationReasonCodeEnum.INSUFFICIENT_EVIDENCE,
        VerificationReasonCodeEnum.TIMELINE_UNCLEAR,
        VerificationReasonCodeEnum.OTHER,
    },
    VerificationDecisionActionEnum.REJECT: {
        VerificationReasonCodeEnum.DEGREE_NOT_VERIFIED,
        VerificationReasonCodeEnum.CERTIFICATE_FAKE,
        VerificationReasonCodeEnum.EXPERIENCE_FABRICATED,
        VerificationReasonCodeEnum.IDENTITY_MISMATCH,
        VerificationReasonCodeEnum.DUPLICATE_PROFILE,
        VerificationReasonCodeEnum.POLICY_VIOLATION,
        VerificationReasonCodeEnum.OTHER,
    },
}
# → Nếu action ∈ keys mà reason_code ∉ value → 422 with clear message
# → Nếu action ∈ keys và reason_code == OTHER mà notes rỗng → 422 "notes required for OTHER"
```

---

## 3. Audit Log Model

### 3.1 Schema (DB)

```python
# backend/app/models/audit_log.py — NEW
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type = Column(String(50), nullable=False)        # "verification_case"
    entity_id = Column(String(36), nullable=False)           # case.id
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    actor_role = Column(String(20), nullable=False)         # "admin"
    action = Column(String(50), nullable=False)              # "VERIFY", "REJECT", "REQUEST_MORE_INFO"...
    prior_state = Column(JSON, nullable=True)                # {"status": "PENDING", "snapshot": {...}}
    new_state = Column(JSON, nullable=False)                 # {"status": "VERIFIED", ...}
    reason_code = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    idempotency_key = Column(String(100), nullable=True, index=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
```

Index:
- `idx_audit_entity` `(entity_type, entity_id, created_at DESC)`
- `idx_audit_actor` `(actor_id, created_at DESC)`
- `idx_audit_idempotency` `(idempotency_key)` WHERE NOT NULL

### 3.2 Auto-create table

`create_all` auto (đã có ở `main.py:48`) — chỉ cần import model trong `models/__init__.py:38`:
```python
from .audit_log import AuditLog
```

### 3.3 Write logic trong decision endpoint

```python
# backend/app/routers/admin_cv.py — TRONG make_admin_verification_decision
# Trước khi apply:
prior_state = {"status": case.status.value, "verified_field_paths": None}

# Sau khi commit case.status:
new_state = {
    "status": case.status.value,
    "verified_field_paths": decision_req.verifiedFieldPaths,
}

audit = AuditLog(
    entity_type="verification_case",
    entity_id=case.id,
    actor_id=admin_id,
    actor_role="admin",
    action=action.value,
    prior_state=prior_state,
    new_state=new_state,
    reason_code=decision_req.reason_code,
    notes=decision_req.notes,
    idempotency_key=request.headers.get("Idempotency-Key"),
    ip_address=request.client.host if request.client else None,
    user_agent=request.headers.get("user-agent"),
)
db.add(audit)
db.commit()
```

---

## 4. Idempotency Layer

### 4.1 Storage choice

**In-memory dict** trong module scope (đơn giản, không cần schema mới). TTL 24h, LRU 1000 entries. Đủ cho CV-08 P0 (không expect >1K admin decisions/ngày).

```python
# backend/app/core/idempotency.py — NEW
import threading
import time
from typing import Optional, Dict, Any

_cache: Dict[str, Dict[str, Any]] = {}
_lock = threading.Lock()
_TTL_SECONDS = 24 * 3600
_MAX_ENTRIES = 1000

def _evict_expired():
    now = time.time()
    keys_to_delete = [k for k, v in _cache.items() if now - v["_stored_at"] > _TTL_SECONDS]
    for k in keys_to_delete:
        del _cache[k]

def get(key: str) -> Optional[Dict[str, Any]]:
    with _lock:
        if key not in _cache:
            return None
        if time.time() - _cache[key]["_stored_at"] > _TTL_SECONDS:
            del _cache[key]
            return None
        return _cache[key]

def put(key: str, payload_hash: str, response: Dict[str, Any], status_code: int):
    with _lock:
        _evict_expired()
        if len(_cache) >= _MAX_ENTRIES:
            # Evict oldest
            oldest_key = min(_cache, key=lambda k: _cache[k]["_stored_at"])
            del _cache[oldest_key]
        _cache[key] = {
            "payload_hash": payload_hash,
            "response": response,
            "status_code": status_code,
            "_stored_at": time.time(),
        }
```

### 4.2 Hook trong decision endpoint

```python
# backend/app/routers/admin_cv.py
import hashlib, json as _json
from app.core.idempotency import get as idem_get, put as idem_put

@router.patch("/admin/verifications/{case_id}/decision", ...)
async def make_admin_verification_decision(request: Request, case_id: str, ...):
    # 1. Read raw body để hash
    raw_body = await request.body()
    body_hash = hashlib.sha256(raw_body).hexdigest()

    # 2. Lấy Idempotency-Key
    idem_key = request.headers.get("Idempotency-Key")

    # 3. Check cache
    if idem_key:
        cached = idem_get(idem_key)
        if cached:
            if cached["payload_hash"] != body_hash:
                raise HTTPException(409, "IDEMPOTENCY_KEY_CONFLICT")
            # Return cached response (convert dict → BaseResponse)
            return cached["response"]

    # 4. Validate + execute (existing logic)
    ...

    # 5. Cache response
    response_dict = BaseResponse.create(...).model_dump()  # hoặc json()
    if idem_key:
        idem_put(idem_key, body_hash, response_dict, 200)

    return response_dict
```

---

## 5. New Endpoint: `GET /admin/verifications/{caseId}/audit`

### 5.1 Schema

```python
# backend/app/schemas/verification.py
class AuditLogResponse(BaseModel):
    id: str
    actorId: str
    actorEmail: str       # join users
    action: str
    priorState: dict
    newState: dict
    reasonCode: Optional[str]
    notes: Optional[str]
    createdAt: datetime

class AuditHistoryResponse(BaseModel):
    caseId: str
    decisions: List[AuditLogResponse]   # chronological (oldest first)
    totalDecisions: int
```

### 5.2 Endpoint

```python
# backend/app/routers/admin_cv.py
@router.get("/admin/verifications/{case_id}/audit", status_code=status.HTTP_200_OK)
async def get_audit_history(
    request: Request,
    case_id: str,
    admin_user: User = Depends(require_role('admin')),
    db: Session = Depends(get_db),
):
    case = db.query(VerificationCase).filter(VerificationCase.id == case_id).first()
    if not case:
        raise HTTPException(404, f"Case not found: {case_id}")

    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == "verification_case",
        AuditLog.entity_id == case_id,
    ).order_by(AuditLog.created_at.asc()).all()

    items = []
    for log in logs:
        actor = db.query(User).filter(User.id == log.actor_id).first()
        items.append(AuditLogResponse(
            id=log.id,
            actorId=log.actor_id,
            actorEmail=actor.email if actor else "system",
            action=log.action,
            priorState=log.prior_state or {},
            newState=log.new_state,
            reasonCode=log.reason_code,
            notes=log.notes,
            createdAt=log.created_at,
        ))

    return BaseResponse.create(
        200,
        "Audit history fetched",
        data=AuditHistoryResponse(
            caseId=case_id, decisions=items, totalDecisions=len(items),
        ),
        path=request.url.path,
    )
```

---

## 6. Frontend Changes

### 6.1. Endpoint constants (`frontend/client/api/endpoints.ts`)

```ts
// Thêm
export const ENDPOINT_ADMIN_VERIFICATIONS_ID_AUDIT = (id: string) =>
  `/admin/verifications/${id}/audit`;

// Reason code catalog (mirror enum backend)
export const REASON_CODES = {
  EVIDENCE_SUFFICIENT:         { label: "Bằng chứng đầy đủ",                action: "VERIFY" },
  EDUCATION_VERIFIED:          { label: "Bằng cấp đã xác minh",             action: "VERIFY" },
  EXPERIENCE_VERIFIED:         { label: "Kinh nghiệm đã xác minh",          action: "VERIFY" },
  SKILL_VERIFIED:              { label: "Kỹ năng đã xác minh",             action: "VERIFY" },
  PARTIAL_FIELDS_VERIFIED:     { label: "Các trường chọn đã xác minh",       action: "PARTIALLY_VERIFY" },
  EVIDENCE_SUFFICIENT_FOR_FIELDS: { label: "Bằng chứng đủ cho trường chọn", action: "PARTIALLY_VERIFY" },
  MISSING_DEGREE:              { label: "Thiếu bằng cấp",                  action: "REQUEST_MORE_INFO" },
  MISSING_CERTIFICATE:         { label: "Thiếu chứng chỉ",                 action: "REQUEST_MORE_INFO" },
  MISSING_PORTFOLIO:           { label: "Thiếu portfolio",                 action: "REQUEST_MORE_INFO" },
  INSUFFICIENT_EVIDENCE:       { label: "Bằng chứng chưa đủ",             action: "REQUEST_MORE_INFO" },
  TIMELINE_UNCLEAR:            { label: "Timeline chưa rõ ràng",            action: "REQUEST_MORE_INFO" },
  DEGREE_NOT_VERIFIED:         { label: "Bằng cấp không xác minh được",     action: "REJECT" },
  CERTIFICATE_FAKE:            { label: "Chứng chỉ giả mạo",               action: "REJECT" },
  EXPERIENCE_FABRICATED:       { label: "Kinh nghiệm bịa đặt",              action: "REJECT" },
  IDENTITY_MISMATCH:           { label: "Danh tính không khớp",             action: "REJECT" },
  DUPLICATE_PROFILE:           { label: "Hồ sơ trùng lặp",                 action: "REJECT" },
  POLICY_VIOLATION:            { label: "Vi phạm chính sách",               action: "REJECT" },
  OTHER:                       { label: "Lý do khác",                       action: "*" },
} as const;

export type ReasonCode = keyof typeof REASON_CODES;
```

### 6.2. Update `AdminVerifications.tsx`

**State mới:**
```ts
const [reasonCode, setReasonCode] = useState<ReasonCode | "">("");
const [notes, setNotes] = useState("");

// Lấy danh sách reason code theo action
const availableReasonCodes = (Object.keys(REASON_CODES) as ReasonCode[])
  .filter(k => REASON_CODES[k].action === decisionMode.toUpperCase() || REASON_CODES[k].action === "*");
```

**UI thay đổi (decision form):**
```tsx
{decisionMode !== "none" && (
  <div className="space-y-2">
    <p className="text-[10px] font-bold">{LABEL[decisionMode]}</p>

    <select
      value={reasonCode}
      onChange={(e) => setReasonCode(e.target.value as ReasonCode)}
      required={["reject", "needs_info"].includes(decisionMode)}
      className="w-full rounded-lg border border-slate-200 p-2 text-[10px] outline-none focus:border-indigo-300"
    >
      <option value="">-- Chọn lý do (bắt buộc) --</option>
      {availableReasonCodes.map(code => (
        <option key={code} value={code}>{REASON_CODES[code].label}</option>
      ))}
    </select>

    <textarea
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder={
        reasonCode === "OTHER"
          ? "Ghi chú chi tiết (bắt buộc khi chọn 'Lý do khác')..."
          : "Ghi chú bổ sung (tuỳ chọn)..."
      }
      rows={2}
      required={reasonCode === "OTHER"}
      className="w-full resize-none rounded-lg border border-slate-200 p-2 text-[10px] outline-none focus:border-indigo-300"
    />

    <div className="flex gap-2">
      <button onClick={() => setDecisionMode("none")}>
        <Loader2 hidden /> Hủy
      </button>
      <button
        onClick={submitDecision}
        disabled={
          decisionMutation.isPending ||
          !reasonCode ||
          (reasonCode === "OTHER" && !notes.trim())
        }
      >
        {decisionMutation.isPending ? <Loader2 /> : "Xác nhận"}
      </button>
    </div>
  </div>
)}
```

**Submit:**
```ts
async function submitDecision() {
  const idemKey = crypto.randomUUID();  // built-in, no dep
  const actionMap = {
    approve: "VERIFY",
    partial: "PARTIALLY_VERIFY",
    needs_info: "REQUEST_MORE_INFO",
    reject: "REJECT",
  } as const;

  decisionMutation.mutate({
    action: actionMap[decisionMode],
    reason_code: reasonCode,
    notes: notes.trim() || undefined,
    idempotencyKey: idemKey,
  });
}
```

**Payload mutation mới:**
```ts
const decisionMutation = useMutation({
  mutationFn: (payload: {
    action: string;
    reason_code: ReasonCode;
    notes?: string;
    idempotencyKey: string;
  }) =>
    apiPatch<unknown>(
      ENDPOINT_ADMIN_VERIFICATIONS_ID_DECISION(selectedCaseId!),
      {
        action: payload.action,
        reason_code: payload.reason_code,
        notes: payload.notes,
      },
      true,
      { "Idempotency-Key": payload.idempotencyKey },  // ← new headers arg
    ),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["admin", "verifications"] });
    qc.invalidateQueries({ queryKey: ["admin", "verifications", "audit", selectedCaseId] });
    toast.success("Đã gửi quyết định");
    setDecisionMode("none");
    setReasonCode("");
    setNotes("");
  },
  onError: (err: ApiError) => {
    if (err.status === 409) {
      toast.error("Quyết định trùng lặp (idempotency key đã dùng với payload khác).");
    } else {
      toast.error(err.message ?? "Gửi quyết định thất bại");
    }
  },
});
```

### 6.3. `apiPatch` extension

```ts
// frontend/client/api/client.ts — extend signature
export const apiPatch = <T>(
  path: string,
  body: unknown,
  auth = true,
  extraHeaders?: Record<string, string>,
) =>
  apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
    auth,
    headers: extraHeaders,
  });
```

### 6.4. AuditHistory panel

```tsx
// Trong detail panel, dưới 3-column data
const { data: audit } = useQuery({
  queryKey: ["admin", "verifications", "audit", selectedCaseId],
  queryFn: () => apiGet<{ totalDecisions: number; decisions: AuditEntry[] }>(
    ENDPOINT_ADMIN_VERIFICATIONS_ID_AUDIT(selectedCaseId!),
  ),
  enabled: !!selectedCaseId,
  staleTime: 30_000,
});

// Render
{audit && audit.decisions.length > 0 && (
  <div>
    <h3 className="mb-2 text-[11px] font-bold">
      Lịch sử quyết định ({audit.totalDecisions})
    </h3>
    <ul className="space-y-1.5">
      {audit.decisions.map(d => (
        <li key={d.id} className="rounded-lg border border-slate-100 p-2 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="font-bold">{ACTION_LABEL[d.action] ?? d.action}</span>
            <span className="text-[9px] text-slate-400">
              {new Date(d.createdAt).toLocaleString("vi-VN")}
            </span>
          </div>
          <p className="text-[9px] text-slate-500">{d.actorEmail}</p>
          {d.reasonCode && (
            <p className="text-[9px] text-slate-600">
              <strong>{REASON_CODES[d.reasonCode as ReasonCode]?.label ?? d.reasonCode}</strong>
            </p>
          )}
          {d.notes && <p className="text-[9px] italic text-slate-500">{d.notes}</p>}
        </li>
      ))}
    </ul>
  </div>
)}
```

---

## 7. File Touch List

| File | Action | Lines (est) |
|---|---|---|
| `backend/app/models/verifications.py` | Edit — thêm `VerificationReasonCodeEnum` | +30 |
| `backend/app/models/audit_log.py` | **Create** | ~50 |
| `backend/app/models/__init__.py` | Edit — import `AuditLog` | +1 |
| `backend/app/schemas/verification.py` | Edit — `reason_code` field, `AuditLogResponse`, `AuditHistoryResponse` | +30 |
| `backend/app/core/idempotency.py` | **Create** | ~60 |
| `backend/app/routers/admin_cv.py` | Edit — validate reason_code, write audit, idempotency hook, new GET endpoint | +90 |
| `frontend/client/api/endpoints.ts` | Edit — thêm endpoint + `REASON_CODES` | +40 |
| `frontend/client/api/client.ts` | Edit — `apiPatch` accept `extraHeaders` | +5 |
| `frontend/client/pages/AdminVerifications.tsx` | Edit — reason code dropdown, notes, audit history panel, idempotency | +90 / -30 |

**Tổng ước tính:** ~400 dòng thay đổi

---

## 8. Test Plan

### 8.1 Backend smoke (curl)

```bash
# Setup admin token
TOKEN_ADMIN=$(curl -s -X POST :8000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"..."}' | jq -r .data.access_token)

# 1. Create case (test setup)
# 2. Decision with reason code
curl -X PATCH :8000/api/v1/admin/verifications/{caseId}/decision \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Idempotency-Key: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{"action":"REJECT","reason_code":"DEGREE_NOT_VERIFIED","notes":"Bằng ĐH không khớp tên"}'
# → 200, audit_log created

# 3. Replay same idempotency key + same payload → 200 cached response
curl -X PATCH ... -H "Idempotency-Key: 11111111-1111-1111-1111-111111111111" ...
# → 200, no new audit_log (count remains 1)

# 4. Replay same key + DIFF payload → 409
curl -X PATCH ... -H "Idempotency-Key: 11111111-1111-1111-1111-111111111111" \
  -d '{"action":"VERIFY",...}'
# → 409 IDEMPOTENCY_KEY_CONFLICT

# 5. Reject without reason_code → 422
curl -X PATCH ... -d '{"action":"REJECT"}'
# → 422 "reason_code is required for REJECT"

# 6. OTHER without notes → 422
curl -X PATCH ... -d '{"action":"REJECT","reason_code":"OTHER"}'
# → 422 "notes required when reason_code is OTHER"

# 7. GET audit history
curl :8000/api/v1/admin/verifications/{caseId}/audit -H "Authorization: Bearer $TOKEN_ADMIN"
# → 200, lists 1 entry (action=REJECT, reason_code=DEGREE_NOT_VERIFIED, ...)
```

### 8.2 Frontend smoke

```bash
cd frontend && npx tsc --noEmit  # exit 0
# Test manually ở browser với admin account:
# 1. /admin/verifications
# 2. Pick case → Decision "Reject" → dropdown shows ONLY 7 codes (REJECT family)
# 3. Submit → Idempotency-Key header in DevTools Network
# 4. Click again same button → toast "Đã gửi quyết định" (cached, no new audit)
# 5. AuditHistory panel shows 1 entry
```

### 8.3 Permission

- All admin endpoints vẫn `require_role('admin')` → 403 với non-admin (test với freelancer token)
- Audit history chỉ xem được bởi admin → 403 với non-admin

---

## 9. Risks + Mitigations

| Risk | Mitigation |
|---|---|
| In-memory idempotency cache mất khi restart backend | OK cho P0. P1: chuyển sang DB table với TTL index. |
| Admin spam nút "Xác nhận" → multiple submits | Frontend disable button khi `isPending`. Server-side idempotency vẫn là safety net. |
| `crypto.randomUUID()` không có ở browser cũ | Fallback: `Date.now().toString(36) + Math.random().toString(36)`. Modern browsers (Chrome 92+, Safari 15.4+) OK. |
| Reason code enum đồng bộ backend ↔ frontend | Centralize trong `REASON_CODES` dict, test cả 2 phía. |
| Audit log không có retention policy | P0 OK. P1: cron job xoá sau 2 năm (theo §M.7 privacy). |

---

## 10. Status Checklist

- [x] T1 — Thêm `VerificationReasonCodeEnum` + extend `VerificationDecisionRequest` schema
- [x] T2 — Tạo `AuditLog` model + auto-create table + write logic
- [x] T3 — In-memory idempotency cache + hook trong decision endpoint
- [x] T4 — `GET /admin/verifications/{caseId}/audit` endpoint + schema
- [x] T5 — Frontend reason code dropdown + notes
- [x] T6 — Frontend AuditHistory panel
- [x] T7 — Frontend Idempotency-Key generation + header
- [x] T8 — Test (curl + tsc + manual) + commit + push

---

## 11. Branch + Commit

```bash
git checkout -b feat/admin-decision-p0
git add -A
git commit -m "feat(admin): CV-08 P0 gap — reason code + audit log + idempotency

CV-08 (Admin Review Detail) was missing 3 P0 requirements per MASTER-DOC §M.6:
- Reason code: REJECT/REQUEST_MORE_INFO now require structured reason_code
  (not just free-text notes). 17 reason codes per action family.
- Audit log: every decision now writes audit_log row (admin_id, prior_state,
  new_state, reason_code, notes, timestamp, idempotency_key, ip).
- Idempotency: Idempotency-Key header. Same key + same payload → cached
  response. Same key + diff payload → 409. 24h TTL, in-memory.

Backend:
- New enum VerificationReasonCodeEnum (17 codes)
- New model AuditLog (auto-create via create_all)
- New module app/core/idempotency.py (thread-safe LRU)
- New endpoint GET /admin/verifications/{id}/audit
- Decision endpoint: validate reason_code, write audit, hook idempotency

Frontend:
- REASON_CODES catalog mirroring enum
- Reason code dropdown (required for REJECT/REQUEST_MORE_INFO)
- Notes field (required when reason_code=OTHER)
- AuditHistory panel showing past decisions
- crypto.randomUUID() for Idempotency-Key per submit
- apiPatch extended to accept extraHeaders

Verified: tsc clean, curl smoke all endpoints, role guards preserved
Co-authored-by: Cursor <cursoragent@cursor.com>"

git push -u origin feat/admin-decision-p0
```

---

## 12. References

- `DOCS/MASTER-DOC.md` §M.6 — Admin decision rules
- `DOCS/MASTER-DOC.md` §H.1 CV-08 — Screen Change List
- `DOCS/MASTER-DOC.md` §I — Data Schema (verification_decision, audit_log)
- `tasks/dev2_ai_verification/03_verification_trust_tasks.md` — Existing task
- `backend/app/routers/admin_cv.py` — Current decision endpoint
- `frontend/client/pages/AdminVerifications.tsx` — Current UI
- `frontend/client/INDEX.md` §7 — Sprint mapping (CV-08 = Sprint 4)
