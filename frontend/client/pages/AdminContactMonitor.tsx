import { useState } from "react";
import {
  Check,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { apiGet, apiPatch } from "@/api/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { ApiError } from "@/types/api";

type ExchangeStatus = "PENDING" | "APPROVED" | "FLAGGED";
type PatternType = "EMAIL" | "PHONE_VN" | "PHONE_INTL" | "SOCIAL_LINK" | "UNKNOWN";

interface ContactExchange {
  id: string;
  thread_id: string;
  sender_id: string;
  pattern_type: PatternType;
  raw_content: string;
  status: ExchangeStatus;
  bypass_reason: string | null;
  created_at: string;
}

interface ListResponse {
  total: number;
  items: ContactExchange[];
}

const PATTERN_ICON: Record<PatternType, string> = {
  EMAIL: "[E]",
  PHONE_VN: "[P]",
  PHONE_INTL: "[P]",
  SOCIAL_LINK: "[L]",
  UNKNOWN: "[?]",
};

const PATTERN_LABEL: Record<PatternType, string> = {
  EMAIL: "Email",
  PHONE_VN: "So dien thoai VN",
  PHONE_INTL: "So dien thoai QT",
  SOCIAL_LINK: "Social Link",
  UNKNOWN: "Khong xac dinh",
};

const STATUS_TONE: Record<ExchangeStatus, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  FLAGGED: "bg-rose-50 text-rose-600",
};

const STATUS_LABEL: Record<ExchangeStatus, string> = {
  PENDING: "Cho duyet",
  APPROVED: "Da gui CB",
  FLAGGED: "Vi pham",
};

