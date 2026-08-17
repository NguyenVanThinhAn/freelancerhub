import { BriefcaseBusiness, Check, ChevronDown, ChevronLeft, ChevronRight, Edit, FileDown, Loader2, MoreHorizontal, Plus, Search, Settings2, Sparkles, Trash2, WandSparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { useCategories, useDeleteJob, useMyJobs, useUpdateJob } from "@/hooks/use-jobs";
import type { JobListItem } from "@/hooks/use-jobs";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const statuses: Record<string, string> = {
  OPEN: "bg-emerald-50 text-emerald-600",
  IN_PROGRESS: "bg-amber-50 text-amber-600",
  COMPLETED: "bg-slate-100 text-slate-500",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "OPEN", label: "Đang tuyển" },
  { value: "IN_PROGRESS", label: "Đang làm" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "FIXED", label: "Giá cố định" },
  { value: "HOURLY", label: "Theo giờ" },
];

function Stat({ icon: Icon, label, value, change, tone }: { icon: typeof BriefcaseBusiness; label: string; value: string; change: string; tone: string }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon size={17} /></div><span className="text-[10px] font-bold text-emerald-600">↗ {change}</span></div><p className="mt-3 text-[11px] text-slate-400">{label}</p><p className="mt-0.5 text-xl font-extrabold">{value}</p><p className="text-[9px] text-slate-400">Trong tháng này</p></div>;
}

