import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { clearAccessToken, setAccessToken, setOnUnauthorized, getAccessToken, getRefreshToken, clearTokens } from "@/api/client";
import { decodeJwtSub, decodeJwtExp } from "./tokenStorage";
import { ENDPOINT_AUTH_LOGIN, ENDPOINT_AUTH_REFRESH } from "@/api/endpoints";
import type { BaseResponse } from "@/types/api";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: "freelancer" | "business" | "admin";
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface TokenOut {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });
  const [isLoading] = useState(false);
  const navigate = useNavigate();

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    navigate("/login");
  }, [navigate]);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`/api/v1${ENDPOINT_AUTH_REFRESH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as BaseResponse<TokenOut>;
      if (json.status_code && json.status_code >= 400) return false;
      const tokens = json.data as TokenOut;
      setAccessToken(tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem("refresh_token", tokens.refresh_token);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // Register 401 handler so apiFetch can trigger logout
  useEffect(() => {
    setOnUnauthorized(logout);
  }, [logout]);

  // Auto-refresh token 1 minute before expiry
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const exp = decodeJwtExp(token);
    if (!exp) return;
    const now = Math.floor(Date.now() / 1000);
    const msUntilRefresh = (exp - now - 60) * 1000;
    if (msUntilRefresh <= 0) {
      refreshAccessToken();
      return;
    }
    const timer = setTimeout(() => {
      refreshAccessToken();
    }, msUntilRefresh);
    return () => clearTimeout(timer);
  }, [user, refreshAccessToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`/api/v1${ENDPOINT_AUTH_LOGIN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password } satisfies LoginPayload),
      });

      const json = (await res.json()) as BaseResponse<TokenOut>;

      if (!res.ok || (json.status_code && json.status_code >= 400)) {
        throw new Error(json.message ?? `Login failed (${res.status})`);
      }

      const tokens = json.data as TokenOut;
      setAccessToken(tokens.access_token);
      if (tokens.refresh_token) {
        localStorage.setItem("refresh_token", tokens.refresh_token);
      }

      const userId = decodeJwtSub(tokens.access_token) ?? "";
      // Decode role from JWT payload if available, otherwise default to "business"
      let role: User["role"] = "business";
      try {
        const payload = JSON.parse(atob(tokens.access_token.split(".")[1]));
        if (payload.role === "admin" || payload.role === "freelancer" || payload.role === "enterprise") {
          role = payload.role === "enterprise" ? "business" : (payload.role as User["role"]);
        }
      } catch {
        // ignore decode errors
      }
      const u: User = { id: userId, email, fullName: email.split("@")[0], role };
      setUser(u);
      localStorage.setItem("user", JSON.stringify(u));
    },
    [],
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
