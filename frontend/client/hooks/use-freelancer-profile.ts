import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/api/client";
import { ENDPOINT_FREELANCER_PROFILE } from "@/api/endpoints";
import { QK_FREELANCER_PROFILE } from "@/api/queryKeys";

export interface FreelancerProfile {
  display_name?: string;
  headline?: string;
  bio?: string;
  experience_years?: number;
  hourly_rate?: number;
  currency?: string;
  availability_status?: string;
  profile_completion?: number;
}

export function useFreelancerProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QK_FREELANCER_PROFILE],
    queryFn: () => apiGet<FreelancerProfile>(ENDPOINT_FREELANCER_PROFILE),
    staleTime: 5 * 60_000,
    enabled: options?.enabled,
  });
}

export function useUpdateFreelancerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FreelancerProfile>) =>
      apiPatch<null>(ENDPOINT_FREELANCER_PROFILE, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK_FREELANCER_PROFILE] }),
  });
}
