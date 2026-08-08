export const API_BASE = "/api/v1";

// ─── Auth ───────────────────────────────────────────────────────────────────
export const ENDPOINT_AUTH_LOGIN = "/auth/login";
export const ENDPOINT_AUTH_REFRESH = "/auth/refresh";
export const ENDPOINT_AUTH_CHANGE_PASSWORD = "/auth/change-password";
export const ENDPOINT_AUTH_RESET_PASSWORD = "/auth/reset-password";
export const ENDPOINT_AUTH_RESET_PASSWORD_CONFIRM = "/auth/reset-password/confirm";
export const ENDPOINT_AUTH_EMAIL_VERIFICATION = "/auth/email-verification";
export const ENDPOINT_AUTH_EMAIL_VERIFICATION_CONFIRM = "/auth/email-verification/confirm";

// ─── Register ────────────────────────────────────────────────────────────────
export const ENDPOINT_REGISTER_FREELANCER = "/register/freelancer";
export const ENDPOINT_REGISTER_BUSINESS = "/register/business";

// ─── Profile ────────────────────────────────────────────────────────────────
export const ENDPOINT_FREELANCER_PROFILE = "/freelancer/profile";
export const ENDPOINT_FREELANCER_SKILLS = "/freelancer/skills";
export const ENDPOINT_FREELANCER_PORTFOLIO = "/freelancer/portfolio";
export const ENDPOINT_FREELANCER_CV_IMPORT = "/freelancer/cv-import";
export const ENDPOINT_ORGANIZATION_PROFILE = "/organization/profile";
export const ENDPOINT_ORGANIZATION_LOGO = "/organization/logo";
export const ENDPOINT_USERS_AVATAR = "/users/avatar";

// ─── Jobs ───────────────────────────────────────────────────────────────────
export const ENDPOINT_JOBS = "/jobs";
export const ENDPOINT_JOBS_MY = "/jobs/my";
export const ENDPOINT_CATEGORIES = "/categories";

// ─── Proposals ───────────────────────────────────────────────────────────────
export const ENDPOINT_PROPOSALS_MY = "/proposals/my";
export const ENDPOINT_PROPOSALS_ID = (id: string) => `/proposals/${id}`;
export const ENDPOINT_PROPOSALS_ID_ACCEPT = (id: string) => `/proposals/${id}/accept`;
export const ENDPOINT_PROPOSALS_ID_REJECT = (id: string) => `/proposals/${id}/reject`;
export const ENDPOINT_PROPOSALS_ID_WITHDRAW = (id: string) => `/proposals/${id}/withdraw`;

// ─── Contracts ───────────────────────────────────────────────────────────────
export const ENDPOINT_CONTRACTS = "/contracts";
export const ENDPOINT_CONTRACTS_MY = "/contracts/my";
export const ENDPOINT_CONTRACTS_ID = (id: string) => `/contracts/${id}`;
export const ENDPOINT_CONTRACTS_ID_COMPLETE = (id: string) => `/contracts/${id}/complete`;
export const ENDPOINT_CONTRACTS_ID_DISPUTES = (id: string) => `/contracts/${id}/disputes`;
export const ENDPOINT_MILESTONES_ID = (id: string) => `/milestones/${id}`;
export const ENDPOINT_MILESTONES_ID_SUBMIT = (id: string) => `/milestones/${id}/submit`;
export const ENDPOINT_DELIVERABLES_ID = (id: string) => `/deliverables/${id}`;
export const ENDPOINT_DELIVERABLES_ID_APPROVE = (id: string) => `/deliverables/${id}/approve`;
export const ENDPOINT_DELIVERABLES_ID_REJECT = (id: string) => `/deliverables/${id}/reject`;

// ─── Finance / Wallet ────────────────────────────────────────────────────────
export const ENDPOINT_WALLET = "/wallet";
export const ENDPOINT_WALLET_DEPOSIT = "/wallet/deposit";
export const ENDPOINT_WALLET_WITHDRAW = "/wallet/withdraw";
export const ENDPOINT_WALLET_TRANSACTIONS = "/wallet/transactions";

// ─── Disputes ────────────────────────────────────────────────────────────────
export const ENDPOINT_DISPUTES = "/disputes";
export const ENDPOINT_DISPUTES_ID = (id: string) => `/disputes/${id}`;
export const ENDPOINT_DISPUTES_ID_EVIDENCE = (id: string) => `/disputes/${id}/evidence`;
export const ENDPOINT_DISPUTES_ID_RESOLVE = (id: string) => `/disputes/${id}/resolve`;

// ─── Notifications ──────────────────────────────────────────────────────────
export const ENDPOINT_NOTIFICATIONS = "/notifications";
export const ENDPOINT_NOTIFICATIONS_ID_READ = (id: string) => `/notifications/${id}/read`;

// ─── Chat ───────────────────────────────────────────────────────────────────
export const ENDPOINT_CHAT_THREADS = "/chat/threads";
export const ENDPOINT_CHAT_THREADS_ID = (id: string) => `/chat/threads/${id}`;
export const ENDPOINT_CHAT_THREADS_ID_MESSAGES = (id: string) => `/chat/threads/${id}/messages`;

// ─── Shortlists ──────────────────────────────────────────────────────────────
export const ENDPOINT_SHORTLISTS = "/shortlists";
export const ENDPOINT_SHORTLISTS_ID = (id: string) => `/shortlists/${id}`;

