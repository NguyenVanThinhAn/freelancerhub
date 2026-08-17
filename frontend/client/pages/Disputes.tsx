import { useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Send,
  X,
  CheckCircle2,
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
import { useMyContracts } from "@/hooks/use-contracts";

interface Dispute {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  opened_by: string;
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

const STATUS_TONE: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-600",
  UNDER_REVIEW: "bg-sky-50 text-sky-600",
  RESOLVED_FREELANCER: "bg-emerald-50 text-emerald-600",
  RESOLVED_CLIENT: "bg-violet-50 text-violet-600",
  MUTUAL_AGREEMENT: "bg-slate-100 text-slate-600",
  CLOSED: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Đang mở",
  UNDER_REVIEW: "Đang xem xét",
  RESOLVED_FREELANCER: "Giải quyết cho freelancer",
  RESOLVED_CLIENT: "Giải quyết cho khách",
  MUTUAL_AGREEMENT: "Thỏa thuận chung",
  CLOSED: "Đã đóng",
};

const REASON_LABEL: Record<string, string> = {
  delivery: "Giao hàng / Hoàn thành",
  quality: "Ch?t l??ng",
  payment: "Thanh toán",
  conduct: "Thái ?? / Hành vi",
  other: "Khác",
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

  // List disputes
  const { data: disputes = [], isLoading: listLoading } = useQuery<Dispute[]>({
    queryKey: ["disputes", "all"],
    queryFn: async () => {
      const res = await apiGet<Dispute[]>("/disputes");
      return res || [];
    },
    staleTime: 30_000,
  });

  // Contract list for create form
  const { data: contracts = [] } = useMyContracts();

  // Detail
  const { data: dispute, isLoading: detailLoading } = useQuery<Dispute>({
    queryKey: ["dispute", disputeId],
    queryFn: () => apiGet(ENDPOINT_DISPUTES_ID(disputeId!)),
    enabled: !!disputeId,
    staleTime: 30_000,
  });

  // Evidence list
  const { data: evidences = [] } = useQuery<DisputeEvidence[]>({
    queryKey: ["dispute", disputeId, "evidences"],
    queryFn: () =>
      apiGet(ENDPOINT_DISPUTES_ID_EVIDENCE(disputeId!)).catch(() => []),
    enabled: !!disputeId,
    staleTime: 30_000,
  });

  const createDispute = useMutation({
    mutationFn: (payload: { contract_id: string; reason: string; severity: string }) =>
      apiPost(ENDPOINT_DISPUTES, payload) as Promise<Dispute>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disputes"] });
      toast.success("Đã mở dispute");
      setShowCreate(false);
      setCreateForm({ contract_id: "", milestone_id: "", reason: "", severity: "medium" });
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e?.message || "T?o dispute th?t b?i");
    },
  });

  const submitEvidence = useMutation({
    mutationFn: () =>
      apiPost(ENDPOINT_DISPUTES_ID_EVIDENCE(disputeId!), {
        evidence_text: evidenceText,
        file_urls: [],
      }) as Promise<DisputeEvidence>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dispute", disputeId, "evidences"] });
      setEvidenceText("");
      toast.success("Đã nộp minh chứng");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e?.message || "Nạp minh chứng thất bại");
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
          <div className="text-center py-20 text-slate-400">Không tìm thấy dispute</div>
        </BusinessShell>
      );
    }
    return (
      <BusinessShell active="Tranh chấp">
        <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
          <button onClick={() => navigate("/disputes")} className="hover:text-indigo-600">
            Tranh chấp
          </button>
          <ChevronRight size={12} />
          <span className="text-slate-600">#{disputeId?.slice(0, 8)}</span>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Chi tiết tranh chấp</h1>
              <p className="mt-1 text-sm text-slate-400">
                Mở lúc {new Date(dispute.created_at).toLocaleString("vi-VN")}
              </p>
            </div>
            <span
              className={
                "rounded-full px-3 py-1 text-xs font-medium " +
                (STATUS_TONE[dispute.status] || "bg-slate-100 text-slate-600")
              }
            >
              {STATUS_LABEL[dispute.status] || dispute.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-slate-100 p-4">
              <div className="text-xs text-slate-400">Lý do</div>
              <div className="mt-1 font-medium">{dispute.description}</div>
              <div className="mt-1 text-xs text-slate-400">
                Mã: {REASON_LABEL[dispute.reason_code] || dispute.reason_code}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <div className="text-xs text-slate-400">Mức độ nghiêm trọng</div>
              <div className="mt-1 font-medium capitalize">{dispute.severity}</div>
              <div className="mt-1 text-xs text-slate-400">
                Contract: {dispute.contract_id?.slice(0, 8)}...
              </div>
            </div>
          </div>

          {dispute.resolution_notes && (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="text-xs font-medium text-emerald-600">K?t qu? gi?i quy?t</div>
              <div className="mt-1 text-sm">{dispute.resolution_notes}</div>
            </div>
          )}

          {/* Evidence section */}
          <div className="mt-6">
            <h3 className="mb-3 font-semibold text-slate-700">Minh chứng</h3>
            {evidences.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                Chưa có minh chứng nào
              </div>
            ) : (
              <div className="space-y-3">
                {evidences.map((ev) => (
                  <div key={ev.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between">
                      <div className="text-sm">{ev.evidence_text}</div>
                      <div className="ml-3 shrink-0 text-xs text-slate-400">
                        {new Date(ev.submitted_at).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Submit evidence form */}
            {dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW" ? (
              <div className="mt-4">
                <textarea
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  placeholder="Nhập nội dung minh chứng..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                  rows={3}
                />
                <button
                  onClick={() => submitEvidence.mutate()}
                  disabled={!evidenceText.trim() || submitEvidence.isPending}
                  className="mt-2 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitEvidence.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Nạp minh chứng
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </BusinessShell>
    );
  }

  // List view
  return (
    <BusinessShell active="Tranh chấp">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tranh chấp</h1>
          <p className="mt-1 text-sm text-slate-400">
            {disputes.length} tranh chấp
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus size={14} />
          Mở tranh chấp
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Mở tranh chấp mới</h2>
            <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Hợp đồng
              </label>
              <select
                value={createForm.contract_id}
                onChange={(e) => setCreateForm({ ...createForm, contract_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              >
                <option value="">-- Chọn hợp đồng --</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.job_title || c.id.slice(0, 8)} ({(c.status || "").toLowerCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Lý do tranh chấp
              </label>
              <textarea
                value={createForm.reason}
                onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                placeholder="Mô tả chi tiết lý do..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                rows={3}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Mức độ nghiêm trọng
              </label>
              <select
                value={createForm.severity}
                onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              >
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
                <option value="critical">Nghiêm trọng</option>
              </select>
            </div>

            <button
              onClick={() => {
                if (!createForm.contract_id || !createForm.reason.trim()) {
                  toast.error("Vui lòng điền đầy đủ thông tin");
                  return;
                }
                createDispute.mutate({
                  contract_id: createForm.contract_id,
                  reason: createForm.reason,
                  severity: createForm.severity,
                });
              }}
              disabled={createDispute.isPending}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createDispute.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Xác nhận mở tranh chấp
            </button>
          </div>
        </div>
      )}

      {/* Dispute list */}
      {listLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-20 text-center">
          <AlertCircle size={40} className="text-slate-300" />
          <p className="mt-3 font-medium text-slate-500">Chưa có tranh chấp nào</p>
          <p className="mt-1 text-sm text-slate-400">
            Mở tranh chấp khi cần giải quyết bất đồng
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <div
              key={d.id}
              onClick={() => navigate(`/disputes/${d.id}`)}
              className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-slate-400">#{d.id.slice(0, 8)}</span>
                    <span
                      className={
                        "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                        (STATUS_TONE[d.status] || "bg-slate-100 text-slate-600")
                      }
                    >
                      {STATUS_LABEL[d.status] || d.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-700">{d.description}</p>
                  <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
                    <span>H?: {d.contract_id.slice(0, 8)}...</span>
                    <span>Mức: {d.severity}</span>
                    <span>{REASON_LABEL[d.reason_code] || d.reason_code}</span>
                    <span>{new Date(d.created_at).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="mt-1 shrink-0 text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      )}
    </BusinessShell>
  );
}
