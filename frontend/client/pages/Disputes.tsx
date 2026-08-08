import { useState } from "react";
import { AlertCircle, ChevronRight, FileText, Loader2, Plus, Send, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { apiGet, apiPost } from "@/api/client";
import {
  ENDPOINT_DISPUTES,
  ENDPOINT_DISPUTES_ID,
  ENDPOINT_DISPUTES_ID_EVIDENCE,
  ENDPOINT_CONTRACTS_MY,
} from "@/api/endpoints";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { ApiError } from "@/types/api";

interface Dispute {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  opened_by: string; // FIX: backend model là opened_by (không phải initiator_id)
  reason_code: string;
  description: string;
  severity: string;
  status:
    | "OPEN"
    | "UNDER_REVIEW"
    | "RESOLVED_FREELANCER"
    | "RESOLVED_CLIENT"
    | "MUTUAL_AGREEMENT"
    | "CLOSED";
  resolution_notes: string | null;
  resolution_json?: Record<string, unknown> | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface DisputeEvidence {
  id: string;
  dispute_id: string;
  submitter_id: string;
  evidence_text: string;
  file_urls: string[] | null;
  submitted_at: string;
}

interface ContractSummary {
  id: string;
  job_id?: string;
  freelancer_id: string;
  organization_id: string;
  status: string;
  total_amount: number;
  currency: string;
}

const STATUS_TONE: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-600",
  UNDER_REVIEW: "bg-sky-50 text-sky-600",
  RESOLVED_FREELANCER: "bg-emerald-50 text-emerald-600",
  RESOLVED_CLIENT: "bg-violet-50 text-violet-600",
  MUTUAL_AGREEMENT: "bg-slate-100 text-slate-600",
  CLOSED: "bg-slate-50 text-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Đang mở",
  UNDER_REVIEW: "Đang xem xét",
  RESOLVED_FREELANCER: "Giải quyết cho freelancer",
  RESOLVED_CLIENT: "Giải quyết cho khách",
  MUTUAL_AGREEMENT: "Thỏa thuận chung",
  CLOSED: "Đã đóng",
};

const REASON_CODE_OPTIONS = [
  { value: "delivery", label: "Không giao hàng / Giao trễ" },
  { value: "quality", label: "Chất lượng không đạt" },
  { value: "payment", label: "Vấn đề thanh toán" },
  { value: "conduct", label: "Vấn đề về hành vi" },
  { value: "other", label: "Khác" },
];

export default function Disputes() {
  const { id: disputeId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    contract_id: "",
    milestone_id: "",
    reason_code: "other",
    description: "",
    severity: "medium",
  });
  const [evidenceText, setEvidenceText] = useState("");

  // List disputes của user hiện tại (qua API mới GET /disputes)
  const { data: disputes, isLoading: listLoading } = useQuery({
    queryKey: ["disputes", "all"],
    queryFn: () => apiGet<Dispute[]>(ENDPOINT_DISPUTES),
    staleTime: 30_000,
  });

  // Detail
  const { data: dispute, isLoading: detailLoading } = useQuery({
    queryKey: ["dispute", disputeId],
    queryFn: () => apiGet<Dispute>(ENDPOINT_DISPUTES_ID(disputeId!)),
    enabled: !!disputeId,
    staleTime: 30_000,
  });

  // Evidence list (qua GET /disputes/{id}/evidence)
  const { data: evidences } = useQuery({
    queryKey: ["dispute", disputeId, "evidences"],
    queryFn: () => apiGet<DisputeEvidence[]>(`${ENDPOINT_DISPUTES_ID(disputeId!)}/evidence`),
    enabled: !!disputeId,
    staleTime: 30_000,
  });

  // User's contracts (cho dropdown mở dispute)
  const { data: contracts } = useQuery({
    queryKey: ["contracts", "my"],
    queryFn: () => apiGet<ContractSummary[]>(ENDPOINT_CONTRACTS_MY),
    staleTime: 60_000,
  });

  const createDispute = useMutation({
    mutationFn: (payload: typeof createForm) =>
      apiPost<Dispute>(ENDPOINT_DISPUTES, {
        contract_id: payload.contract_id,
        milestone_id: payload.milestone_id || null,
        reason_code: payload.reason_code,
        description: payload.description,
        severity: payload.severity,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Đã mở dispute");
      setShowCreate(false);
      setCreateForm({
        contract_id: "",
        milestone_id: "",
        reason_code: "other",
        description: "",
        severity: "medium",
      });
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Tạo dispute thất bại");
    },
  });

  const submitEvidence = useMutation({
    mutationFn: () =>
      apiPost<DisputeEvidence>(ENDPOINT_DISPUTES_ID_EVIDENCE(disputeId!), {
        evidence_text: evidenceText,
        file_urls: [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dispute", disputeId, "evidences"] });
      qc.invalidateQueries({ queryKey: ["dispute", disputeId] }); // refresh status (OPEN → UNDER_REVIEW)
      setEvidenceText("");
      toast.success("Đã nộp minh chứng");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Nộp minh chứng thất bại");
    },
  });

  // Detail view
  if (disputeId) {
    if (detailLoading) {
      return (
        <BusinessShell active="Tranh chấp">
          <Skeleton className="h-32 w-full rounded-2xl" />
        </BusinessShell>
      );
    }
    if (!dispute) {
      return (
        <BusinessShell active="Tranh chấp">
          <div className="py-12 text-center">
            <p className="text-xs text-red-500">Không tải được dispute.</p>
          </div>
        </BusinessShell>
      );
    }
    const isClosed = dispute.status === "CLOSED";
    const isResolved =
      dispute.status === "RESOLVED_FREELANCER" ||
      dispute.status === "RESOLVED_CLIENT" ||
      dispute.status === "MUTUAL_AGREEMENT";

    return (
      <BusinessShell active="Tranh chấp">
        <div className="mb-3 flex items-center gap-2 text-[10px] text-slate-400">
          <button onClick={() => navigate("/disputes")} className="hover:text-indigo-600">
            Disputes
          </button>
          <ChevronRight size={12} />
          <span className="font-semibold text-indigo-600">#{dispute.id.slice(0, 8)}</span>
        </div>
        <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-extrabold">Dispute #{dispute.id.slice(0, 8)}</h1>
              <p className="mt-1 text-[10px] text-slate-400">
                Hợp đồng #{dispute.contract_id.slice(0, 8)} ·{" "}
                {new Date(dispute.created_at).toLocaleString("vi-VN")}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${STATUS_TONE[dispute.status] ?? "bg-slate-100"}`}
            >
              {STATUS_LABEL[dispute.status] ?? dispute.status}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-[10px]">
            <div>
              <p className="text-slate-400">Lý do</p>
              <p className="mt-0.5 font-semibold text-slate-700">
                {REASON_CODE_OPTIONS.find((r) => r.value === dispute.reason_code)?.label ??
                  dispute.reason_code}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Mức độ nghiêm trọng</p>
              <p className="mt-0.5 font-semibold text-slate-700 capitalize">
                {dispute.severity}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
            <p className="text-[10px] font-bold text-amber-700">Mô tả chi tiết:</p>
            <p className="mt-1 whitespace-pre-line text-[10px] text-slate-700">
              {dispute.description}
            </p>
          </div>
          {isResolved && dispute.resolution_notes && (
            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
              <p className="text-[10px] font-bold text-emerald-700">Kết quả giải quyết:</p>
              <p className="mt-1 whitespace-pre-line text-[10px] text-slate-700">
                {dispute.resolution_notes}
              </p>
              {dispute.resolved_at && (
                <p className="mt-2 text-[9px] text-slate-400">
                  Resolved lúc {new Date(dispute.resolved_at).toLocaleString("vi-VN")}
                </p>
              )}
            </div>
          )}
          {isClosed && dispute.closed_at && (
            <p className="mt-3 text-[9px] text-slate-400">
              Closed lúc {new Date(dispute.closed_at).toLocaleString("vi-VN")}
            </p>
          )}
        </section>

        {/* Evidence submit — chỉ khi dispute chưa closed */}
        {!isClosed && (
          <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-xs font-extrabold">Nộp minh chứng</h2>
            <textarea
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              placeholder="Mô tả chi tiết vấn đề, link tài liệu liên quan..."
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 p-3 text-[10px] outline-none focus:border-indigo-300"
            />
            <button
              type="button"
              onClick={() => evidenceText.trim() && submitEvidence.mutate()}
              disabled={!evidenceText.trim() || submitEvidence.isPending}
              className="mt-3 flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50"
            >
              {submitEvidence.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Send size={12} />
              )}
              Gửi minh chứng
            </button>
          </section>
        )}

        {/* Evidence timeline */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-extrabold">
            Lịch sử minh chứng ({evidences?.length ?? 0})
          </h2>
          {!evidences || evidences.length === 0 ? (
            <p className="py-6 text-center text-[10px] text-slate-400">
              Chưa có minh chứng nào.
            </p>
          ) : (
            <div className="space-y-3">
              {evidences.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold">User {ev.submitter_id.slice(0, 8)}</p>
                    <p className="text-[9px] text-slate-400">
                      {new Date(ev.submitted_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-[10px] text-slate-600">
                    {ev.evidence_text}
                  </p>
                  {ev.file_urls && ev.file_urls.length > 0 && (
                    <div className="mt-2 flex gap-2">
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
        </section>
      </BusinessShell>
    );
  }

  return (
    <BusinessShell active="Tranh chấp">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="mb-1 text-[11px] font-medium text-slate-400">Workspace / Tranh chấp</p>
          <h1 className="text-[24px] font-extrabold tracking-tight">Quản lý tranh chấp</h1>
          <p className="mt-1 text-xs text-slate-500">
            Mở và theo dõi các dispute với hợp đồng của bạn.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white"
        >
          <Plus size={14} />
          Mở dispute
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        {listLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !disputes?.length ? (
          <div className="text-center">
            <AlertCircle size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 text-xs text-slate-400">Chưa có dispute nào.</p>
            <p className="mt-1 text-[10px] text-slate-400">
              Bấm "Mở dispute" để bắt đầu khiếu nại với 1 hợp đồng.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[9px] text-slate-400">
                  <th className="py-2 font-semibold">Mã</th>
                  <th className="font-semibold">Contract</th>
                  <th className="font-semibold">Lý do</th>
                  <th className="font-semibold">Mức độ</th>
                  <th className="font-semibold">Trạng thái</th>
                  <th className="font-semibold">Ngày mở</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <tr
                    key={d.id}
                    className="cursor-pointer border-b border-slate-50 text-[10px] last:border-0 hover:bg-slate-50"
                    onClick={() => navigate(`/disputes/${d.id}`)}
                  >
                    <td className="py-3 font-mono">{d.id.slice(0, 8)}</td>
                    <td>{d.contract_id.slice(0, 8)}…</td>
                    <td className="max-w-[300px] truncate">
                      {REASON_CODE_OPTIONS.find((r) => r.value === d.reason_code)?.label ??
                        d.reason_code}
                    </td>
                    <td className="capitalize">{d.severity}</td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-1 text-[8px] font-semibold ${STATUS_TONE[d.status] ?? "bg-slate-100"}`}
                      >
                        {STATUS_LABEL[d.status] ?? d.status}
                      </span>
                    </td>
                    <td className="text-slate-400">
                      {new Date(d.created_at).toLocaleDateString("vi-VN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create dispute modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">Mở dispute mới</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-700">
                  Hợp đồng
                </label>
                <select
                  value={createForm.contract_id}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, contract_id: e.target.value }))
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300"
                >
                  <option value="">-- Chọn hợp đồng --</option>
                  {contracts?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id.slice(0, 8)}… ({c.status}) —{" "}
                      {c.total_amount?.toLocaleString("vi-VN")} {c.currency}
                    </option>
                  ))}
                </select>
                {!contracts?.length && (
                  <p className="mt-1 text-[9px] text-slate-400">
                    Bạn chưa có hợp đồng nào để mở dispute.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-700">
                  Lý do
                </label>
                <select
                  value={createForm.reason_code}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, reason_code: e.target.value }))
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none"
                >
                  {REASON_CODE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-700">
                  Mức độ nghiêm trọng
                </label>
                <select
                  value={createForm.severity}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, severity: e.target.value }))
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none"
                >
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                  <option value="critical">Nghiêm trọng</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-700">
                  Mô tả chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={4}
                  placeholder="Mô tả chi tiết vấn đề (tối thiểu 10 ký tự)..."
                  className="w-full resize-none rounded-lg border border-slate-200 p-3 text-[11px] outline-none focus:border-indigo-300"
                />
                <p className="mt-1 text-[9px] text-slate-400">
                  {createForm.description.length}/2000 ký tự
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!createForm.contract_id) {
                    toast.error("Vui lòng chọn hợp đồng");
                    return;
                  }
                  if (createForm.description.trim().length < 10) {
                    toast.error("Mô tả phải có tối thiểu 10 ký tự");
                    return;
                  }
                  createDispute.mutate(createForm);
                }}
                disabled={createDispute.isPending}
                className="rounded-lg bg-rose-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50"
              >
                {createDispute.isPending ? "Đang mở..." : "Mở dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </BusinessShell>
  );
}
