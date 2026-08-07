import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/api/client";
import type { ApiError } from "@/types/api";
import {
  ENDPOINT_PROPOSALS_MY,
  ENDPOINT_PROPOSALS_ID,
  ENDPOINT_PROPOSALS_ID_ACCEPT,
  ENDPOINT_PROPOSALS_ID_REJECT,
  ENDPOINT_PROPOSALS_ID_WITHDRAW,
} from "@/api/endpoints";
import {
  QK_PROPOSALS_MY,
  QK_PROPOSALS_JOB,
} from "@/api/queryKeys";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProposalSkill {
  id: string;
  name: string;
}

export interface ProposalFreelancer {
  user_id: string;
  display_name: string;
  headline: string | null;
  hourly_rate: number | null;
}

export interface ProposalListItem {
  id: string;
  job_id: string;
  freelancer_id: string;
  bid_amount: number;
  estimated_duration: number | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  created_at: string;
}

export interface ProposalDetail extends ProposalListItem {
  cover_letter: string;
  freelancer: ProposalFreelancer | null;
}

export interface ProposalCreate {
  cover_letter: string;
  bid_amount: number;
  estimated_duration?: number;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Proposals của freelancer hiện tại */
export function useMyProposals() {
  return useQuery({
    queryKey: [QK_PROPOSALS_MY],
    queryFn: () => apiGet<ProposalListItem[]>(ENDPOINT_PROPOSALS_MY),
    staleTime: 30_000,
  });
}

/** Proposals cho 1 job (organization view) */
export function useJobProposals(jobId: string) {
  return useQuery({
    queryKey: QK_PROPOSALS_JOB(jobId),
    queryFn: () => apiGet<ProposalListItem[]>(`/jobs/${jobId}/proposals`),
    enabled: !!jobId,
    staleTime: 30_000,
  });
}

/** Chi tiết 1 proposal */
export function useProposal(proposalId: string) {
  return useQuery({
    queryKey: ["proposals", proposalId],
    queryFn: () => apiGet<ProposalDetail>(ENDPOINT_PROPOSALS_ID(proposalId)),
    enabled: !!proposalId,
    staleTime: 60_000,
  });
}

/** Tạo proposal cho 1 job (freelancer submit) */
export function useCreateProposal(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProposalCreate) =>
      apiPost<ProposalDetail>(`/jobs/${jobId}/proposals`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_PROPOSALS_MY] });
      qc.invalidateQueries({ queryKey: QK_PROPOSALS_JOB(jobId) });
      toast.success("Đã gửi hồ sơ ứng tuyển!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Gửi hồ sơ thất bại");
    },
  });
}

/** Chấp nhận proposal (organization) */
export function useAcceptProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) =>
      apiPost<void>(ENDPOINT_PROPOSALS_ID_ACCEPT(proposalId), {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_PROPOSALS_MY] });
      toast.success("Đã chấp nhận hồ sơ!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Thao tác thất bại");
    },
  });
}

/** Từ chối proposal */
export function useRejectProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) =>
      apiPost<void>(ENDPOINT_PROPOSALS_ID_REJECT(proposalId), {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_PROPOSALS_MY] });
      toast.success("Đã từ chối hồ sơ");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Thao tác thất bại");
    },
  });
}

/** Rút lại proposal (freelancer) */
export function useWithdrawProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) =>
      apiPost<void>(ENDPOINT_PROPOSALS_ID_WITHDRAW(proposalId), {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_PROPOSALS_MY] });
      toast.success("Đã rút lại hồ sơ");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Thao tác thất bại");
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const PROPOSAL_STATUS_LABELS: Record<ProposalListItem["status"], string> = {
  PENDING: "Chờ duyệt",
  ACCEPTED: "Đã chấp nhận",
  REJECTED: "Đã từ chối",
  WITHDRAWN: "Đã rút",
};

export const PROPOSAL_STATUS_TONE: Record<ProposalListItem["status"], { bg: string; text: string }> = {
  PENDING: { bg: "bg-amber-50", text: "text-amber-600" },
  ACCEPTED: { bg: "bg-emerald-50", text: "text-emerald-600" },
  REJECTED: { bg: "bg-slate-100", text: "text-slate-500" },
  WITHDRAWN: { bg: "bg-slate-100", text: "text-slate-400" },
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
