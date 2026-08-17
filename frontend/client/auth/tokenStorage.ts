export function decodeJwtSub(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload["sub"] as string) ?? null;
  } catch {
    return null;
  }
}

export function decodeJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload["exp"] as number) ?? null;
  } catch {
    return null;
  }
}

const STORAGE_KEY_ACCESS = "access_token";
const STORAGE_KEY_REFRESH = "refresh_token";
const STORAGE_KEY_USER = "user";

export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_ACCESS);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_REFRESH);
}

export function setAccessToken(t: string) {
  localStorage.setItem(STORAGE_KEY_ACCESS, t);
}

export function setRefreshToken(t: string) {
  localStorage.setItem(STORAGE_KEY_REFRESH, t);
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY_ACCESS);
  localStorage.removeItem(STORAGE_KEY_REFRESH);
  localStorage.removeItem(STORAGE_KEY_USER);
}
