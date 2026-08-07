import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiFetch } from "@/api/client";
import { ENDPOINT_NOTIFICATIONS } from "@/api/endpoints";
import { QK_NOTIFICATIONS } from "@/api/queryKeys";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: [QK_NOTIFICATIONS],
    queryFn: () => apiGet<Notification[]>(ENDPOINT_NOTIFICATIONS),
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`${ENDPOINT_NOTIFICATIONS}/${id}/read`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_NOTIFICATIONS] });
    },
  });
}
