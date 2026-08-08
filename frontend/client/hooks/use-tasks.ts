import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiGet, apiPatch, apiDelete } from "@/api/client";
import { toast } from "sonner";
import type { ApiError } from "@/types/api";

export interface Task {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "Chưa bắt đầu" | "Đang thực hiện" | "Đã hoàn thành";
  assigned_to: string | null;
  created_at: string;
}

export interface TaskCreate {
  contract_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status?: "Chưa bắt đầu" | "Đang thực hiện" | "Đã hoàn thành";
  milestone_id?: string;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  due_date?: string;
  status?: "Chưa bắt đầu" | "Đang thực hiện" | "Đã hoàn thành";
  milestone_id?: string;
}

export function useTasks(contractId: string) {
  return useQuery({
    queryKey: ["tasks", contractId],
    queryFn: () => apiGet<Task[]>(`/tasks?contract_id=${contractId}`),
    enabled: Boolean(contractId),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TaskCreate) => apiPost<Task>("/tasks", payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks", variables.contract_id] });
      toast.success("Đã tạo công việc thành công!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Tạo công việc thất bại");
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: TaskUpdate }) =>
      apiPatch<Task>(`/tasks/${taskId}`, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks", data.contract_id] });
      toast.success("Đã cập nhật công việc!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Cập nhật công việc thất bại");
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId }: { taskId: string; contractId: string }) =>
      apiDelete<void>(`/tasks/${taskId}`),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["tasks", variables.contractId] });
      toast.success("Đã xóa công việc!");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Xóa công việc thất bại");
    },
  });
}