export default function AdminContactMonitor() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ExchangeStatus | "">("PENDING");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bypassReason, setBypassReason] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const { data: list, isLoading } = useQuery<ListResponse>({
    queryKey: ["admin", "contact-exchanges", statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      const qs = params.toString();
      return apiGet(`/admin/contact-exchanges${qs ? `?${qs}` : ""}`);
    },
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const totalPages = list ? Math.max(1, Math.ceil(list.total / PAGE_SIZE)) : 1;

  const warnAndLockMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiPatch(`/admin/contact-exchanges/${id}/bypass`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "contact-exchanges"] });
      toast.success("Da gui canh bao va khoa chat");
      setSelectedId(null);
      setBypassReason("");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Thao tac that bai");
    },
  });

  const flagMutation = useMutation({
    mutationFn: (id: string) =>
      apiPatch(`/admin/contact-exchanges/${id}/flag`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "contact-exchanges"] });
      toast.success("Da gan co vi pham");
      setSelectedId(null);
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Thao tac that bai");
    },
  });

  const selected = list?.items.find((i) => i.id === selectedId) ?? null;

  const stats = {
    total: list?.total ?? 0,
    pending: list?.items.filter((i) => i.status === "PENDING").length ?? 0,
    approved: list?.items.filter((i) => i.status === "APPROVED").length ?? 0,
    flagged: list?.items.filter((i) => i.status === "FLAGGED").length ?? 0,
  };

  return (
    <BusinessShell active="Admin">
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-medium text-slate-400">
          Quan ly / Admin
        </p>
        <h1 className="text-[24px] font-extrabold tracking-tight">
          Giam sat trao doi lien lac
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Phat hien email, SDT, social link trong chat.{" "}
          <ShieldCheck size={11} className="inline text-indigo-500" />{" "}
          Chi admin moi truy cap duoc trang nay.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[10px] text-slate-400">Tong ban ghi</p>
          <p className="mt-1 text-xl font-extrabold">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[10px] text-slate-400">Cho duyet</p>
          <p className="mt-1 text-xl font-extrabold text-amber-600">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[10px] text-slate-400">Da gui CB</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-600">
            {stats.approved}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[10px] text-slate-400">Vi pham</p>
          <p className="mt-1 text-xl font-extrabold text-rose-600">
            {stats.flagged}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-extrabold">Hang doi</h2>
            <span className="text-[10px] text-slate-400">
              {list?.total ?? 0} ban ghi
            </span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ExchangeStatus | "");
              setPage(1);
              setSelectedId(null);
            }}
            className="mb-3 h-8 w-full rounded-lg border border-slate-200 px-2 text-[10px] text-slate-600 outline-none focus:border-indigo-300"
          >
            <option value="">Tat ca</option>
            <option value="PENDING">Cho duyet</option>
            <option value="APPROVED">Da gui CB</option>
            <option value="FLAGGED">Vi pham</option>
          </select>

          {isLoading ? (
            <div className="max-h-[calc(100vh-360px)] min-h-[120px] space-y-3 overflow-y-auto pr-1">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !list?.items?.length ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Khong co ban ghi nao.
            </div>
          ) : (
            <div className="max-h-[calc(100vh-360px)] space-y-2 overflow-y-auto pr-1">
              {list.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setBypassReason(item.bypass_reason ?? "");
                  }}
                  className={`flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition ${
                    selectedId === item.id
                      ? "border-indigo-300 bg-indigo-50/50"
                      : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      {PATTERN_ICON[item.pattern_type]}{" "}
                      {PATTERN_LABEL[item.pattern_type]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-[8px] font-semibold ${STATUS_TONE[item.status] ?? "bg-slate-100 text-slate-500"}`}
                    >
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </div>
                  <p className="truncate font-mono text-[9px] text-indigo-600">
                    {item.raw_content}
                  </p>
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span>Thread #{item.thread_id.slice(0, 8)}</span>
                    <span>
                      {new Date(item.created_at).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {list && list.total > PAGE_SIZE && (
            <div className="mt-3 flex items-center justify-between text-[10px]">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                Truoc
              </button>
              <span className="text-slate-400">
                Trang {page}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          {!selected ? (
            <div className="py-16 text-center">
              <AlertTriangle size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-xs text-slate-400">
                Chon mot ban ghi de xem chi tiet
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold">
                    {PATTERN_ICON[selected.pattern_type]}{" "}
                    {PATTERN_LABEL[selected.pattern_type]}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-semibold ${STATUS_TONE[selected.status] ?? "bg-slate-100 text-slate-500"}`}
                  >
                    {STATUS_LABEL[selected.status] ?? selected.status}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Thread #{selected.thread_id.slice(0, 8)} -{" "}
                  {new Date(selected.created_at).toLocaleString("vi-VN")}
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-500">Noi dung:</p>
                <p className="mt-1 font-mono text-[10px] text-indigo-700 break-all">
                  {selected.raw_content}
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Sender ID</span>
                <span className="font-mono text-slate-600">
                  {selected.sender_id}
                </span>
              </div>

              {selected.bypass_reason && (
                <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                  <p className="text-[10px] font-bold text-amber-700">
                    Ghi chu canh bao:
                  </p>
                  <p className="mt-1 text-[10px] text-slate-700">
                    {selected.bypass_reason}
                  </p>
                </div>
              )}

              <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-slate-100 bg-white p-4">
                {selected.status === "PENDING" ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-amber-100 bg-amber-50/30 p-3">
                      <p className="mb-2 text-[10px] font-bold text-amber-700">
                        Ghi chu canh bao (tuy chon):
                      </p>
                      <textarea
                        value={bypassReason}
                        onChange={(e) => setBypassReason(e.target.value)}
                        placeholder="VD: Trao doi thong tin lien lac khong duoc phep..."
                        rows={2}
                        className="w-full resize-none rounded-lg border border-slate-200 p-2 text-[10px] outline-none focus:border-indigo-300"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(null);
                          setBypassReason("");
                        }}
                        className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600"
                      >
                        Huy
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          warnAndLockMutation.mutate({
                            id: selected.id,
                            reason: bypassReason || undefined,
                          })
                        }
                        disabled={warnAndLockMutation.isPending}
                        className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50"
                      >
                        {warnAndLockMutation.isPending ? (
                          <Loader2
                            size={12}
                            className="mx-auto animate-spin"
                          />
                        ) : (
                          <>
                            <AlertTriangle
                              size={12}
                              className="mr-1 inline"
                            />
                            Gui canh bao & Khoa chat
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => flagMutation.mutate(selected.id)}
                        disabled={flagMutation.isPending}
                        className="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50"
                      >
                        {flagMutation.isPending ? (
                          <Loader2
                            size={12}
                            className="mx-auto animate-spin"
                          />
                        ) : (
                          <>
                            <AlertTriangle
                              size={12}
                              className="mr-1 inline"
                            />
                            Gan co vi pham
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : selected.status === "FLAGGED" ? (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 p-3 text-[10px] text-rose-700">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>Da gui canh bao. Chat da bi khoa.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-[10px] text-emerald-700">
                    <Check size={14} className="shrink-0" />
                    <span>Da gui canh bao. Chat da bi khoa.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </BusinessShell>
  );
}
