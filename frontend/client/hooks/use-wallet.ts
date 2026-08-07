import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/api/client";
import type { ApiError } from "@/types/api";
import { ENDPOINT_WALLET, ENDPOINT_WALLET_DEPOSIT, ENDPOINT_WALLET_WITHDRAW, ENDPOINT_WALLET_TRANSACTIONS, ENDPOINT_CONTRACTS_MY } from "@/api/endpoints";
import { QK_WALLET, QK_WALLET_TRANSACTIONS, QK_CONTRACTS_MY } from "@/api/queryKeys";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  user_id?: string;
  organization_id?: string;
  balance: number;        // số dư khả dụng
  locked_balance: number;  // ký quỹ đang giữ
}

export interface Transaction {
  id: string;
  wallet_id: string;
  amount: number;
  transaction_type: TransactionType;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

export type TransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "ESCROW_LOCK"
  | "ESCROW_RELEASE"
  | "PAYMENT_SENT"
  | "PAYMENT_RECEIVED";

export interface ContractProject {
  id: string;
  job_id: string;
  freelancer_id: string;
  organization_id: string;
  total_amount: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  milestones?: { id: string; amount: number; status: string }[];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useWallet() {
  return useQuery({
    queryKey: [QK_WALLET],
    queryFn: () => apiGet<Wallet>(ENDPOINT_WALLET),
    staleTime: 30_000,
  });
}

export function useTransactions(limit = 50) {
  return useQuery({
    queryKey: [QK_WALLET_TRANSACTIONS, limit],
    queryFn: () => apiGet<Transaction[]>(`${ENDPOINT_WALLET_TRANSACTIONS}?limit=${limit}`),
    staleTime: 30_000,
  });
}

export function useContractProjects() {
  return useQuery({
    queryKey: [QK_CONTRACTS_MY],
    queryFn: () => apiGet<ContractProject[]>(ENDPOINT_CONTRACTS_MY),
    staleTime: 30_000,
  });
}

export function useDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) =>
      apiPost<void>(ENDPOINT_WALLET_DEPOSIT, { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_WALLET] });
      qc.invalidateQueries({ queryKey: [QK_WALLET_TRANSACTIONS] });
      toast.success("Nạp tiền thành công!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Nạp tiền thất bại");
    },
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) =>
      apiPost<void>(ENDPOINT_WALLET_WITHDRAW, { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_WALLET] });
      qc.invalidateQueries({ queryKey: [QK_WALLET_TRANSACTIONS] });
      toast.success("Rút tiền thành công!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Rút tiền thất bại");
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const TX_TYPE_LABELS: Record<TransactionType, string> = {
  DEPOSIT: "Nạp tiền",
  WITHDRAWAL: "Rút tiền",
  ESCROW_LOCK: "Ký quỹ",
  ESCROW_RELEASE: "Giải quỹ",
  PAYMENT_SENT: "Thanh toán đi",
  PAYMENT_RECEIVED: "Thanh toán đến",
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}
