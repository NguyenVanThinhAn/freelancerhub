import { useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Send,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { apiGet, apiPost } from "@/api/client";
import {
  ENDPOINT_DISPUTES,
  ENDPOINT_DISPUTES_ID,
  ENDPOINT_DISPUTES_ID_EVIDENCE,
  ENDPOINT_CONTRACTS_ID_DISPUTES,
} from "@/api/endpoints";
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

export default function Disputes() {
  const { id: disputeId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    contract_id: "",
    milestone_id: "",
    reason: "",
    severity: "medium",
  });
  const [evidenceText, setEvidenceText] = useState("");

  // List disputes của tôi (qua contract/my thì cần list contracts trước)
  // Đơn giản hóa: list disputes theo từng contract của user
  const { data: disputes, isLoading: listLoading } = useQuery({
    queryKey: ["disputes", "all"],
    queryFn: async () => {
      // Backend không có endpoint list tất cả disputes của user
      // → Trả về empty list, dùng per-contract endpoint khi cần
      return [] as Dispute[];
    },
    staleTime: 30_000,
  });

  // Detail
  const { data: dispute, isLoading: detailLoading } = useQuery({
    queryKey: ["dispute", disputeId],
    queryFn: () => apiGet<Dispute>(ENDPOINT_DISPUTES_ID(disputeId!)),
    enabled: !!disputeId,
    staleTime: 30_000,
  });

  // Evidence list — từ detail; simplified: fetch all via a helper if needed
  const { data: evidences } = useQuery({
    queryKey: ["dispute", disputeId, "evidences"],
    queryFn: () =>
      apiGet<DisputeEvidence[]>(`/disputes/${disputeId}/evidence`).catch(
        () => [],
      ),
    enabled: !!disputeId,
    staleTime: 30_000,
  });

  const createDispute = useMutation({
    mutationFn: (payload: typeof createForm) =>
      apiPost<Dispute>(ENDPOINT_DISPUTES, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Đã mở dispute");
      setShowCreate(false);
      setCreateForm({
        contract_id: "",
        milestone_id: "",
        reason: "",
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
    return (
      <BusinessShell active="Tranh chấp">
        <div className="mb-3 flex items-center gap-2 text-[10px] text-slate-400">
          <button
            onClick={() => navigate("/disputes")}
            className="hover:text-indigo-600"
          >
            Disputes
          </button>
          <ChevronRight size={12} />
          <span className="font-semibold text-indigo-600">
            #{dispute.id.slice(0, 8)}
          </span>
        </div>
        <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-extrabold">
                Dispute #{dispute.id.slice(0, 8)}
              </h1>
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
          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50/50 p-3">
            <p className="text-[10px] font-bold text-amber-700">
              Lý do mở dispute:
            </p>
            <p className="mt-1 whitespace-pre-line text-[10px] text-slate-700">
              {dispute.reason}
            </p>
          </div>
          {dispute.resolution_notes && (
            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
              <p className="text-[10px] font-bold text-emerald-700">
                Kết quả giải quyết:
              </p>
              <p className="mt-1 whitespace-pre-line text-[10px] text-slate-700">
                {dispute.resolution_notes}
              </p>
            </div>
          )}
        </section>

        {/* Evidence submit */}
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

        {/* Evidence timeline */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-extrabold">
            Lịch sử minh chứng ({evidences?.length ?? 0})
          </h2>
          {!evidences || evidences.length === 0 ? (
            <p className="text-center text-[10px] text-slate-400 py-6">
              Chưa có minh chứng nào.
            </p>
          ) : (
            <div className="space-y-3">
              {evidences.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-lg border border-slate-100 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold">
                      User {ev.submitter_id.slice(0, 8)}
                    </p>
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
          <p className="mb-1 text-[11px] font-medium text-slate-400">
            Workspace / Tranh chấp
          </p>
          <h1 className="text-[24px] font-extrabold tracking-tight">
            Quản lý tranh chấp
          </h1>
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
            <p className="text-[10px] text-slate-400 mt-1">
              Để xem dispute, mở từ trang chi tiết hợp đồng hoặc tạo mới ở nút
              trên.
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
                  <th className="font-semibold">Trạng thái</th>
                  <th className="font-semibold">Ngày mở</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-slate-50 text-[10px] last:border-0 cursor-pointer hover:bg-slate-50"
                    onClick={() => navigate(`/disputes/${d.id}`)}
                  >
                    <td className="py-3 font-mono">{d.id.slice(0, 8)}</td>
                    <td>{d.contract_id.slice(0, 8)}…</td>
                    <td className="max-w-[300px] truncate">{d.reason}</td>
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
                  Contract ID
                </label>
                <input
                  value={createForm.contract_id}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      contract_id: e.target.value,
                    }))
                  }
                  placeholder="UUID của hợp đồng"
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-700">
                  Milestone ID (tùy chọn)
                </label>
                <input
                  value={createForm.milestone_id}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      milestone_id: e.target.value,
                    }))
                  }
                  placeholder="UUID milestone (nếu có)"
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300"
                />
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
                  Lý do / Mô tả
                </label>
                <textarea
                  value={createForm.reason}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, reason: e.target.value }))
                  }
                  rows={4}
                  placeholder="Mô tả chi tiết vấn đề..."
                  className="w-full resize-none rounded-lg border border-slate-200 p-3 text-[11px] outline-none focus:border-indigo-300"
                />
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
                  if (!createForm.contract_id || !createForm.reason) {
                    toast.error("Vui lòng nhập Contract ID và lý do");
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
