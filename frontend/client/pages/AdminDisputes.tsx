import { useState } from "react";
import {
  Check,
  ChevronRight,
  FileText,
  Loader2,
  Scale,
  ShieldCheck,
  X,
} from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { apiGet, apiPost } from "@/api/client";
import {
  ENDPOINT_ADMIN_DISPUTES,
  ENDPOINT_DISPUTES_ID,
  ENDPOINT_DISPUTES_ID_EVIDENCE,
  ENDPOINT_DISPUTES_ID_RESOLVE,
} from "@/api/endpoints";
import { QK_ADMIN_DISPUTES } from "@/api/queryKeys";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { ApiError } from "@/types/api";

interface Dispute {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  initiator_id: string;
  reason: string;
  status:
    | "OPEN"
    | "UNDER_REVIEW"
    | "RESOLVED_FREELANCER"
    | "RESOLVED_CLIENT"
    | "MUTUAL_AGREEMENT";
  resolution_notes: string | null;
  created_at: string;
}

interface DisputeEvidence {
  id: string;
  dispute_id: string;
  submitter_id: string;
  evidence_text: string;
  file_urls: string[] | null;
  submitted_at: string;
}

interface ListResponse {
  total: number;
  items: Dispute[];
}

const STATUS_TONE: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-600",
  UNDER_REVIEW: "bg-sky-50 text-sky-600",
  RESOLVED_FREELANCER: "bg-emerald-50 text-emerald-600",
  RESOLVED_CLIENT: "bg-violet-50 text-violet-600",
  MUTUAL_AGREEMENT: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Đang mở",
  UNDER_REVIEW: "Đang xem xét",
  RESOLVED_FREELANCER: "Giải quyết cho freelancer",
  RESOLVED_CLIENT: "Giải quyết cho khách",
  MUTUAL_AGREEMENT: "Thỏa thuận chung",
};

const RESOLVE_OPTIONS = [
  {
    value: "freelancer",
    label: "Giải quyết cho Freelancer",
    desc: "100% số tiền milestone trao cho freelancer",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
    activeColor: "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400",
  },
  {
    value: "client",
    label: "Giải quyết cho Khách hàng",
    desc: "Hoàn tiền 100% cho khách hàng",
    color: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100",
    activeColor: "border-violet-500 bg-violet-50 ring-2 ring-violet-400",
  },
  {
    value: "split",
    label: "Chia tỷ lệ",
    desc: "Tự chọn % cho freelancer và khách hàng",
    color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
    activeColor: "border-amber-500 bg-amber-50 ring-2 ring-amber-400",
  },
];