function StatusBadge({ status }: { status: JobListItem["status"] }) {
  const label: Record<JobListItem["status"], string> = {
    OPEN: "Đang tuyển",
    IN_PROGRESS: "Đang làm",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
  };
  return (
    <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${statuses[status] ?? "bg-slate-100 text-slate-500"}`}>
      {label[status] ?? status}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
    return d.toLocaleDateString("vi-VN");
  } catch {
    return iso;
  }
}

export default function JobsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  const filters = {
    status: statusFilter || undefined,
    category_id: categoryFilter || undefined,
    payment_type: paymentFilter || undefined,
  };

  const { data: allJobs, isLoading, error } = useMyJobs();
  const jobs = allJobs?.filter((j) => {
    if (filters.status && j.status !== filters.status) return false;
    if (filters.category_id && j.category_id !== filters.category_id) return false;
    if (filters.payment_type && j.payment_type !== filters.payment_type) return false;
    return true;
  });
  const { data: categories } = useCategories();
  const deleteJob = useDeleteJob();
  const updateJob = useUpdateJob();

  const [editJob, setEditJob] = useState<JobListItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const filteredJobs = jobs?.filter((j) =>
    !search || j.title.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const handleDelete = (job: JobListItem) => {
    if (!confirm(`Xóa tin "${job.title}"?`)) return;
    deleteJob.mutate(job.id, {
      onSuccess: () => toast.success("Đã xóa tin tuyển dụng"),
      onError: (e: unknown) => toast.error((e as { message?: string }).message ?? "Xóa thất bại"),
    });
  };

  const handleEdit = (job: JobListItem) => {
    setEditJob(job);
    setEditTitle(job.title);
    setEditDesc(job.description);
  };

  const handleSaveEdit = () => {
    if (!editJob) return;
    updateJob.mutate(
      { id: editJob.id, title: editTitle, description: editDesc, payment_type: editJob.payment_type },
      {
        onSuccess: () => {
          toast.success("Đã cập nhật tin tuyển dụng");
          setEditJob(null);
        },
        onError: (e: unknown) => toast.error((e as { message?: string }).message ?? "Cập nhật thất bại"),
      }
    );
  };

  return (
    <BusinessShell active="Tin tuyển dụng">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[11px] font-medium text-slate-400">Quản lý / Tin tuyển dụng</p>
          <h1 className="text-[24px] font-extrabold tracking-tight">Danh sách tin tuyển dụng</h1>
          <p className="mt-1 text-xs text-slate-500">Quản lý tất cả tin tuyển dụng của công ty, theo dõi hiệu quả, kênh đăng và lượng ứng viên.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate("/create-job")} className="flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-200">
            <Plus size={15} />Tạo tin tuyển dụng
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </>
        ) : (
          <>
            <Stat icon={BriefcaseBusiness} label="Tổng tin" value={String(jobs?.length ?? 0)} change="—" tone="bg-indigo-50 text-indigo-600" />
            <Stat icon={Check} label="Đang tuyển" value={String(jobs?.filter((j) => j.status === "OPEN").length ?? 0)} change="—" tone="bg-emerald-50 text-emerald-600" />
            <Stat icon={Settings2} label="Đang làm" value={String(jobs?.filter((j) => j.status === "IN_PROGRESS").length ?? 0)} change="—" tone="bg-amber-50 text-amber-600" />
            <Stat icon={Check} label="Hoàn thành" value={String(jobs?.filter((j) => j.status === "COMPLETED").length ?? 0)} change="—" tone="bg-slate-100 text-slate-600" />
          </>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Tìm kiếm theo vị trí, phòng ban..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg bg-slate-50 pl-9 text-[10px] outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 px-3 text-[10px] text-slate-500"
        >
          <option value="">Phòng ban</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 px-3 text-[10px] text-slate-500"
        >
          {PAYMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 px-3 text-[10px] text-slate-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-extrabold">Tổng {jobs?.length ?? 0} tin tuyển dụng</h2>
            <button type="button" onClick={() => alert("Xuất Excel — Sprint 4")} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600">
              <FileDown size={12} />Xuất Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-3 py-6">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-2 w-24" />
                    </div>
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-8 text-center text-xs text-red-500">Không tải được dữ liệu. Thử lại sau.</div>
            ) : !jobs || jobs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Chưa có tin tuyển dụng nào.</div>
            ) : (
              <table className="w-full min-w-[760px] text-left">
                <thead className="border-y border-slate-100 text-[9px] text-slate-400">
                  <tr>
                    <th className="py-2 font-semibold">Vị trí</th>
                    <th className="font-semibold">Phòng ban</th>
                    <th className="font-semibold">Trạng thái</th>
                    <th className="font-semibold">Kênh đăng</th>
                    <th className="font-semibold">Ứng viên</th>
                    <th className="font-semibold">Hiệu suất</th>
                    <th className="font-semibold">Cập nhật</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(jobs ?? []).map((job) => (
                    <tr key={job.id} className="border-b border-slate-50 text-[10px] last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-indigo-500">
                            <BriefcaseBusiness size={13} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-700">{job.title}</p>
                            <p className="text-[8px] text-slate-400">JD-{job.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-slate-500">
                        {(() => {
                          const cat = categories?.find((c) => c.id === job.category_id);
                          return cat?.name ?? (job.category_id ? job.category_id.slice(0, 8) : "—");
                        })()}
                      </td>
                      <td><StatusBadge status={job.status} /></td>
                      <td className="max-w-[125px] text-slate-500">—</td>
                      <td className="font-semibold">—</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-12 rounded-full bg-indigo-100">
                            <span className="block h-full w-3/4 rounded-full bg-indigo-500" />
                          </span>
                          <span className="text-[9px] text-slate-500">—</span>
                        </div>
                      </td>
                      <td className="text-slate-400">{formatDate(job.created_at)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(job)}
                            className="text-slate-400 hover:text-indigo-600"
                            title="Chỉnh sửa"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(job)}
                            className="text-slate-400 hover:text-red-500"
                            title="Xóa tin"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
            <span>Hiển thị {jobs?.length ?? 0} tin</span>
            <div className="flex items-center gap-1">
              <button className="rounded p-1"><ChevronLeft size={14} /></button>
              <button className="rounded bg-indigo-600 px-2 py-1 font-bold text-white">1</button>
              <button className="px-2">2</button>
              <button className="px-2">3</button>
              <button className="rounded p-1"><ChevronRight size={14} /></button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm opacity-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Hiệu quả theo kênh</h2>
              <span className="text-[9px] text-slate-400">30 ngày qua</span>
            </div>
            <p className="mt-4 text-center italic text-[9px] text-slate-400">Đang sử dụng dữ liệu tĩnh</p>
            <div className="mt-4 space-y-3">
              {[["LinkedIn", "182", "84%"], ["Website công ty", "128", "72%"], ["TopCV", "76", "64%"], ["Facebook", "52", "48%"], ["VietnamWorks", "14", "31%"]].map(([channel, applicants, width], i) => (
                <div key={channel}>
                  <div className="mb-1 flex justify-between text-[9px]">
                    <span className="font-semibold text-slate-600">● {channel}</span>
                    <span className="text-slate-400">{applicants} ứng viên</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${i === 0 ? "bg-indigo-600" : "bg-violet-400"}`} style={{ width }} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => alert("Xem báo cáo chi tiết kênh — Sprint 4")} className="mt-4 text-[10px] font-bold text-indigo-600">Xem báo cáo chi tiết →</button>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm opacity-50">
            <h2 className="text-xs font-extrabold">Gợi ý từ AI</h2>
            <p className="mt-2 text-center italic text-[9px] text-slate-400">Đang sử dụng dữ liệu tĩnh</p>
            <div className="mt-3 space-y-3">
              {[["Tối ưu tiêu đề", "Tin có CTR thấp hơn trung bình"], ["Gia hạn tin tuyển dụng", "Tin sắp hết hạn trong 3 ngày tới"], ["Nhắc phản hồi ứng viên", "12 ứng viên đang chờ phản hồi"]].map(([title, detail], i) => (
                <div key={title} className="flex gap-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${i === 0 ? "bg-emerald-50 text-emerald-600" : i === 1 ? "bg-sky-50 text-sky-600" : "bg-violet-50 text-violet-600"}`}>
                    <Sparkles size={12} />
                  </span>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold">{title}</p>
                    <p className="mt-0.5 text-[9px] text-slate-400">{detail}</p>
                  </div>
                  <button type="button" onClick={() => alert(`Xem chi tiết: ${title}`)} className="text-[9px] font-bold text-indigo-600">Xem</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => alert("Xem tất cả gợi ý AI — Sprint 4")} className="mt-3 text-[10px] font-bold text-indigo-600">Xem tất cả gợi ý →</button>
          </section>
        </aside>
      </div>

      {editJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">Chỉnh sửa tin tuyển dụng</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Tiêu đề</label>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Mô tả</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditJob(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Hủy</button>
              <button onClick={handleSaveEdit} disabled={updateJob.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                {updateJob.isPending ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </BusinessShell>
  );
}