// ─── Admin / System ─────────────────────────────────────────────────────────
export const ENDPOINT_ADMIN_USERS = (
  params: { page?: number; limit?: number } = {},
) => {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const s = qs.toString();
  return s ? `/admin/users?${s}` : `/admin/users`;
};
export const ENDPOINT_ADMIN_USERS_ID = (id: string) => `/admin/users/${id}`;
export const ENDPOINT_ADMIN_USERS_ID_LOCK = (id: string) => `/admin/users/${id}/lock`;
export const ENDPOINT_ADMIN_USERS_UNLOCK = (id: string) => `/admin/users/${id}/unlock`;
export const ENDPOINT_ADMIN_VERIFICATIONS = (
  params: { status?: string; page?: number; limit?: number } = {},
) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status_filter", params.status);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const s = qs.toString();
  return s ? `/admin/verifications?${s}` : `/admin/verifications`;
};
export const ENDPOINT_ADMIN_VERIFICATIONS_ID = (id: string) => `/admin/verifications/${id}`;
export const ENDPOINT_ADMIN_VERIFICATIONS_ID_DECISION = (id: string) =>
  `/admin/verifications/${id}/decision`;
export const ENDPOINT_ADMIN_VERIFICATIONS_ID_AUDIT = (id: string) =>
  `/admin/verifications/${id}/audit`;
export const ENDPOINT_QUOTAS_ME = "/quotas/me";

// ─── Admin: Reason Code Catalog (mirror VerificationReasonCodeEnum backend) ──
// Theo MASTER-DOC §M.6: REJECT/REQUEST_MORE_INFO yêu cầu reason code có cấu trúc.
// Action family: VERIFY | PARTIALLY_VERIFY | REQUEST_MORE_INFO | REJECT | "*" (generic OTHER)
export const REASON_CODES = {
  // VERIFY family
  EVIDENCE_SUFFICIENT:              { label: "Bằng chứng đầy đủ",                action: "VERIFY" },
  EDUCATION_VERIFIED:               { label: "Bằng cấp đã xác minh",             action: "VERIFY" },
  EXPERIENCE_VERIFIED:              { label: "Kinh nghiệm đã xác minh",          action: "VERIFY" },
  SKILL_VERIFIED:                   { label: "Kỹ năng đã xác minh",              action: "VERIFY" },
  // PARTIALLY_VERIFY family
  PARTIAL_FIELDS_VERIFIED:          { label: "Các trường chọn đã xác minh",      action: "PARTIALLY_VERIFY" },
  EVIDENCE_SUFFICIENT_FOR_FIELDS:   { label: "Bằng chứng đủ cho trường chọn",    action: "PARTIALLY_VERIFY" },
  // REQUEST_MORE_INFO family
  MISSING_DEGREE:                   { label: "Thiếu bằng cấp",                   action: "REQUEST_MORE_INFO" },
  MISSING_CERTIFICATE:              { label: "Thiếu chứng chỉ",                  action: "REQUEST_MORE_INFO" },
  MISSING_PORTFOLIO:                { label: "Thiếu portfolio",                  action: "REQUEST_MORE_INFO" },
  INSUFFICIENT_EVIDENCE:            { label: "Bằng chứng chưa đủ",              action: "REQUEST_MORE_INFO" },
  TIMELINE_UNCLEAR:                 { label: "Timeline chưa rõ ràng",            action: "REQUEST_MORE_INFO" },
  // REJECT family
  DEGREE_NOT_VERIFIED:              { label: "Bằng cấp không xác minh được",     action: "REJECT" },
  CERTIFICATE_FAKE:                 { label: "Chứng chỉ giả mạo",                action: "REJECT" },
  EXPERIENCE_FABRICATED:            { label: "Kinh nghiệm bịa đặt",              action: "REJECT" },
  IDENTITY_MISMATCH:                { label: "Danh tính không khớp",             action: "REJECT" },
  DUPLICATE_PROFILE:                { label: "Hồ sơ trùng lặp",                  action: "REJECT" },
  POLICY_VIOLATION:                 { label: "Vi phạm chính sách",               action: "REJECT" },
  // Generic
  OTHER:                            { label: "Lý do khác (ghi rõ trong ghi chú)", action: "*" },
} as const;

export type ReasonCode = keyof typeof REASON_CODES;

// Helper: filter reason codes theo action family
export function reasonCodesFor(action: string): ReasonCode[] {
  return (Object.keys(REASON_CODES) as ReasonCode[]).filter(
    (k) => REASON_CODES[k].action === action || REASON_CODES[k].action === "*",
  );
}

// ─── CV Intelligence ─────────────────────────────────────────────────────────
export const ENDPOINT_CV_UPLOAD = "/cv/upload";
export const ENDPOINT_CV_DOCUMENT_PARSE = (id: string) => `/cv/documents/${id}/parse`;
export const ENDPOINT_CV_TASK = (id: string) => `/cv/tasks/${id}`;
export const ENDPOINT_CV_DOCUMENT_RESULT = (id: string) => `/cv/documents/${id}/result`;
export const ENDPOINT_CV_DOCUMENT_REVIEW = (id: string) => `/cv/documents/${id}/review`;
export const ENDPOINT_CV_DOCUMENT_EVIDENCE = (id: string) => `/cv/documents/${id}/evidence`;
export const ENDPOINT_CV_DOCUMENT_SUBMIT = (id: string) => `/cv/documents/${id}/submit-verification`;
export const ENDPOINT_CV_DOCUMENT_RESUBMIT = (id: string) => `/cv/documents/${id}/resubmit-verification`;
export const ENDPOINT_TRUST_PASSPORT_ME = "/freelancer/trust-passport";
export const ENDPOINT_TRUST_PASSPORT_PUBLIC = (id: string) => `/freelancers/${id}/trust-passport`;
