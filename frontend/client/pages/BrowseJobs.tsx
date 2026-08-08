import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { useJobs, useCategories } from "@/hooks/use-jobs";
import { useCreateProposal, useMyProposals } from "@/hooks/use-proposals";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BriefcaseBusiness,
  Search,
  Filter,
  MapPin,
  Clock,
  DollarSign,
  Sparkles,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/hooks/use-wallet";

const STATUS_TONE: Record<string, string> = {
  OPEN: "bg-emerald-50 text-emerald-600",
  IN_PROGRESS: "bg-amber-50 text-amber-600",
  COMPLETED: "bg-slate-100 text-slate-500",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Đang tuyển",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

function formatBudgetRange(min: number | null | undefined, max: number | null | undefined): string {
  if (!min && !max) return "Thỏa thuận";
  if (min && max) return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  if (min) return `Từ ${formatCurrency(min)}`;
  return `Đến ${formatCurrency(max)}`;
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
    return d.toLocaleDateString("vi-VN");
  } catch {
    return "—";
  }
}

export default function BrowseJobs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [applyJobId, setApplyJobId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [duration, setDuration] = useState("");

  const filters = {
    category_id: categoryId || undefined,
    payment_type: paymentType || undefined,
  };

  const { data: jobs, isLoading, error } = useJobs(filters);
  const { data: categories } = useCategories();
  const { data: myProposals } = useMyProposals();
  const createProposal = useCreateProposal(applyJobId ?? "");

  // Job nào tôi đã apply rồi?
  const appliedJobIds = new Set(myProposals?.map((p) => p.job_id) ?? []);

  const filtered = (jobs ?? []).filter(
    (j) => !search || j.title.toLowerCase().includes(search.toLowerCase()),
  );

  const openApply = (jobId: string) => {
    setApplyJobId(jobId);
    setCoverLetter("");
    setBidAmount("");
    setDuration("");
  };

  const submitApply = () => {
    if (!applyJobId) return;
    if (!bidAmount || Number(bidAmount) <= 0) {
      toast.error("Vui lòng nhập mức giá chào hợp lệ");
      return;
    }
    if (!coverLetter.trim()) {
      toast.error("Vui lòng viết thư xin ứng tuyển");
      return;
    }
    createProposal.mutate(
      {
        cover_letter: coverLetter,
        bid_amount: Number(bidAmount),
        estimated_duration: duration ? Number(duration) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Đã gửi hồ sơ ứng tuyển!");
          setApplyJobId(null);
        },
      },
    );
  };

  const appliedCount = appliedJobIds.size;

  return (
    <BusinessShell active="Tìm việc">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[11px] font-medium text-slate-400">Freelancer / Tìm việc</p>
          <h1 className="text-[24px] font-extrabold tracking-tight">Tìm công việc mới</h1>
          <p className="mt-1 text-xs text-slate-500">
            Khám phá các cơ hội phù hợp với kỹ năng và kinh nghiệm của bạn.
          </p>
        </div>
        {appliedCount > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-bold text-emerald-700">
            Bạn đã ứng tuyển {appliedCount} tin
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Tìm kiếm theo vị trí, kỹ năng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg bg-slate-50 pl-9 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 px-3 text-[11px] text-slate-500"
        >
          <option value="">Tất cả danh mục</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 px-3 text-[11px] text-slate-500"
        >
          <option value="">Tất cả hình thức</option>
          <option value="FIXED">Giá cố định</option>
          <option value="HOURLY">Theo giờ</option>
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-600">
          Không tải được danh sách việc làm. Vui lòng thử lại.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <BriefcaseBusiness size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-xs font-semibold text-slate-700">Chưa có công việc phù hợp</p>
          <p className="mt-1 text-[10px] text-slate-400">
            Thử thay đổi bộ lọc hoặc quay lại sau.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((job) => {
            const hasApplied = appliedJobIds.has(job.id);
            return (
              <article
                key={job.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <BriefcaseBusiness size={18} />
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                      STATUS_TONE[job.status] ?? "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {STATUS_LABEL[job.status] ?? job.status}
                  </span>
                </div>

                <h3 className="text-[13px] font-extrabold leading-tight text-slate-900 line-clamp-2">
                  {job.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">{job.description}</p>

                <div className="mt-3 flex flex-wrap gap-2 text-[9px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <DollarSign size={10} className="text-emerald-500" />
                    <b>{formatBudgetRange(job.budget_min, job.budget_max)}</b>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} className="text-slate-400" />
                    {job.payment_type === "FIXED" ? "Giá cố định" : "Theo giờ"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} className="text-slate-400" />
                    {formatRelative(job.created_at)}
                  </span>
                </div>

                {job.skills && job.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {job.skills.slice(0, 4).map((s) => (
                      <span
                        key={s.id}
                        className="rounded bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-600"
                      >
                        {s.name}
                      </span>
                    ))}
                    {job.skills.length > 4 && (
                      <span className="rounded bg-slate-50 px-2 py-1 text-[9px] text-slate-500">
                        +{job.skills.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="text-[9px] text-slate-400">JD-{job.id.slice(0, 8).toUpperCase()}</span>
                  {hasApplied ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 size={12} /> Đã ứng tuyển
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openApply(job.id)}
                      disabled={job.status !== "OPEN"}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send size={11} /> Ứng tuyển ngay
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Apply Modal */}
      {applyJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Ứng tuyển công việc</h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  {filtered.find((j) => j.id === applyJobId)?.title}
                </p>
              </div>
              <button
                onClick={() => setApplyJobId(null)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                  Mức giá chào (VND) <b className="text-rose-500">*</b>
                </label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="VD: 15000000"
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                  Thời gian ước tính (ngày)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="VD: 30"
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                  Thư xin ứng tuyển <b className="text-rose-500">*</b>
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={5}
                  placeholder="Giới thiệu bản thân, kinh nghiệm liên quan, và lý do bạn phù hợp..."
                  className="w-full resize-none rounded-lg border border-slate-200 p-3 text-[11px] leading-5 outline-none focus:border-indigo-300"
                />
                <span className="mt-1 block text-right text-[9px] text-slate-400">
                  {coverLetter.length}/2000
                </span>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 text-[10px] text-amber-700">
                <Sparkles size={11} className="mr-1 inline" />
                Mẹo: đề cập portfolio/dự án tương tự để tăng tỷ lệ được duyệt.
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setApplyJobId(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitApply}
                disabled={createProposal.isPending}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {createProposal.isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                Gửi hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </BusinessShell>
  );
}
