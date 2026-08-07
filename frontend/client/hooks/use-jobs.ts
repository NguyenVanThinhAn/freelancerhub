import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/api/client";
import type { ApiError } from "@/types/api";
import { ENDPOINT_JOBS, ENDPOINT_JOBS_MY, ENDPOINT_CATEGORIES } from "@/api/endpoints";
import { QK_JOBS, QK_JOBS_MY, QK_CATEGORIES } from "@/api/queryKeys";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobSkill {
  id: string;
  name: string;
}

export interface JobListItem {
  id: string;
  title: string;
  description: string;
  category_id: string | null;
  budget_min: number | null;
  budget_max: number | null;
  payment_type: "FIXED" | "HOURLY";
  status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  created_at: string;
  skills: JobSkill[];
}

export interface JobDetail extends JobListItem {
  organization_id: string;
  job_type: string;
  requirements: string | null;
  benefits: string | null;
}

export interface JobCreate {
  title: string;
  description: string;
  category_id?: string;
  budget_min?: number;
  budget_max?: number;
  payment_type: "FIXED" | "HOURLY";
  skill_ids?: string[];  // backend field name (not skills)
}

export interface JobSearchQuery {
  status?: string;
  page?: number;
  page_size?: number;
  category_id?: string;
  skill_ids?: string;
  payment_type?: string;
  budget_min?: number;
  budget_max?: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useJobs(filters: JobSearchQuery = {}) {
  return useQuery({
    queryKey: [QK_JOBS, filters],
    queryFn: async () => {
      const params = new URLSearchParams(
        Object.entries(filters)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => [k, String(v)])
      ).toString();
      const qs = params ? `?${params}` : "";
      // Backend defaults status=OPEN when not provided; always send it for predictability
      const searchParams = new URLSearchParams(qs.replace("?", ""));
      if (!searchParams.has("status")) {
        searchParams.set("status", "OPEN");
      }
      const finalQs = searchParams.toString() ? `?${searchParams.toString()}` : "";
      return apiGet<JobListItem[]>(`${ENDPOINT_JOBS}${finalQs}`, false);
    },
    staleTime: 30_000,
  });
}

export function useMyJobs() {
  return useQuery({
    queryKey: [QK_JOBS_MY],
    queryFn: () => apiGet<JobListItem[]>(ENDPOINT_JOBS_MY),
    staleTime: 30_000,
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: [QK_JOBS, id],
    queryFn: () => apiGet<JobDetail>(`${ENDPOINT_JOBS}/${id}`, false),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: [QK_CATEGORIES],
    queryFn: () => apiGet<Category[]>(ENDPOINT_CATEGORIES), // auth=true by default
    staleTime: 5 * 60_000,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: JobCreate) =>
      apiPost<JobListItem>(ENDPOINT_JOBS, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_JOBS] });
      qc.invalidateQueries({ queryKey: [QK_JOBS_MY] });
      toast.success("Tạo tin tuyển dụng thành công!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Tạo thất bại");
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: JobCreate & { id: string }) =>
      apiPatch<JobListItem>(`${ENDPOINT_JOBS}/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_JOBS] });
      qc.invalidateQueries({ queryKey: [QK_JOBS_MY] });
      toast.success("Cập nhật thành công!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Cập nhật thất bại");
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<void>(`${ENDPOINT_JOBS}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_JOBS] });
      qc.invalidateQueries({ queryKey: [QK_JOBS_MY] });
      toast.success("Xóa tin tuyển dụng thành công!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Xóa thất bại");
    },
  });
}
