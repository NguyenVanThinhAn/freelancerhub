import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiGet, apiPatch } from "@/api/client";
import { toast } from "sonner";
import type { ApiError } from "@/types/api";

export type InterviewStatusValue = "SCHEDULED" | "CONFIRMED" | "DECLINED" | "COMPLETED" | "CANCELED";

export interface Interview {
  id: string;
  proposal_id: string;
  organization_id: string;
  interview_type: string;
  start_time: string;
  duration_minutes: number;
  platform: string | null;
  meet_link: string | null;
  note: string | null;
  status: InterviewStatusValue;
  created_at: string;
}

export interface CreateInterviewPayload {
  proposal_id: string;
  interview_type: string;
  start_time: string;
  duration_minutes: number;
  platform?: string;
  meet_link?: string;
  note?: string;
}

export interface UpdateInterviewStatusPayload {
  status: InterviewStatusValue;
  note?: string;
}

export function useCreateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInterviewPayload) => {
      return apiPost<Interview>("/interviews", payload);
    },
    onSuccess: () => {
      toast.success("Đã gửi lời mời phỏng vấn thành công");
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Không thể tạo lịch phỏng vấn");
    },
  });
}

export function useInterview(id: string | undefined) {
  return useQuery({
    queryKey: ["interviews", "detail", id],
    queryFn: () => apiGet<Interview>(`/interviews/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useInterviews(proposalId?: string) {
  return useQuery({
    queryKey: ["interviews", proposalId],
    queryFn: async () => {
      const params = proposalId ? `?proposal_id=${proposalId}` : "";
      return apiGet<Interview[]>(`/interviews${params}`);
    },
    staleTime: 30_000,
  });
}

export function useUpdateInterviewStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateInterviewStatusPayload & { id: string }) => {
      return apiPatch<Interview>(`/interviews/${id}/status`, payload);
    },
    onSuccess: (_, vars) => {
      const label =
        vars.status === "CONFIRMED" ? "Đã xác nhận tham dự" :
        vars.status === "DECLINED" ? "Đã từ chối lời mời" :
        vars.status === "COMPLETED" ? "Đã đánh dấu hoàn thành" :
        vars.status === "CANCELED" ? "Đã huỷ lịch phỏng vấn" : "Đã cập nhật";
      toast.success(label);
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Cập nhật thất bại");
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatusValue, string> = {
  SCHEDULED: "Đã lên lịch",
  CONFIRMED: "Đã xác nhận",
  DECLINED: "Đã từ chối",
  COMPLETED: "Đã hoàn thành",
  CANCELED: "Đã huỷ",
};

export const INTERVIEW_STATUS_TONE: Record<InterviewStatusValue, { bg: string; text: string }> = {
  SCHEDULED: { bg: "bg-amber-50", text: "text-amber-600" },
  CONFIRMED: { bg: "bg-emerald-50", text: "text-emerald-600" },
  DECLINED: { bg: "bg-rose-50", text: "text-rose-600" },
  COMPLETED: { bg: "bg-slate-100", text: "text-slate-500" },
  CANCELED: { bg: "bg-slate-100", text: "text-slate-400" },
};

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatRelativeTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((d.getTime() - now.getTime()) / 60000);
    if (diffMin < 0) {
      const ago = Math.abs(diffMin);
      if (ago < 60) return `${ago} phút trước`;
      if (ago < 1440) return `${Math.floor(ago / 60)} giờ trước`;
      return `${Math.floor(ago / 1440)} ngày trước`;
    }
    if (diffMin < 60) return `Sau ${diffMin} phút`;
    if (diffMin < 1440) return `Sau ${Math.floor(diffMin / 60)} giờ`;
    return `Sau ${Math.floor(diffMin / 1440)} ngày`;
  } catch {
    return "—";
  }
}