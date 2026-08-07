import { useState } from "react";
import { Bookmark, BriefcaseBusiness, Check, ChevronDown, ChevronLeft, ChevronRight, Eye, Loader2, MapPin, MessageCircle, MoreHorizontal, Search, Sparkles, Star, UsersRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { useJobProposals, useMyProposals, PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_TONE, formatCurrency } from "@/hooks/use-proposals";
import { useAddToShortlist, useShortlists } from "@/hooks/use-shortlists";
import { useJobs } from "@/hooks/use-jobs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const avatarTones = [
  "bg-violet-100 text-violet-700",
  "bg-sky-100 text-sky-700",
  "bg-orange-100 text-orange-700",
  "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-700",
  "bg-indigo-100 text-indigo-700",
];

function Stat({ icon: Icon, label, value, detail, tone }: { icon: typeof UsersRound; label: string; value: string; detail: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={17} /></div>
        <span className="text-[10px] font-bold text-emerald-600">↗ 18%</span>
      </div>
      <p className="mt-3 text-[10px] text-slate-400">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold">{value}</p>
      <p className="text-[9px] text-slate-400">{detail}</p>
    </div>
  );
}

function Initials({ name, index }: { name: string; index: number }) {
  const parts = name.split(" ");
  const initials = parts.length >= 2
    ? parts[parts.length - 2][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2);
  return (
    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold ${avatarTones[index % avatarTones.length]}`}>
      {initials.toUpperCase()}
    </span>
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

export default function Matching() {
  const navigate = useNavigate();
  const [jobId, setJobId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"score" | "experience" | "status">("score");

  // Lấy danh sách jobs của organization hiện tại
  const { data: jobs } = useJobs({});

  // Lấy proposals theo job được chọn
  const { data: proposals, isLoading, error } = useJobProposals(jobId);

  // Lấy my proposals (cho freelancer view) - ở đây chỉ là fallback
  const { data: myProposals } = useMyProposals();

  // Shortlist hook
  const addToShortlist = useAddToShortlist();
  const { data: shortlists } = useShortlists();

  // Filter + sort
  const allCandidates = proposals ?? [];
  const filtered = allCandidates
    .filter((p) => !search || p.freelancer_id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "status") return a.status.localeCompare(b.status);
      if (sortBy === "score") return b.bid_amount - a.bid_amount;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const pending = allCandidates.filter((p) => p.status === "PENDING").length;
  const shortlistedIds = new Set(shortlists?.map((s) => s.freelancer_id) ?? []);
  const highMatch = allCandidates.filter((p) => p.status === "ACCEPTED").length;

  const selectedJob = jobs?.find((j) => j.id === jobId);

  const handleShortlist = (freelancerId: string) => {
    if (shortlistedIds.has(freelancerId)) {
      toast.info("Freelancer này đã có trong shortlist");
      return;
    }
    addToShortlist.mutate({ freelancer_id: freelancerId, job_id: jobId || undefined });
  };

  return (
    <BusinessShell active="AI Matching">
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-medium text-slate-400">Workspace / AI Matching</p>
        <h1 className="text-[24px] font-extrabold tracking-tight">AI Matching ứng viên</h1>
        <p className="mt-1 text-xs text-slate-500">
          {jobId && selectedJob
            ? `Danh sách ứng viên ứng tuyển cho vị trí "${selectedJob.title}".`
            : "Chọn một tin tuyển dụng để xem ứng viên phù hợp."}
        </p>
      </div>

      {/* Job Selector */}
      <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <BriefcaseBusiness size={18} className="text-indigo-500" />
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-500">Chọn tin tuyển dụng</p>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
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
        <Stat icon={Check} label="Đã chấp nhận" value={String(highMatch)} detail="Ứng viên được duyệt" tone="bg-emerald-50 text-emerald-600" />
        <Stat icon={Star} label="Chờ duyệt" value={String(pending)} detail="Đang xem xét" tone="bg-amber-50 text-amber-600" />
        <Stat icon={UsersRound} label="Shortlist" value={String(shortlistedIds.size)} detail="Đã lưu quan tâm" tone="bg-violet-50 text-violet-600" />
        <Stat icon={Bookmark} label="Tổng ứng viên" value={String(allCandidates.length)} detail="Tất cả proposals" tone="bg-sky-50 text-sky-600" />
      </div>

      {/* Filters */}
      {jobId && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Tìm kiếm theo freelancer ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg bg-slate-50 pl-9 text-[10px] outline-none"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-9 rounded-lg border border-slate-200 px-3 text-[10px] text-slate-500"
          >
            <option value="score">Mức giá chào</option>
            <option value="experience">Mới nhất</option>
            <option value="status">Trạng thái</option>
          </select>
        </div>
      )}

      {/* Main content */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-extrabold">Danh sách ứng viên</h2>
              <p className="mt-1 text-[9px] text-slate-400">
                {jobId ? `${filtered.length} ứng viên` : "Chưa chọn tin tuyển dụng"}
              </p>
            </div>
            <button type="button" className="text-[10px] font-bold text-indigo-600">Xuất danh sách</button>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-3 py-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2 w-20" />
                    </div>
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            ) : !jobId ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <UsersRound size={20} className="text-slate-400" />
                </div>
                <p className="text-xs text-slate-400">Chọn một tin tuyển dụng ở trên</p>
                <p className="text-[10px] text-slate-400">để xem ứng viên ứng tuyển.</p>
                <button
                  onClick={() => navigate("/jobs")}
                  className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white"
                >
                  Xem tin tuyển dụng
                </button>
              </div>
            ) : error ? (
              <div className="py-8 text-center text-xs text-red-500">Không tải được dữ liệu ứng viên.</div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Chưa có ứng viên nào ứng tuyển cho tin này.</div>
            ) : (
              <table className="w-full min-w-[780px] text-left">
                <thead className="border-y border-slate-100 text-[9px] text-slate-400">
                  <tr>
                    <th className="py-2 font-semibold">Ứng viên</th>
                    <th className="font-semibold">Mức giá chào</th>
                    <th className="font-semibold">Thời gian</th>
                    <th className="font-semibold">Trạng thái</th>
                    <th className="font-semibold">Ngày nộp</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((proposal, i) => {
                    const statusTone = PROPOSAL_STATUS_TONE[proposal.status];
                    const isShortlisted = shortlistedIds.has(proposal.freelancer_id);
                    return (
                      <tr key={proposal.id} className="border-b border-slate-50 text-[10px] last:border-0">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Initials name={proposal.freelancer_id} index={i} />
                            <div>
                              <p className="font-bold text-slate-700">FL-{proposal.freelancer_id.slice(0, 8)}</p>
                              <p className="text-[8px] text-slate-400">Freelancer</p>
                            </div>
                          </div>
                        </td>
                        <td className="font-semibold text-slate-700">
                          {formatCurrency(proposal.bid_amount)}
                        </td>
                        <td className="text-slate-500">
                          {proposal.estimated_duration ? `${proposal.estimated_duration} ngày` : "—"}
                        </td>
                        <td>
                          <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${statusTone.bg} ${statusTone.text}`}>
                            {PROPOSAL_STATUS_LABELS[proposal.status]}
                          </span>
                        </td>
                        <td className="text-slate-400">{formatRelativeTime(proposal.created_at)}</td>
                        <td>
                          <div className="flex gap-2 text-slate-400">
                            <button
                              type="button"
                              onClick={() => handleShortlist(proposal.freelancer_id)}
                              className={isShortlisted ? "text-amber-500" : "hover:text-amber-500"}
                              title={isShortlisted ? "Đã lưu shortlist" : "Lưu shortlist"}
                              disabled={addToShortlist.isPending}
                            >
                              <Star size={13} className={isShortlisted ? "fill-current" : ""} />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/proposals/${proposal.id}`)}
                              title="Xem chi tiết"
                              className="hover:text-indigo-500"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate("/interview-scheduler")}
                              title="Mời phỏng vấn"
                              className="hover:text-indigo-500"
                            >
                              <MessageCircle size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {filtered.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
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
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Shortlist gần đây</h2>
              <Sparkles size={14} className="text-violet-500" />
            </div>
            <div className="mt-4 space-y-3">
              {shortlists && shortlists.length > 0 ? (
                shortlists.slice(0, 5).map((s) => (
                  <div key={s.id} className="flex gap-2 rounded-lg border border-slate-100 p-2">
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

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
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
                  onClick={() => setSearch("")}
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
    </BusinessShell>
  );
}