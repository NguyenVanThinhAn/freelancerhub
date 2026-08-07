import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  return useQuery({
    queryKey: taskId ? QK_CV_TASK(taskId) : ["cv", "task", "noop"],
    queryFn: () => apiGet<CVParseTaskResponse>(ENDPOINT_CV_TASK(taskId!)),
    enabled: !!taskId,
    refetchInterval: (q) => {
      const status = (q.state.data as CVParseTaskResponse | undefined)?.status;
      return status === "SUCCEEDED" || status === "FAILED" ? false : 2000;
    },
  });
}

export function useCVResult(documentId: string | null) {
  return useQuery({
    queryKey: documentId ? QK_CV_RESULT(documentId) : ["cv", "result", "noop"],
    queryFn: () => apiGet<CVParseResultDetailResponse>(ENDPOINT_CV_DOCUMENT_RESULT(documentId!)),
    enabled: !!documentId,
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