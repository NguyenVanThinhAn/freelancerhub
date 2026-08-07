import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch } from "@/api/client";
import type { ApiError } from "@/types/api";
import {
  ENDPOINT_CONTRACTS,
  ENDPOINT_CONTRACTS_MY,
  ENDPOINT_CONTRACTS_ID,
  ENDPOINT_CONTRACTS_ID_COMPLETE,
  ENDPOINT_MILESTONES_ID,
  ENDPOINT_MILESTONES_ID_SUBMIT,
  ENDPOINT_DELIVERABLES_ID,
  ENDPOINT_DELIVERABLES_ID_APPROVE,
  ENDPOINT_DELIVERABLES_ID_REJECT,
} from "@/api/endpoints";
import { QK_CONTRACTS_MY, QK_CONTRACT, QK_CONTRACT_DISPUTES } from "@/api/queryKeys";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContractStatus = "ACTIVE" | "COMPLETED" | "DISPUTED" | "CANCELLED";
export type MilestoneStatus = "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "PAID";
export type DeliverableStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export interface Milestone {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  amount: number;
  status: MilestoneStatus;
  due_date: string | null;
  created_at: string;
}

export interface ContractListItem {
  id: string;
  job_id: string;
  freelancer_id: string;
  organization_id: string;
  total_amount: number;
  status: ContractStatus;
  start_date: string;
  created_at: string;
}

export interface ContractDetail extends ContractListItem {
  proposal_id: string | null;
  end_date: string | null;
  milestones: Milestone[];
}

export interface MilestoneCreate {
  title: string;
  description?: string;
  amount: number;
  due_date?: string;
}

export interface WorkSubmission {
  content: string;
  file_urls?: string[];
}

export interface MilestoneReview {
  decision: "approve" | "reject";
  feedback?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Danh sách contracts của user (freelancer + organization) */
export function useMyContracts() {
  return useQuery({
    queryKey: [QK_CONTRACTS_MY],
    queryFn: () => apiGet<ContractListItem[]>(ENDPOINT_CONTRACTS_MY),
    staleTime: 30_000,
  });
}

/** Chi tiết 1 contract */
export function useContract(contractId: string) {
  return useQuery({
    queryKey: QK_CONTRACT(contractId),
    queryFn: () => apiGet<ContractDetail>(ENDPOINT_CONTRACTS_ID(contractId)),
    enabled: !!contractId,
    staleTime: 60_000,
  });
}

/** Tạo contract (query params — theo backend spec) */
export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { job_id: string; freelancer_id: string; total_amount: number; proposal_id?: string }) => {
      const qs = new URLSearchParams({
        job_id: params.job_id,
        freelancer_id: params.freelancer_id,
        total_amount: String(params.total_amount),
        ...(params.proposal_id ? { proposal_id: params.proposal_id } : {}),
      }).toString();
      return apiPost<ContractDetail>(`${ENDPOINT_CONTRACTS}?${qs}`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_CONTRACTS_MY] });
      toast.success("Đã tạo hợp đồng!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Tạo hợp đồng thất bại");
    },
  });
}

/** Tạo milestone cho contract */
export function useCreateMilestone(contractId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MilestoneCreate) =>
      apiPost<Milestone>(`${ENDPOINT_CONTRACTS_ID(contractId)}/milestones`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK_CONTRACT(contractId) });
      qc.invalidateQueries({ queryKey: [QK_CONTRACTS_MY] });
      toast.success("Đã thêm milestone!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Thêm milestone thất bại");
    },
  });
}

/** Submit work cho milestone (freelancer) */
export function useSubmitMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ milestoneId, payload }: { milestoneId: string; payload: WorkSubmission }) =>
      apiPost<void>(ENDPOINT_MILESTONES_ID_SUBMIT(milestoneId), payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_CONTRACTS_MY] });
      toast.success("Đã nộp bài!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Nộp bài thất bại");
    },
  });
}

/** Approve deliverable (organization) */
export function useApproveDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deliverableId: string) =>
      apiPost<void>(ENDPOINT_DELIVERABLES_ID_APPROVE(deliverableId), {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_CONTRACTS_MY] });
      toast.success("Đã nghiệm thu!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Nghiệm thu thất bại");
    },
  });
}

/** Reject deliverable (organization) */
export function useRejectDeliverable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deliverableId, feedback }: { deliverableId: string; feedback?: string }) =>
      apiPost<void>(ENDPOINT_DELIVERABLES_ID_REJECT(deliverableId), { decision: "reject", feedback }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_CONTRACTS_MY] });
      toast.info("Đã từ chối bài nộp");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Từ chối thất bại");
    },
  });
}

/** Complete contract */
export function useCompleteContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contractId: string) =>
      apiPost<void>(ENDPOINT_CONTRACTS_ID_COMPLETE(contractId), {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_CONTRACTS_MY] });
      toast.success("Đã hoàn thành hợp đồng!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Thao tác thất bại");
    },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  ACTIVE: "Đang hoạt động",
  COMPLETED: "Hoàn thành",
  DISPUTED: "Tranh chấp",
  CANCELLED: "Đã hủy",
};

export const CONTRACT_STATUS_TONE: Record<ContractStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: "bg-emerald-50", text: "text-emerald-600" },
  COMPLETED: { bg: "bg-slate-100", text: "text-slate-600" },
  DISPUTED: { bg: "bg-rose-50", text: "text-rose-600" },
  CANCELLED: { bg: "bg-slate-100", text: "text-slate-400" },
};

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  PENDING: "Chờ bắt đầu",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  APPROVED: "Đã duyệt",
  PAID: "Đã thanh toán",
};

export const MILESTONE_STATUS_TONE: Record<MilestoneStatus, { bg: string; text: string }> = {
  PENDING: { bg: "bg-slate-100", text: "text-slate-500" },
  IN_PROGRESS: { bg: "bg-amber-50", text: "text-amber-600" },
  SUBMITTED: { bg: "bg-sky-50", text: "text-sky-600" },
  APPROVED: { bg: "bg-emerald-50", text: "text-emerald-600" },
  PAID: { bg: "bg-indigo-50", text: "text-indigo-600" },
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}
