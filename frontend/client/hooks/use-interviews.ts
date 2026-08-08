import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiGet } from "@/api/client";
import { toast } from "sonner";
import type { ApiError } from "@/types/api";

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
  status: "SCHEDULED" | "COMPLETED" | "CANCELED";
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

export function useInterviews(proposalId?: string) {
  return useQuery({
    queryKey: ["interviews", proposalId],
    queryFn: async () => {
      const params = proposalId ? `?proposal_id=${proposalId}` : "";
      return apiGet<Interview[]>(`/interviews${params}`);
    },
  });
}
