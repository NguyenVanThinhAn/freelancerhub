// ─── CV Intelligence types (mirrors backend/app/schemas/cv.py) ────────────────
// Note: backend CV schemas use camelCase aliases, so field names are camelCase.

export type DocumentStatus =
  | "UPLOADED"
  | "EXTRACTING"
  | "PARSING_FAILED"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "NEEDS_MORE_INFO"
  | "REJECTED";

export type TaskStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED";

export type EvidenceLevel =
  | "AI_EXTRACTED"
  | "USER_CONFIRMED"
  | "ADMIN_VERIFIED"
  | "UNVERIFIED";

export interface CVUploadResponse {
  documentId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  status: DocumentStatus;
  createdAt: string;
}

export interface CVParseTaskResponse {
  taskId: string;
  documentId: string;
  taskType: string;
  status: TaskStatus;
  progressPercent: number;
  currentStep: string | null;
  attemptCount: number;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface CVExtractedFieldDetail {
  id: string;
  fieldPath: string;
  value: unknown;
  confidence: number | null;
  sourcePage: number | null;
  sourceText: string | null;
  evidenceLevel: EvidenceLevel;
  requiresUserReview: boolean;
}

export interface CVParseResultDetailResponse {
  documentId: string;
  overallConfidence: number | null;
  completenessPercent: number | null;
  missingFields: string[];
  conflicts: unknown[];
  extractedFields: CVExtractedFieldDetail[];
}

export interface CVFieldReviewChange {
  fieldPath: string;
  value: unknown;
  action: "CONFIRM" | "EDIT";
}

export interface CVReviewRequest {
  schemaVersion?: string;
  changes: CVFieldReviewChange[];
}

// ─── Trust Passport ──────────────────────────────────────────────────────────

export interface TrustPassportBadge {
  id: string;
  freelancer_id: string;
  claim_type: string;
  claim_value: string;
  evidence_level: EvidenceLevel;
  expires_at: string | null;
}

export interface TrustPassport {
  freelancer_id: string;
  trust_score: number;
  badges: TrustPassportBadge[];
}