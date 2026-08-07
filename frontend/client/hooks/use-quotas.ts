import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/api/client";
import { ENDPOINT_QUOTAS_ME } from "@/api/endpoints";
import { QK_QUOTAS } from "@/api/queryKeys";

export interface QuotaItem {
  id: string;
  feature: string;
  limit_count: number;
  used_count: number;
  reset_date: string | null;
}

export function useQuotas() {
  return useQuery({
    queryKey: [QK_QUOTAS],
    queryFn: () => apiGet<QuotaItem[]>(ENDPOINT_QUOTAS_ME),
    staleTime: 60_000,
  });
}
