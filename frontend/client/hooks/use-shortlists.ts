import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiDelete } from "@/api/client";
import type { ApiError } from "@/types/api";
import {
  ENDPOINT_SHORTLISTS,
  ENDPOINT_SHORTLISTS_ID,
} from "@/api/endpoints";
import { QK_SHORTLISTS } from "@/api/queryKeys";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShortlistItem {
  id: string;
  organization_id: string;
  freelancer_id: string;
  job_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface ShortlistCreate {
  freelancer_id: string;
  job_id?: string;
  notes?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Lấy danh sách freelancer đã shortlist (của Organization owner) */
export function useShortlists() {
  return useQuery({
    queryKey: [QK_SHORTLISTS],
    queryFn: () => apiGet<ShortlistItem[]>(ENDPOINT_SHORTLISTS),
    staleTime: 30_000,
  });
}

/** Thêm freelancer vào shortlist */
export function useAddToShortlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ShortlistCreate) =>
      apiPost<ShortlistItem>(ENDPOINT_SHORTLISTS, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_SHORTLISTS] });
      toast.success("Đã lưu vào shortlist");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Không thể lưu shortlist");
    },
  });
}

/** Xóa khỏi shortlist */
export function useRemoveFromShortlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<void>(ENDPOINT_SHORTLISTS_ID(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_SHORTLISTS] });
      toast.success("Đã xóa khỏi shortlist");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Xóa thất bại");
    },
  });
}