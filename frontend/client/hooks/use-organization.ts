import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/api/client";
import { ENDPOINT_ORGANIZATION_PROFILE } from "@/api/endpoints";
import { QK_ORGANIZATION_PROFILE } from "@/api/queryKeys";

export interface OrganizationProfile {
  id: string;
  name: string;
  industry?: string;
  description?: string;
  website?: string;
  tax_code?: string;   // backend field name (not tax_id)
  verification_status?: string;
  logo_url?: string;
}

export function useOrganizationProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QK_ORGANIZATION_PROFILE],
    queryFn: () => apiGet<OrganizationProfile>(ENDPOINT_ORGANIZATION_PROFILE),
    staleTime: 5 * 60_000,
    enabled: options?.enabled,
  });
}
