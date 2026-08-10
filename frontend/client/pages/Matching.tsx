import { useState } from "react";
import {
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  UsersRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import {
  useJobProposals,
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_TONE,
  formatCurrency,
  useProposal,
  useExplainMatch,
} from "@/hooks/use-proposals";
import { useMyJobs } from "@/hooks/use-jobs";
import { useAddToShortlist, useShortlists } from "@/hooks/use-shortlists";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ─── Style tokens (giữ đồng bộ Wallet / Index / AdminVerifications) ────────────
const CARD = "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm";
const CHIP = "rounded-full px-2 py-1 text-[8px] font-semibold";

function toneByScore(score: number | undefined): { bar: string; chip: string; text: string } {
  if (score == null) return { bar: "bg-slate-200", chip: "bg-slate-100 text-slate-500", text: "—" };
  if (score >= 80) return { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-600", text: "Rất phù hợp" };
  if (score >= 65) return { bar: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-600", text: "Phù hợp" };
  if (score >= 50) return { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-600", text: "Cân nhắc" };
  return { bar: "bg-rose-500", chip: "bg-rose-50 text-rose-600", text: "Yếu" };
}

function MiniScoreBar({ value }: { value: number | undefined }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${toneByScore(v).bar}`} style={{ width: `${v}%` }} />
      </div>
      <span className="w-7 text-right text-[9px] font-semibold text-slate-500">{v}</span>
    </div>
  );
}

function Stat({ icon: Icon, label, value, detail, tone }: { icon: typeof UsersRound; label: string; value: string; detail: string; tone: string }) {
  return (
    <div className={CARD}>
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={17} /></div>
      </div>
      <p className="mt-3 text-[10px] text-slate-400">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold">{value}</p>
      <p className="text-[9px] text-slate-400">{detail}</p>
    </div>
  );
}

function formatRelativeTime(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
    return d.toLocaleDateString("vi-VN");
  } catch {
    return "—";
  }
}

function initials(name?: string | null): string {
  if (!name) return "FL";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

// ─── Per-row sub-component: fetch proposal detail + explain-match ───────────────
function CandidateCard({ proposalId, onView, onShortlist, onInterview, isShortlisted, isShortlistPending }:
  {
    proposalId: string;
    onView: () => void;
    onShortlist: () => void;
    onInterview: () => void;
    isShortlisted: boolean;
    isShortlistPending: boolean;
  }
) {
  const { data: detail, isLoading: detailLoading } = useProposal(proposalId);
  const { data: explain, isLoading: explainLoading } = useExplainMatch(proposalId);

  if (detailLoading || !detail) {
    return (
      <div className={`${CARD} flex items-center gap-3`}>
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-2 w-24" />
        </div>
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    );
  }

  const freelancer = detail.freelancer;
  const name = freelancer?.display_name ?? "FL";
  const headline = freelancer?.headline || "Chưa có chức danh";
  const expYears = freelancer?.experience_years ?? 0;
  const score = explain?.fit_score;
  const tone = toneByScore(score);
  const factors = explain?.factors;

  return (
    <div className={`${CARD} transition hover:border-indigo-200`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-orange-100 text-sm font-bold text-indigo-700">
          {initials(name)}
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
        </div>

        {/* Identity + bid */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[12px] font-extrabold text-slate-800">{name}</p>
            <span className={`${CHIP} ${PROPOSAL_STATUS_TONE[detail.status].bg} ${PROPOSAL_STATUS_TONE[detail.status].text}`}>
              {PROPOSAL_STATUS_LABELS[detail.status]}
            </span>
          </div>
          <p className="truncate text-[10px] text-slate-500">{headline}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-slate-400">
            <span>◷ {expYears} năm KN</span>
            <span>• {formatCurrency(detail.bid_amount)}</span>
            {detail.estimated_duration ? <span>• {detail.estimated_duration} ngày</span> : null}
            <span>• {formatRelativeTime(detail.created_at)}</span>
          </div>
        </div>

        {/* AI Score */}
        <div className="flex w-20 shrink-0 flex-col items-end">
          {explainLoading ? (
            <Skeleton className="h-9 w-16 rounded-md" />
          ) : (
            <>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-extrabold text-indigo-600">{score ?? "—"}</span>
                <span className="text-[9px] text-slate-400">/100</span>
              </div>
              <span className={`${CHIP} ${tone.chip}`}>{tone.text}</span>
            </>
          )}
        </div>
      </div>

      {/* Factor mini-bars */}
      {factors && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-slate-100 pt-3 sm:grid-cols-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] uppercase tracking-wide text-slate-400">Hard skills</span>
            <MiniScoreBar value={factors.hard_skills} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] uppercase tracking-wide text-slate-400">Kinh nghiệm</span>
            <MiniScoreBar value={factors.experience} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] uppercase tracking-wide text-slate-400">Domain fit</span>
            <MiniScoreBar value={factors.domain_fit} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] uppercase tracking-wide text-slate-400">Giao tiếp</span>
            <MiniScoreBar value={factors.communication} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] uppercase tracking-wide text-slate-400">Salary fit</span>
            <MiniScoreBar value={factors.salary_fit} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onView}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-indigo-700"
        >
          <Eye size={12} /> Xem chi tiết
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onShortlist}
            disabled={isShortlistPending}
            className={`flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold transition disabled:opacity-40 ${isShortlisted ? "text-amber-500" : "text-slate-500 hover:text-amber-500"}`}
            title={isShortlisted ? "Đã lưu shortlist" : "Lưu shortlist"}
          >
            <Star size={12} className={isShortlisted ? "fill-current" : ""} />
            {isShortlisted ? "Đã lưu" : "Shortlist"}
          </button>
          <button
            type="button"
            onClick={onInterview}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-500 transition hover:text-indigo-600"
            title="Mời phỏng vấn"
          >
            <MessageCircle size={12} /> Mời PV
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Matching() {
  const navigate = useNavigate();
  const [jobId, setJobId] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: jobs } = useMyJobs();
  const { data: proposals, isLoading, error } = useJobProposals(jobId);

  const addToShortlist = useAddToShortlist();
  const { data: shortlists } = useShortlists();

  const shortlistedIds = new Set(shortlists?.map((s) => s.freelancer_id) ?? []);

  const allCandidates = proposals ?? [];
  const filtered = allCandidates.filter((p) => {
    if (search && !p.freelancer_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedJob = jobs?.find((j) => j.id === jobId);
  const pending = allCandidates.filter((p) => p.status === "PENDING").length;
  const highMatch = allCandidates.filter((p) => p.status === "ACCEPTED").length;

  const handleShortlist = (freelancerId: string) => {
    if (shortlistedIds.has(freelancerId)) {
      toast.info("Freelancer đã có trong shortlist");
      return;
    }
    addToShortlist.mutate({ freelancer_id: freelancerId, job_id: jobId || undefined });
  };

  return (
    <BusinessShell active="AI Matching">
      {/* Header */}
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-medium text-slate-400">Workspace / AI Matching</p>
        <h1 className="text-[24px] font-extrabold tracking-tight">AI Matching ứng viên</h1>
        <p className="mt-1 text-xs text-slate-500">
          {jobId && selectedJob
            ? `Xếp hạng ứng viên phù hợp với vị trí "${selectedJob.title}" theo 5 tiêu chí AI (hard skills, kinh nghiệm, domain, giao tiếp, mức lương).`
            : "Chọn một tin tuyển dụng để AI xếp hạng ứng viên phù hợp."}
        </p>
      </div>

      {/* Job Selector */}
      <div className={`${CARD} mb-5`}>
        <div className="flex items-center gap-3">
          <BriefcaseBusiness size={18} className="text-indigo-500" />
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-500">Chọn tin tuyển dụng</p>
            <select
              value={jobId}
              onChange={(e) => { setJobId(e.target.value); setSearch(""); }}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-300"
            >
              <option value="">— Chọn tin tuyển dụng —</option>
              {jobs?.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.status})
                </option>
              ))}
            </select>
          </div>
          {jobId && (
            <button
              type="button"
              onClick={() => setJobId("")}
              className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:text-slate-600"
              title="Bỏ chọn"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={UsersRound} label="Tổng ứng viên" value={String(allCandidates.length)} detail="Proposal đã nộp" tone="bg-indigo-50 text-indigo-600" />
        <Stat icon={Star} label="Chờ duyệt" value={String(pending)} detail="Đang xem xét" tone="bg-amber-50 text-amber-600" />
        <Stat icon={Check} label="Đã chấp nhận" value={String(highMatch)} detail="Ứng viên được duyệt" tone="bg-emerald-50 text-emerald-600" />
        <Stat icon={Bookmark} label="Shortlist" value={String(shortlistedIds.size)} detail="Đã lưu quan tâm" tone="bg-violet-50 text-violet-600" />
      </div>

      {/* Filters */}
      {jobId && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Tìm kiếm theo freelancer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg bg-slate-50 pl-9 text-[10px] outline-none"
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className={`${CARD}`}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-extrabold">Bảng xếp hạng AI Matching</h2>
              <p className="mt-1 text-[9px] text-slate-400">
                {jobId
                  ? `${filtered.length} ứng viên — điểm do AI đánh giá (cập nhật realtime)`
                  : "Chưa chọn tin tuyển dụng"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => jobId && navigate(`/explainable-matching/${filtered[0]?.id ?? ""}`)}
              disabled={!jobId || filtered.length === 0}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-500 transition hover:text-indigo-600 disabled:opacity-40"
              title="Xem Explainable AI cho top 1"
            >
              <Sparkles size={12} /> Explainable AI
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-3 py-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : !jobId ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <UsersRound size={20} className="text-slate-400" />
              </div>
              <p className="text-xs text-slate-400">Chọn một tin tuyển dụng ở trên</p>
              <p className="mt-1 text-[10px] text-slate-400">để xem ứng viên AI xếp hạng.</p>
              <button
                onClick={() => navigate("/jobs")}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white"
              >
                Xem tin tuyển dụng
              </button>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-xs text-red-500">Không tải được dữ liệu ứng viên.</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">Chưa có ứng viên nào ứng tuyển cho tin này.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => (
                <CandidateCard
                  key={p.id}
                  proposalId={p.id}
                  isShortlisted={shortlistedIds.has(p.freelancer_id)}
                  isShortlistPending={addToShortlist.isPending}
                  onView={() => navigate(`/candidate-detail/${p.id}`)}
                  onShortlist={() => handleShortlist(p.freelancer_id)}
                  onInterview={() => navigate(`/interview-scheduler/${p.id}`)}
                />
              ))}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400">
              <span>Hiển thị {filtered.length} ứng viên</span>
              <div className="flex items-center gap-1">
                <button className="rounded p-1"><ChevronLeft size={14} /></button>
                <button className="rounded bg-indigo-600 px-2 py-1 font-bold text-white">1</button>
                <button className="px-2">2</button>
                <button className="rounded p-1"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className={CARD}>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Shortlist gần đây</h2>
              <Sparkles size={14} className="text-violet-500" />
            </div>
            <div className="mt-4 space-y-3">
              {shortlists && shortlists.length > 0 ? (
                shortlists.slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex w-full gap-2 rounded-lg border border-slate-100 p-2"
                  >
                    <Bookmark size={13} className="mt-0.5 text-violet-500" />
                    <div className="flex-1">
                      <p className="text-[10px] font-bold">FL-{s.freelancer_id.slice(0, 8)}</p>
                      <p className="text-[9px] text-slate-400">{formatRelativeTime(s.created_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-slate-400">Chưa lưu freelancer nào.</p>
              )}
            </div>
          </section>

          <section className={CARD}>
            <h2 className="text-xs font-extrabold">Bộ lọc nhanh</h2>
            <div className="mt-3 space-y-2">
              {[
                { label: "PENDING", text: "Chờ duyệt", count: pending },
                { label: "ACCEPTED", text: "Đã chấp nhận", count: highMatch },
                { label: "SHORTLIST", text: "Shortlist", count: shortlistedIds.size },
              ].map((filter) => (
                <button
                  key={filter.label}
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-[10px] hover:bg-slate-50"
                >
                  <span className="text-slate-600">{filter.text}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* Light affordance: only show loader when actually loading proposals */}
      {isLoading && (
        <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
          <Loader2 size={12} className="animate-spin" /> Đang tải AI Matching…
        </div>
      )}
    </BusinessShell>
  );
}