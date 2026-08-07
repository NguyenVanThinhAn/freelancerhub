import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, Lock, MoreHorizontal, Search, ShieldCheck, Unlock, UserCheck, UserX } from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { apiGet, apiPatch } from "@/api/client";
import { ENDPOINT_ADMIN_USERS, ENDPOINT_ADMIN_USERS_ID_LOCK, ENDPOINT_ADMIN_USERS_UNLOCK } from "@/api/endpoints";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { ApiError } from "@/types/api";

interface AdminUser {
  id: string;
  email: string;
  status: string;
  role: string;
  last_login_at: string | null;
  failed_login_count: number;
  locked_until: string | null;
}

const ROLE_TONE: Record<string, string> = {
  admin: "bg-rose-50 text-rose-600",
  enterprise: "bg-indigo-50 text-indigo-600",
  freelancer: "bg-sky-50 text-sky-600",
};

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-600",
  pending_verification: "bg-amber-50 text-amber-600",
  locked: "bg-rose-50 text-rose-600",
  suspended: "bg-slate-100 text-slate-500",
  deleted: "bg-slate-200 text-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Hoạt động",
  pending_verification: "Chờ xác thực",
  locked: "Bị khóa",
  suspended: "Tạm ngưng",
  deleted: "Đã xóa",
};

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiGet<AdminUser[]>(ENDPOINT_ADMIN_USERS),
    staleTime: 30_000,
  });

  const lockUser = useMutation({
    mutationFn: (userId: string) => apiPatch<unknown>(ENDPOINT_ADMIN_USERS_ID_LOCK(userId), {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Đã khóa tài khoản");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Khóa thất bại");
    },
  });

  const unlockUser = useMutation({
    mutationFn: (userId: string) => apiPatch<unknown>(ENDPOINT_ADMIN_USERS_UNLOCK(userId), {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Đã mở khóa tài khoản");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Mở khóa thất bại");
    },
  });

  const filtered = (users ?? []).filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (search && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: users?.length ?? 0,
    active: users?.filter((u) => u.status === "active").length ?? 0,
    pending: users?.filter((u) => u.status === "pending_verification").length ?? 0,
    locked: users?.filter((u) => u.status === "locked").length ?? 0,
  };

  return (
    <BusinessShell active="Admin">
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-medium text-slate-400">Workspace / Admin</p>
        <h1 className="text-[24px] font-extrabold tracking-tight">Quản lý người dùng</h1>
        <p className="mt-1 text-xs text-slate-500">
          Quản lý tài khoản, khóa/mở khóa users. <ShieldCheck size={11} className="inline text-indigo-500" /> Chỉ admin mới truy cập được trang này.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[10px] text-slate-400">Tổng users</p>
          <p className="mt-1 text-xl font-extrabold">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[10px] text-slate-400">Đang hoạt động</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-600">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[10px] text-slate-400">Chờ xác thực</p>
          <p className="mt-1 text-xl font-extrabold text-amber-600">{stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[10px] text-slate-400">Bị khóa</p>
          <p className="mt-1 text-xl font-extrabold text-rose-600">{stats.locked}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Tìm theo email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg bg-slate-50 pl-9 text-[10px] outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 px-3 text-[10px] text-slate-500"
        >
          <option value="">Tất cả role</option>
          <option value="freelancer">Freelancer</option>
          <option value="enterprise">Enterprise</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Table */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-2 w-24" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center text-xs text-red-500">
            Bạn không có quyền truy cập trang này (yêu cầu role admin).
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">Không tìm thấy user.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="border-y border-slate-100 text-[9px] text-slate-400">
                <tr>
                  <th className="py-2 font-semibold">Email</th>
                  <th className="font-semibold">Role</th>
                  <th className="font-semibold">Trạng thái</th>
                  <th className="font-semibold">Đăng nhập cuối</th>
                  <th className="font-semibold">Sai mật khẩu</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 text-[10px] last:border-0">
                    <td className="py-3">
                      <p className="font-bold text-slate-700">{u.email}</p>
                      <p className="text-[8px] text-slate-400">{u.id.slice(0, 8)}…</p>
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${ROLE_TONE[u.role] ?? "bg-slate-100 text-slate-500"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${STATUS_TONE[u.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {STATUS_LABEL[u.status] ?? u.status}
                      </span>
                    </td>
                    <td className="text-slate-500">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString("vi-VN") : "—"}
                    </td>
                    <td className="text-slate-500">{u.failed_login_count}</td>
                    <td>
                      {u.role !== "admin" && (
                        <div className="flex gap-2 text-slate-400">
                          {u.status === "locked" ? (
                            <button
                              type="button"
                              onClick={() => unlockUser.mutate(u.id)}
                              disabled={unlockUser.isPending}
                              className="hover:text-emerald-500"
                              title="Mở khóa"
                            >
                              <Unlock size={13} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Khóa tài khoản ${u.email}?`)) {
                                  lockUser.mutate(u.id);
                                }
                              }}
                              disabled={lockUser.isPending}
                              className="hover:text-rose-500"
                              title="Khóa tài khoản"
                            >
                              <Lock size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </BusinessShell>
  );
}