export default function AdminDisputes() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // ── Resolve form ──────────────────────────────────────────────────────────
  const [resolveMode, setResolveMode] = useState(false);
  const [resolveType, setResolveType] = useState<string>("freelancer");
  const [splitPct, setSplitPct] = useState(50);
  const [notes, setNotes] = useState("");

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: QK_ADMIN_DISPUTES(statusFilter, page),
    queryFn: () =>
      apiGet<ListResponse>(
        ENDPOINT_ADMIN_DISPUTES({
          status: statusFilter || undefined,
          page,
          limit: PAGE_SIZE,
        }),
      ),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const totalPages = list ? Math.max(1, Math.ceil(list.total / PAGE_SIZE)) : 1;

  const { data: dispute, isLoading: detailLoading } = useQuery({
    queryKey: ["admin", "dispute", selectedId],
    queryFn: () => apiGet<Dispute>(ENDPOINT_DISPUTES_ID(selectedId!)),
    enabled: !!selectedId,
    staleTime: 30_000,
  });

  const { data: evidences } = useQuery({
    queryKey: ["admin", "dispute", selectedId, "evidences"],
    queryFn: () =>
      apiGet<DisputeEvidence[]>(
        ENDPOINT_DISPUTES_ID_EVIDENCE(selectedId!),
      ).catch(() => [] as DisputeEvidence[]),
    enabled: !!selectedId,
    staleTime: 30_000,
  });

  const resolveMutation = useMutation({
    mutationFn: () =>
      apiPost<Dispute>(ENDPOINT_DISPUTES_ID_RESOLVE(selectedId!), {
        resolution_type: resolveType,
        freelancer_percentage:
          resolveType === "split" ? splitPct : resolveType === "freelancer" ? 100 : 0,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      const id = selectedId;
      qc.invalidateQueries({ queryKey: ["admin", "disputes"] });
      qc.invalidateQueries({ queryKey: ["admin", "dispute", id] });
      toast.success("Đã giải quyết dispute");
      setResolveMode(false);
      setResolveType("freelancer");
      setSplitPct(50);
      setNotes("");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Giải quyết thất bại");
    },
  });

  const isResolved = dispute &&
    (dispute.status === "RESOLVED_FREELANCER" ||
      dispute.status === "RESOLVED_CLIENT" ||
      dispute.status === "MUTUAL_AGREEMENT");

  return (
    <BusinessShell active="Admin">
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-medium text-slate-400">
          Workspace / Admin
        </p>
        <h1 className="text-[24px] font-extrabold tracking-tight">
          Xử lý tranh chấp
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Review disputes, xem minh chứng và đưa ra phán quyết giải quyết.
        </p>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[420px_1fr]">
        {/* ── Dispute List ─────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-extrabold">Danh sách disputes</h2>
            <span className="text-[10px] text-slate-400">
              {list?.total ?? 0} cases
            </span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
              setSelectedId(null);
            }}
            className="mb-3 h-8 w-full rounded-lg border border-slate-200 px-2 text-[10px] text-slate-600 outline-none focus:border-indigo-300"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="OPEN">Đang mở</option>
            <option value="UNDER_REVIEW">Đang xem xét</option>
            <option value="RESOLVED_FREELANCER">Đã giải — Freelancer</option>
            <option value="RESOLVED_CLIENT">Đã giải — Khách</option>
            <option value="MUTUAL_AGREEMENT">Thỏa thuận chung</option>
          </select>

          {listLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !list?.items?.length ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Không có dispute nào.
            </p>
          ) : (
            <div className="space-y-2">
              {list.items.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(d.id);
                    setResolveMode(false);
                  }}
                  className={`flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition ${
                    selectedId === d.id
                      ? "border-indigo-300 bg-indigo-50/50"
                      : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-700">
                      #{d.id.slice(0, 8)}
                    </p>
                    <span
                      className={`rounded-full px-2 py-1 text-[8px] font-semibold ${STATUS_TONE[d.status] ?? "bg-slate-100"}`}
                    >
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[9px] text-slate-400">
                    {d.reason.slice(0, 100)}
                    {d.reason.length > 100 ? "…" : ""}
                  </p>
                  <div className="text-[9px] text-slate-400">
                    {new Date(d.created_at).toLocaleDateString("vi-VN")}
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
                ← Trước
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
                Sau →
              </button>
            </div>
          )}
        </section>

        {/* ── Dispute Detail ───────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          {!selectedId ? (
            <div className="py-16 text-center">
              <Scale size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-xs text-slate-400">
                Chọn một dispute để xem chi tiết
              </p>
            </div>
          ) : detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : dispute ? (
            <div className="space-y-5">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold">
                    Dispute #{dispute.id.slice(0, 8)}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-semibold ${STATUS_TONE[dispute.status] ?? "bg-slate-100"}`}
                  >
                    {STATUS_LABEL[dispute.status] ?? dispute.status}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Contract #{dispute.contract_id.slice(0, 8)}
                  {dispute.milestone_id
                    ? ` · Milestone #${dispute.milestone_id.slice(0, 8)}`
                    : ""}
                  {` · Mở lúc ${new Date(dispute.created_at).toLocaleString("vi-VN")}`}
                </p>
              </div>

              {/* Reason */}
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                <p className="text-[10px] font-bold text-amber-700">
                  Lý do mở dispute:
                </p>
                <p className="mt-1 whitespace-pre-line text-[10px] text-slate-700">
                  {dispute.reason}
                </p>
              </div>

              {/* Resolution notes */}
              {dispute.resolution_notes && (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="text-[10px] font-bold text-emerald-700">
                    Kết quả giải quyết:
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[10px] text-slate-700">
                    {dispute.resolution_notes}
                  </p>
                </div>
              )}

              {/* Evidence timeline */}
              <div>
                <h3 className="mb-2 flex items-center gap-1 text-[11px] font-bold">
                  <FileText size={11} className="text-slate-500" />
                  Minh chứng ({evidences?.length ?? 0})
                </h3>
                {!evidences || evidences.length === 0 ? (
                  <p className="py-4 text-center text-[10px] text-slate-400">
                    Chưa có minh chứng nào.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {evidences.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-lg border border-slate-100 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold">
                            User #{ev.submitter_id.slice(0, 8)}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            {new Date(ev.submitted_at).toLocaleString("vi-VN")}
                          </p>
                        </div>
                        <p className="mt-2 whitespace-pre-line text-[10px] text-slate-600">
                          {ev.evidence_text}
                        </p>
                        {ev.file_urls && ev.file_urls.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {ev.file_urls.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded bg-slate-50 px-2 py-1 text-[9px] text-indigo-600 hover:bg-slate-100"
                              >
                                <FileText size={10} />
                                File {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Action panel ──────────────────────────────────────── */}
              <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-slate-100 bg-white p-4">
                {isResolved ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-[10px] text-emerald-700">
                    <Check size={14} className="shrink-0" />
                    <span>Dispute đã được giải quyết. Không thể thay đổi.</span>
                  </div>
                ) : resolveMode ? (
                  <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                    <p className="text-[11px] font-bold">
                      Phán quyết giải quyết dispute
                    </p>

                    {/* Resolution type options */}
                    <div className="grid gap-2 sm:grid-cols-3">
                      {RESOLVE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setResolveType(opt.value)}
                          className={`rounded-lg border p-3 text-left transition ${
                            resolveType === opt.value
                              ? opt.activeColor
                              : `${opt.color} border-transparent`
                          }`}
                        >
                          <p className="text-[10px] font-bold">{opt.label}</p>
                          <p className="mt-0.5 text-[9px] opacity-75">
                            {opt.desc}
                          </p>
                        </button>
                      ))}
                    </div>

                    {/* Split slider */}
                    {resolveType === "split" && (
                      <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                        <p className="mb-2 text-[10px] font-bold text-amber-700">
                          Chia tỷ lệ — Freelancer: {splitPct}% / Khách:{" "}
                          {100 - splitPct}%
                        </p>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={splitPct}
                          onChange={(e) =>
                            setSplitPct(Number(e.target.value))
                          }
                          className="w-full accent-amber-500"
                        />
                        <div className="mt-1 flex justify-between text-[9px] text-amber-600">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ghi chú phán quyết (tuỳ chọn)..."
                      rows={2}
                      className="w-full resize-none rounded-lg border border-slate-200 p-3 text-[10px] outline-none focus:border-indigo-300"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResolveMode(false);
                          setNotes("");
                          setResolveType("freelancer");
                          setSplitPct(50);
                        }}
                        className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveMutation.mutate()}
                        disabled={resolveMutation.isPending}
                        className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50"
                      >
                        {resolveMutation.isPending ? (
                          <Loader2
                            size={12}
                            className="mx-auto animate-spin"
                          />
                        ) : (
                          <>
                            <Check size={12} className="mr-1 inline" />
                            Xác nhận phán quyết
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setResolveMode(true)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-600 px-4 py-2.5 text-[10px] font-bold text-white"
                    >
                      <Scale size={12} className="mr-1" />
                      Phán quyết giải quyết
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-red-500">
              Không tải được chi tiết dispute.
            </p>
          )}
        </section>
      </div>
    </BusinessShell>
  );
}
