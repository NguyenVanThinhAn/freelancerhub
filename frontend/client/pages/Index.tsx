import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  FileText,
  MoreHorizontal,
  Plus,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { useMyJobs } from "@/hooks/use-jobs";
import { useWallet, useTransactions } from "@/hooks/use-wallet";
import aiIllustration from "@/assets/nâng-cấp-trải-nghiệm-tuyển-dụng-với-ai.png";

const statusColor: Record<string, { bg: string; text: string }> = {
  OPEN: { bg: "bg-emerald-50", text: "text-emerald-600" },
  IN_PROGRESS: { bg: "bg-amber-50", text: "text-amber-600" },
  COMPLETED: { bg: "bg-slate-100", text: "text-slate-500" },
  CANCELLED: { bg: "bg-slate-100", text: "text-slate-500" },
};

const statusLabel: Record<string, string> = {
  OPEN: "Đang tuyển",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

function MetricCard({ icon: Icon, label, value, change, detail, tone }: { icon: typeof FileText; label: string; value: string; change: string; detail: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={20} /></div>
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><ArrowUpRight size={13} />{change}</span>
      </div>
      <p className="mt-4 text-[12px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[25px] font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}

function formatBudget(budget: number | null | undefined): string {
  if (!budget) return "—";
  return formatCurrency(budget);
}

function formatBudgetRange(min: number | null | undefined, max: number | null | undefined): string {
  if (!min && !max) return "Thỏa thuận";
  if (min && max) return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  if (min) return `Từ ${formatCurrency(min)}`;
  return `Đến ${formatCurrency(max)}`;
}

function EnterpriseDashboard() {
  const navigate = useNavigate();
  const { data: jobs, isLoading: jobsLoading } = useMyJobs();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: transactions } = useTransactions(100);

  const openJobs = jobs?.filter((j) => j.status === "OPEN") ?? [];
  const recentJobs = jobs?.slice(0, 4) ?? [];

  const totalBudget = wallet?.balance ?? 0;
  const lockedBudget = wallet?.locked_balance ?? 0;
  const usedBudget = transactions?.filter(t => t.transaction_type === "PAYMENT_SENT" || t.transaction_type === "WITHDRAWAL").reduce((sum, t) => sum + t.amount, 0) ?? 0;
  const totalDeposited = totalBudget + lockedBudget + usedBudget;
  const budgetPercent = totalDeposited > 0 ? Math.floor((usedBudget / totalDeposited) * 100) : 0;

  const interviewCount = 0;

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400">Thứ Hai, 27 tháng 5, 2024</p>
          <h1 className="text-[25px] font-extrabold tracking-tight text-slate-900">Dashboard doanh nghiệp</h1>
          <p className="mt-1 text-xs text-slate-500">Quản lý tuyển dụng hiệu quả, tìm đúng nhân tài cùng sức mạnh AI.</p>
        </div>
        <button onClick={() => navigate("/create-job")} className="flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">
          <Plus size={16} /> Tạo tin tuyển dụng
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {jobsLoading ? (
          <>
            <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
          </>
        ) : (
          <>
            <MetricCard icon={FileText} label="Tin đang tuyển" value={String(openJobs.length)} change="—" detail="Tin tuyển dụng mở" tone="bg-indigo-50 text-indigo-600" />
            <MetricCard icon={UsersRound} label="Tổng tin tuyển dụng" value={String(jobs?.length ?? 0)} change="—" detail="Tất cả tin" tone="bg-violet-50 text-violet-600" />
            <MetricCard icon={CalendarDays} label="Phỏng vấn hôm nay" value={String(interviewCount)} change="3" detail="So với hôm qua" tone="bg-sky-50 text-sky-600" />
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600"><WalletCards size={20} /></div>
                <span className="text-[10px] font-semibold text-slate-400">{budgetPercent}%</span>
              </div>
              <p className="mt-4 text-[12px] font-medium text-slate-500">Ngân sách đã dùng</p>
              <p className="mt-1 text-[21px] font-bold tracking-tight text-slate-900">{formatBudget(usedBudget)}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${budgetPercent}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">{budgetPercent}% / {formatBudget(totalDeposited)}</p>
            </div>
          </>
        )}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Tin tuyển dụng gần đây</h2>
              <p className="mt-1 text-[11px] text-slate-400">Theo dõi tiến độ các vị trí đang mở</p>
            </div>
            <button type="button" onClick={() => navigate("/jobs/browse")} className="text-[11px] font-bold text-indigo-600">Xem tất cả</button>
          </div>
          {jobsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-lg bg-slate-100" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-32 rounded bg-slate-100" />
                    <div className="h-2 w-20 rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">Chưa có tin tuyển dụng nào.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[570px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="pb-3 font-semibold">Vị trí</th>
                    <th className="pb-3 font-semibold">Trạng thái</th>
                    <th className="pb-3 font-semibold">Ngân sách</th>
                    <th className="pb-3 font-semibold">Cập nhật</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => {
                    const sc = statusColor[job.status] ?? { bg: "bg-slate-100", text: "text-slate-500" };
                    return (
                      <tr key={job.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-indigo-500"><BriefcaseBusiness size={15} /></div>
                            <div>
                              <p className="text-[12px] font-bold text-slate-700">{job.title}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                            {statusLabel[job.status] ?? job.status}
                          </span>
                        </td>
                        <td className="text-[11px] font-semibold text-slate-700">{formatBudgetRange(job.budget_min, job.budget_max)}</td>
                        <td className="text-[10px] text-slate-400">
                          {(() => {
                            try {
                              const d = new Date(job.created_at);
                              const now = new Date();
                              const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
                              if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
                              if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
                              if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
                              return d.toLocaleDateString("vi-VN");
                            } catch {
                              return "—";
                            }
                          })()}
                        </td>
                        <td><button className="text-slate-400"><MoreHorizontal size={16} /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">AI gợi ý cho bạn</h2>
              <p className="mt-1 text-[11px] text-slate-400">Đề xuất được cá nhân hóa</p>
            </div>
            <Sparkles size={18} className="text-violet-500" />
          </div>
          <div className="space-y-3">
            {[
              { text: `${openJobs.length} tin đang tuyển dụng`, sub: "Xem danh sách ứng viên phù hợp", tone: "bg-violet-100 text-violet-600" },
              { text: "Tăng 30% lượt xem tin tuyển dụng", sub: "Bằng cách tối ưu tiêu đề JD", tone: "bg-sky-100 text-sky-600" },
              { text: "3 ứng viên chưa phản hồi lời mời", sub: "Gửi nhắc nhở ngay hôm nay", tone: "bg-amber-100 text-amber-600" },
            ].map((item, i) => (
              <div key={item.text} className="flex gap-3 rounded-xl bg-slate-50/80 p-3">
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>
                  <Sparkles size={13} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold leading-4 text-slate-700">{item.text}</p>
                  <button type="button" onClick={() => navigate("/matching")} className="mt-1 text-[10px] font-bold text-indigo-600">Xem ngay →</button>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-indigo-100 py-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50">
            Xem tất cả gợi ý <ChevronRight size={13} />
          </button>
        </section>
      </div>

      <div className="mt-5 grid gap-5">
        <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-[#f5f3ff] via-white to-[#edf5ff] p-6">
          <div className="relative z-10 max-w-[58%]">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-600 shadow-sm"><Sparkles size={11} /> Trợ lý tuyển dụng AI</span>
            <h2 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900">Tạo JD mới<br />trong vài giây</h2>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">Mô tả nhu cầu, AI sẽ giúp bạn tạo một tin tuyển dụng hoàn chỉnh và thu hút.</p>
            <button onClick={() => navigate("/create-job")} className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-200"><Plus size={15} /> Tạo JD mới</button>
          </div>
          <img src={aiIllustration} alt="Tạo mô tả công việc bằng AI" className="absolute -right-2 bottom-[-32px] h-64 w-64 object-contain opacity-90 sm:h-72 sm:w-72" />
        </section>

      </div>

      <section className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold">Ví doanh nghiệp</h2>
            <p className="mt-1 text-[11px] text-slate-400">Quản lý ngân sách và giao dịch của doanh nghiệp</p>
          </div>
          <button type="button" onClick={() => navigate("/wallet")} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600">Xem chi tiết <ChevronRight size={12} /></button>
        </div>
        {walletLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-[11px] text-slate-500"><CircleDollarSign size={15} className="text-indigo-500" /> Số dư khả dụng</div>
              <p className="mt-2 text-lg font-extrabold">{formatCurrency(totalBudget)}</p>
              <p className="mt-1 text-[10px] text-emerald-600">+8.6% so với tháng trước</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-[11px] text-slate-500"><ArrowDownRight size={15} className="text-rose-500" /> Chi tiêu tháng này</div>
              <p className="mt-2 text-lg font-extrabold">{formatCurrency(usedBudget)}</p>
              <p className="mt-1 text-[10px] text-slate-400">Trong 30 ngày qua</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500"><span>Tiến độ ngân sách</span><span className="font-bold text-indigo-600">{budgetPercent}%</span></div>
              <div className="h-2 rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${budgetPercent}%` }} /></div>
              <p className="mt-2 text-[10px] text-slate-400">Còn lại {formatCurrency(totalBudget)}</p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function FreelancerDashboard() {
  const navigate = useNavigate();
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const totalBudget = wallet?.balance ?? 0;

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400">Thứ Hai, 27 tháng 5, 2024</p>
          <h1 className="text-[25px] font-extrabold tracking-tight text-slate-900">Dashboard Freelancer</h1>
          <p className="mt-1 text-xs text-slate-500">Quản lý dự án, thu nhập và công việc của bạn.</p>
        </div>
        <button onClick={() => navigate("/jobs/browse")} className="flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">
          <BriefcaseBusiness size={16} /> Tìm việc mới
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={FileText} label="Dự án đang làm" value="0" change="—" detail="Hợp đồng đang mở" tone="bg-indigo-50 text-indigo-600" />
        <MetricCard icon={WalletCards} label="Tổng thu nhập" value={formatCurrency(0)} change="—" detail="Đã rút về ví" tone="bg-emerald-50 text-emerald-600" />
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-50 text-fuchsia-600"><WalletCards size={20} /></div>
            <span className="text-[10px] font-semibold text-slate-400">Số dư</span>
          </div>
          <p className="mt-4 text-[12px] font-medium text-slate-500">Số dư khả dụng</p>
          <p className="mt-1 text-[21px] font-bold tracking-tight text-slate-900">{walletLoading ? "..." : formatCurrency(totalBudget)}</p>
          <div className="mt-3 flex justify-between gap-2">
            <button className="flex-1 rounded-lg bg-indigo-50 py-1.5 text-[10px] font-bold text-indigo-600">Rút tiền</button>
            <button className="flex-1 rounded-lg border border-slate-200 py-1.5 text-[10px] font-bold text-slate-600" onClick={() => navigate('/wallet')}>Lịch sử</button>
          </div>
        </div>
      </section>
      
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Gợi ý việc làm mới</h2>
              <p className="mt-1 text-[11px] text-slate-400">Công việc phù hợp với kỹ năng của bạn</p>
            </div>
            <button type="button" onClick={() => navigate("/jobs/browse")} className="text-[11px] font-bold text-indigo-600">Xem tất cả</button>
          </div>
          <div className="py-8 text-center text-xs text-slate-400">Bạn cần hoàn thiện Trust Passport để AI gợi ý việc làm chính xác hơn.</div>
        </section>
        
        <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-[#f5f3ff] via-white to-[#edf5ff] p-6">
          <div className="relative z-10 max-w-[65%]">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-indigo-600 shadow-sm"><Sparkles size={11} /> Hộ chiếu uy tín (Trust Passport)</span>
            <h2 className="mt-3 text-lg font-extrabold tracking-tight text-slate-900">Tăng 300% cơ hội<br />trúng thầu</h2>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">Xác thực chứng chỉ, CMND, và lịch sử làm việc bằng AI.</p>
            <button onClick={() => navigate("/freelancer/trust-passport")} className="mt-5 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-200"><Sparkles size={15} /> Nâng cấp ngay</button>
          </div>
          <img src={aiIllustration} alt="Trust Passport AI" className="absolute -right-6 bottom-[-16px] h-48 w-48 object-contain opacity-90 sm:h-56 sm:w-56" />
        </section>
      </div>
    </>
  );
}

export default function Index() {
  const { user } = useAuth();
  const userRole = (user as any)?.role || "freelancer";
  
  return (
    <BusinessShell active="Tổng quan">
      {userRole === "freelancer" ? <FreelancerDashboard /> : <EnterpriseDashboard />}
    </BusinessShell>
  );
}
