import type { BaseResponse } from "@/types/api";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";

// ─── Debug toggle ────────────────────────────────────────────────────────────
// Enable with: localStorage.setItem("apiDebug", "1") in browser console
// Disable with: localStorage.removeItem("apiDebug")

function debugLog(prefix: string, color: string, ...args: unknown[]) {
  if (localStorage.getItem("apiDebug") === "1") {
    console.debug(`%c[API] ${prefix}`, `color:${color};font-weight:bold`, ...args);
  }
}

// ─── Token management ────────────────────────────────────────────────────────

let accessToken: string | null = localStorage.getItem("access_token");

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem("access_token", token);
  } else {
    localStorage.removeItem("access_token");
  }
}

export function clearAccessToken() {
  accessToken = null;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token");
}

export function clearTokens() {
  clearAccessToken();
}

// ─── 401 callback ────────────────────────────────────────────────────────────

type UnauthorizedCallback = () => void;
let onUnauthorized: UnauthorizedCallback = () => {};

export function setOnUnauthorized(cb: UnauthorizedCallback) {
  onUnauthorized = cb;
}

// ─── Core fetch ─────────────────────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init;

  const h = new Headers(headers as HeadersInit);
  if (auth && accessToken) {
    h.set("Authorization", `Bearer ${accessToken}`);
  }
  if (rest.body && !(rest.body instanceof FormData) && !h.has("Content-Type")) {
    h.set("Content-Type", "application/json");
  }

  debugLog("→", "#3b82f6", `${init.method ?? "GET"} ${API_BASE}${path}`, auth && accessToken ? "(auth)" : "(no-auth)");

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers: h });

  debugLog("←", res.ok ? "#22c55e" : "#ef4444", `${res.status} ${res.statusText} ${path}`);

  if (res.status === 401 && auth) {
    onUnauthorized();
  }

  let json: BaseResponse<unknown>;
  try {
    json = (await res.json()) as BaseResponse<unknown>;
  } catch {
    throw new Error(`Invalid JSON response from ${path} (status ${res.status})`);
  }

  if (!res.ok || (json.status_code && json.status_code >= 400)) {
    const msg = json.message ?? `HTTP ${res.status}`;
    debugLog("✗ ERR", "#ef4444", msg, "| status:", json.status_code ?? res.status, "| detail:", json.error);
    throw Object.assign(new Error(msg), {
      status: json.status_code ?? res.status,
      detail: json.error,
    });
  }

  debugLog("✓ OK", "#22c55e", path, "| data:", json.data !== null ? "present" : "null");
  return json.data as T;
}

// ─── Shorthands ─────────────────────────────────────────────────────────────

export const apiGet = <T>(path: string, auth = true) =>
  apiFetch<T>(path, { method: "GET", auth });

export const apiPost = <T>(path: string, body: unknown, auth = true) =>
  apiFetch<T>(path, { method: "POST", body: JSON.stringify(body), auth });

export const apiPatch = <T>(
  path: string,
  body: unknown,
  auth = true,
  extraHeaders?: Record<string, string>,
) =>
  apiFetch<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
    auth,
    headers: extraHeaders,
  });

export const apiDelete = <T>(path: string, auth = true) =>
  apiFetch<T>(path, { method: "DELETE", auth });
