import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { apiFetch, apiGet, apiPost, apiPatch } from "@/api/client";
import {
  ENDPOINT_CV_UPLOAD,
  ENDPOINT_CV_DOCUMENT_PARSE,
  ENDPOINT_CV_TASK,
  ENDPOINT_CV_DOCUMENT_RESULT,
  ENDPOINT_CV_DOCUMENT_REVIEW,
  ENDPOINT_CV_DOCUMENT_EVIDENCE,
  ENDPOINT_CV_DOCUMENT_SUBMIT,
  ENDPOINT_CV_DOCUMENT_RESUBMIT,
  ENDPOINT_TRUST_PASSPORT_ME,
  ENDPOINT_TRUST_PASSPORT_PUBLIC,
} from "@/api/endpoints";
import {
  QK_CV_TASK,
  QK_CV_RESULT,
  QK_TRUST_PASSPORT,
} from "@/api/queryKeys";
import type {
  CVUploadResponse,
  CVParseTaskResponse,
  CVParseResultDetailResponse,
  CVReviewRequest,
  TrustPassport,
} from "@/types/cv";

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useUploadCV() {
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return apiFetch<CVUploadResponse>(ENDPOINT_CV_UPLOAD, {
        method: "POST",
        body: fd,
      });
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string }).message ?? "Upload CV thất bại");
    },
  });
}

export function useStartParseCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      apiPost<CVParseTaskResponse>(ENDPOINT_CV_DOCUMENT_PARSE(documentId), {}),
    onSuccess: (_data, documentId) => {
      qc.invalidateQueries({ queryKey: QK_CV_RESULT(documentId) });
    },
  });
}

export function useReviewCV(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CVReviewRequest) =>
      apiPatch<CVParseResultDetailResponse>(ENDPOINT_CV_DOCUMENT_REVIEW(documentId), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_CV_RESULT(documentId) });
      toast.success("Đã lưu chỉnh sửa CV");
    },
  });
}

export function useUploadEvidence(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { file: File; title: string; evidenceType: string }) => {
      const fd = new FormData();
      fd.append("file", args.file);
      fd.append("title", args.title);
      fd.append("evidence_type", args.evidenceType);
      return apiFetch<unknown>(ENDPOINT_CV_DOCUMENT_EVIDENCE(documentId), {
        method: "POST",
        body: fd,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_CV_RESULT(documentId) });
      toast.success("Upload minh chứng thành công");
    },
  });
}

export function useSubmitVerification(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (selectedFieldIds: string[]) =>
      apiPost(ENDPOINT_CV_DOCUMENT_SUBMIT(documentId), { selected_evidence_ids: selectedFieldIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_CV_RESULT(documentId) });
      toast.success("Đã nộp hồ sơ xác minh");
    },
  });
}

export function useResubmitVerification(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost(ENDPOINT_CV_DOCUMENT_RESUBMIT(documentId), {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_CV_RESULT(documentId) });
      toast.success("Đã gửi lại hồ sơ");
    },
  });
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useParseTask(taskId: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: taskId ? QK_CV_TASK(taskId) : ["cv", "task", "noop"],
    queryFn: () => apiGet<CVParseTaskResponse>(ENDPOINT_CV_TASK(taskId!)),
    enabled: !!taskId,
    retry: false,
    refetchInterval: (q) => {
      const status = (q.state.data as CVParseTaskResponse | undefined)?.status;
      return status === "SUCCEEDED" || status === "FAILED" ? false : 2000;
    },
  });
}

export function useCVResult(documentId: string | null, taskId: string | null) {
  const { data: task } = useParseTask(taskId);
  const startTime = useRef<number>(Date.now());
  const taskSucceeded = task?.status === "SUCCEEDED";

  return useQuery({
    queryKey: documentId ? QK_CV_RESULT(documentId) : ["cv", "result", "noop"],
    // CHỈ fetch khi:
    //   1. documentId có giá trị
    //   2. Parse task đã SUCCESS (backend mới save CVParseResult vào DB)
    // Nếu task chưa SUCCESS → query disabled → không fetch → không có 404 race.
    // Khi task SUCCESS → enabled = true → fetch 1 lần duy nhất → 200.
    enabled: !!documentId && taskSucceeded,
    queryFn: () =>
      apiGet<CVParseResultDetailResponse>(ENDPOINT_CV_DOCUMENT_RESULT(documentId!)),
    retry: false,
    refetchOnWindowFocus: false,
    // Transform response → typed shape.
    // Backend trả về camelCase aliases (fieldPath, sourcePage, requiresUserReview, …)
    // nên mapper PHẢI đọc camelCase. Đọc snake_case sẽ trả về undefined cho mọi field
    // → toàn bộ fieldPath rỗng → mọi row trùng key trong `decisions` → click 1 nút
    // "Xác nhận" thì tất cả row đều hiện "Đã xác nhận", và khi lưu backend 500 vì
    // lookup field_path == "" không match DB row nào.
    select: (raw): CVParseResultDetailResponse => {
      const obj = raw as unknown as Record<string, unknown>;
      const ef = (obj.extractedFields as Record<string, unknown>[] | undefined) ?? [];
      const fields: CVParseResultDetailResponse["extractedFields"] = ef.map((f) => ({
        id: String(f.id ?? f.field_id ?? ""),
        fieldPath: String(f.fieldPath ?? f.field_path ?? ""),
        value: f.value,
        confidence: typeof f.confidence === "number" ? f.confidence : null,
        sourcePage: typeof f.sourcePage === "number" ? f.sourcePage : null,
        sourceText: f.sourceText != null ? String(f.sourceText) : null,
        evidenceLevel:
          (f.evidenceLevel as CVParseResultDetailResponse["extractedFields"][0]["evidenceLevel"]) ??
          (f.evidence_level as CVParseResultDetailResponse["extractedFields"][0]["evidenceLevel"]) ??
          "AI_EXTRACTED",
        requiresUserReview: Boolean(f.requiresUserReview ?? f.requires_user_review ?? false),
      }));
      return {
        documentId: String(obj.documentId ?? obj.document_id ?? ""),
        overallConfidence:
          typeof obj.overallConfidence === "number"
            ? obj.overallConfidence
            : typeof obj.overall_confidence === "number"
              ? obj.overall_confidence
              : null,
        completenessPercent:
          typeof obj.completenessPercent === "number"
            ? obj.completenessPercent
            : typeof obj.completeness_percent === "number"
              ? obj.completeness_percent
              : null,
        missingFields: Array.isArray(obj.missingFields)
          ? (obj.missingFields as string[])
          : Array.isArray(obj.missing_fields)
            ? (obj.missing_fields as string[])
            : [],
        conflicts: Array.isArray(obj.conflicts) ? (obj.conflicts as unknown[]) : [],
        extractedFields: fields,
      };
    },
    // Fetch 1 lần khi task SUCCESS. Không poll lại — data không đổi trong session.
    refetchInterval: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });
}

export function useMyTrustPassport() {
  return useQuery({
    queryKey: QK_TRUST_PASSPORT(),
    queryFn: () => apiGet<TrustPassport>(ENDPOINT_TRUST_PASSPORT_ME),
    staleTime: 60_000,
  });
}

export function usePublicTrustPassport(freelancerId: string | null) {
  return useQuery({
    queryKey: freelancerId ? QK_TRUST_PASSPORT(freelancerId) : ["trust-passport", "noop"],
    queryFn: () => apiGet<TrustPassport>(ENDPOINT_TRUST_PASSPORT_PUBLIC(freelancerId!), false),
    enabled: !!freelancerId,
    staleTime: 60_000,
  });
}