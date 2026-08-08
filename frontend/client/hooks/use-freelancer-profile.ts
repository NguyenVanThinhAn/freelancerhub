import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiFetch } from "@/api/client";
import {
  ENDPOINT_FREELANCER_PROFILE,
  ENDPOINT_FREELANCER_SKILLS,
  ENDPOINT_FREELANCER_PORTFOLIO,
  ENDPOINT_FREELANCER_CV_IMPORT,
} from "@/api/endpoints";
import {
  QK_FREELANCER_PROFILE,
  QK_FREELANCER_SKILLS,
  QK_FREELANCER_PORTFOLIO,
  QK_FREELANCER_CV_IMPORT,
} from "@/api/queryKeys";

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

export interface Skill {
  id: string;
  name: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  image_path?: string | null;
}

// ─── Profile (basic) ────────────────────────────────────────────────────────

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

// ─── Skills ─────────────────────────────────────────────────────────────────

export function useFreelancerSkills(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QK_FREELANCER_SKILLS],
    queryFn: () => apiGet<Skill[]>(ENDPOINT_FREELANCER_SKILLS),
    staleTime: 5 * 60_000,
    enabled: options?.enabled,
  });
}

export function useUpdateFreelancerSkills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (skills: string[]) =>
      apiFetch<null>(ENDPOINT_FREELANCER_SKILLS, {
        method: "PUT",
        body: JSON.stringify({ skills }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK_FREELANCER_SKILLS] }),
  });
}

// ─── Portfolio ──────────────────────────────────────────────────────────────

export function useFreelancerPortfolio(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QK_FREELANCER_PORTFOLIO],
    queryFn: () => apiGet<PortfolioItem[]>(ENDPOINT_FREELANCER_PORTFOLIO),
    staleTime: 5 * 60_000,
    enabled: options?.enabled,
  });
}

export function useAddPortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; url?: string }) =>
      apiFetch<{ portfolio_id: string }>(ENDPOINT_FREELANCER_PORTFOLIO, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK_FREELANCER_PORTFOLIO] }),
  });
}

// ─── CV import ───────────────────────────────────────────────────────────────

export interface CVImportData {
  has_cv: boolean;
  cv_document_id?: string;
  cv_status?: string;
  overall_confidence?: number | null;
  completeness_percent?: number | null;
  full_name?: string | null;
  headline_hint?: string | null;
  skills: string[];
  education_summary: Array<{ degree?: string; institution?: string; duration?: string }>;
  projects_summary: Array<{ title?: string; type?: string }>;
}

export function useCVImport(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QK_FREELANCER_CV_IMPORT],
    queryFn: async () => {
      const res = await apiGet<CVImportData>(ENDPOINT_FREELANCER_CV_IMPORT);
      return res ?? { has_cv: false, skills: [], education_summary: [], projects_summary: [] };
    },
    staleTime: 5 * 60_000,
    enabled: options?.enabled,
  });
}