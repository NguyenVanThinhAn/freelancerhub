// ─── Auth ───────────────────────────────────────────────────────────────────
export const QK_AUTH_USER = "auth:user";

// ─── Jobs ───────────────────────────────────────────────────────────────────
export const QK_JOBS = "jobs";
export const QK_JOBS_MY = "jobs:my";
export const QK_JOBS_DETAIL = (id: string) => ["jobs", id];
export const QK_CATEGORIES = "categories";

// ─── Proposals ───────────────────────────────────────────────────────────────
export const QK_PROPOSALS_MY = "proposals:my";
export const QK_PROPOSALS_JOB = (jobId: string) => ["proposals", "job", jobId];

// ─── Contracts ───────────────────────────────────────────────────────────────
export const QK_CONTRACTS_MY = "contracts:my";
export const QK_CONTRACT = (id: string) => ["contracts", id];
export const QK_CONTRACT_DISPUTES = (contractId: string) => ["contracts", contractId, "disputes"];

// ─── Wallet ─────────────────────────────────────────────────────────────────
export const QK_WALLET = "wallet";
export const QK_WALLET_TRANSACTIONS = "wallet:transactions";

// ─── Disputes ────────────────────────────────────────────────────────────────
export const QK_DISPUTE = (id: string) => ["disputes", id];

// ─── Notifications ──────────────────────────────────────────────────────────
export const QK_NOTIFICATIONS = "notifications";

// ─── Profile ────────────────────────────────────────────────────────────────
export const QK_FREELANCER_PROFILE = "freelancer:profile";
export const QK_FREELANCER_SKILLS = "freelancer:skills";
export const QK_FREELANCER_PORTFOLIO = "freelancer:portfolio";
export const QK_FREELANCER_CV_IMPORT = "freelancer:cv-import";
export const QK_ORGANIZATION_PROFILE = "organization:profile";
export const QK_QUOTAS = "quotas";

// ─── CV Intelligence ────────────────────────────────────────────────────────
export const QK_CV_TASK = (taskId: string) => ["cv", "task", taskId];
export const QK_CV_RESULT = (documentId: string) => ["cv", "result", documentId];
export const QK_TRUST_PASSPORT = (freelancerId?: string) =>
  freelancerId ? ["trust-passport", freelancerId] : ["trust-passport", "me"];

// ─── Shortlists ──────────────────────────────────────────────────────────────
export const QK_SHORTLISTS = "shortlists";
