import { useState } from "react";
import { Check, ChevronRight, FileText, Mail, Sparkles, Star, X, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { useProposal, useAcceptProposal, useRejectProposal, PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_TONE, formatCurrency } from "@/hooks/use-proposals";
import { useAddToShortlist } from "@/hooks/use-shortlists";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function ProposalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: proposal, isLoading, error } = useProposal(id ?? "");
  const accept = useAcceptProposal();
  const reject = useRejectProposal();
  const addToShortlist = useAddToShortlist();
  const [decisionMode, setDecisionMode] = useState<"none" | "reject">("none");
  const [rejectReason, setRejectReason] = useState("");

  if (isLoading) {
    return (
      <BusinessShell active="AI Matching">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="mt-4 grid gap-5 xl:grid-cols-[1fr_300px]">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </BusinessShell>
    );
  }

  if (error || !proposal) {
    return (
      <BusinessShell active="AI Matching">
        <div className="py-12 text-center">
          <p className="text-xs text-red-500">Không tải được proposal. Vui lòng thử lại.</p>
          <button
            type="button"
            onClick={() => navigate("/matching")}
            className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600"
          >
            Quay lại
          </button>
        </div>
      </BusinessShell>
    );
  }

  const statusTone = PROPOSAL_STATUS_TONE[proposal.status];
  const isPending = proposal.status === "PENDING";

  const handleShortlist = () => {
    addToShortlist.mutate({
      freelancer_id: proposal.freelancer_id,
      job_id: proposal.job_id,
      notes: `Shortlist từ proposal ${proposal.id.slice(0, 8)}`,
    });
  };

  const handleAccept = () => {
    if (confirm(`Chấp nhận proposal này? Trạng thái job sẽ chuyển sang IN_PROGRESS và các proposals khác sẽ bị từ chối.`)) {
      accept.mutate(proposal.id, {
        onSuccess: () => {
          navigate(`/contract-milestone?proposalId=${proposal.id}`);
        }
      });
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    reject.mutate(proposal.id);
  };

  return (
    <BusinessShell active="AI Matching">
      <div className="mb-3 flex items-center gap-2 text-[10px] text-slate-400">
        <button onClick={() => navigate("/matching")} className="hover:text-indigo-600">AI Matching</button>
        <ChevronRight size={12} />
        <span className="font-semibold text-indigo-600">Proposal #{proposal.id.slice(0, 8)}</span>
      </div>

      {/* Header */}
      <section className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-orange-100 text-lg font-bold text-indigo-700">
            FL
          </div>
          <div>
            <h1 className="text-sm font-extrabold">
              {proposal.freelancer?.display_name ?? `Freelancer ${proposal.freelancer_id.slice(0, 8)}`}
            </h1>
            <p className="mt-1 text-[10px] text-slate-500">
              {proposal.freelancer?.headline ?? "Freelancer"}
            </p>
            <div className="mt-1 flex gap-3 text-[9px] text-slate-400">
              <span>Mức giá: <b className="text-slate-700">{formatCurrency(proposal.bid_amount)}</b></span>
              <span>Thời gian: <b className="text-slate-700">{proposal.estimated_duration ?? "—"} ngày</b></span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${statusTone.bg} ${statusTone.text}`}>
            {PROPOSAL_STATUS_LABELS[proposal.status]}
          </span>
          {isPending && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleShortlist}
                disabled={addToShortlist.isPending}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-indigo-600"
              >
                <Star size={12} className="mr-1 inline" />
                Shortlist
              </button>
              <button
                type="button"
                onClick={() => setDecisionMode("reject")}
                className="rounded-lg border border-rose-200 px-4 py-2 text-[10px] font-bold text-rose-600"
              >
                <X size={12} className="mr-1 inline" />
                Từ chối
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={accept.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50"
              >
                {accept.isPending ? <Loader2 size={12} className="mr-1 inline animate-spin" /> : <Check size={12} className="mr-1 inline" />}
                Chấp nhận
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Reject Modal */}
      {decisionMode === "reject" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-sm font-bold">Từ chối proposal</h3>
            <p className="mb-3 text-xs text-slate-500">Vui lòng cho biết lý do từ chối (tùy chọn).</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Lý do từ chối..."
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 p-3 text-[11px] outline-none focus:border-indigo-300"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDecisionMode("none")}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={reject.isPending}
                className="rounded-lg bg-rose-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50"
              >
                {reject.isPending ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {/* Cover Letter */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-extrabold">Thư xin ứng tuyển</h2>
            <p className="mt-3 whitespace-pre-line text-[10px] leading-5 text-slate-600">
              {proposal.cover_letter}
            </p>
          </section>

          {/* Job context */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-extrabold">Thông tin công việc</h2>
            <div className="mt-3 grid gap-3 text-[10px] sm:grid-cols-2">
              <div>
                <p className="text-slate-400">Job ID</p>
                <p className="font-bold">{proposal.job_id.slice(0, 12)}…</p>
              </div>
              <div>
                <p className="text-slate-400">Ngày nộp</p>
                <p className="font-bold">{new Date(proposal.created_at).toLocaleString("vi-VN")}</p>
              </div>
              <div>
                <p className="text-slate-400">Bid amount</p>
                <p className="font-bold text-indigo-600">{formatCurrency(proposal.bid_amount)}</p>
              </div>
              <div>
                <p className="text-slate-400">Thời gian ước tính</p>
                <p className="font-bold">{proposal.estimated_duration ?? "—"} ngày</p>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-extrabold">Thông tin Freelancer</h2>
            {proposal.freelancer ? (
              <div className="mt-3 space-y-3 text-[10px]">
                <div>
                  <p className="text-slate-400">Tên hiển thị</p>
                  <p className="font-bold">{proposal.freelancer.display_name}</p>
                </div>
                {proposal.freelancer.headline && (
                  <div>
                    <p className="text-slate-400">Headline</p>
                    <p className="font-semibold">{proposal.freelancer.headline}</p>
                  </div>
                )}
                {proposal.freelancer.hourly_rate && (
                  <div>
                    <p className="text-slate-400">Mức giá / giờ</p>
                    <p className="font-bold text-indigo-600">{formatCurrency(proposal.freelancer.hourly_rate)}</p>
                  </div>
                )}
                <div>
                  <p className="text-slate-400">User ID</p>
                  <p className="font-mono text-[9px]">{proposal.freelancer.user_id}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[10px] text-slate-400">Không có thông tin chi tiết.</p>
            )}
          </section>

          <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
            <h2 className="text-xs font-extrabold">Hành động tiếp theo</h2>
            <ul className="mt-3 space-y-2 text-[10px] text-slate-600">
              <li><Sparkles size={11} className="mr-1 inline text-indigo-500" /> Review thư xin ứng tuyển</li>
              <li><Sparkles size={11} className="mr-1 inline text-indigo-500" /> Shortlist nếu phù hợp</li>
              <li><Sparkles size={11} className="mr-1 inline text-indigo-500" /> Chấp nhận hoặc từ chối</li>
            </ul>
          </section>
        </aside>
      </div>
    </BusinessShell>
  );
}