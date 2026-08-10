import { useState } from "react";
import {
  CalendarDays,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  Video,
  X,
} from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import {
  useInterviews,
  useUpdateInterviewStatus,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_STATUS_TONE,
  formatDateTime,
  formatRelativeTime,
  type Interview,
  type InterviewStatusValue,
} from "@/hooks/use-interviews";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type StatusFilter = "ALL" | InterviewStatusValue;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "SCHEDULED", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "COMPLETED", label: "Đã phỏng vấn" },
  { value: "CANCELED", label: "Đã huỷ" },
];

function Stat({ icon: Icon, label, value, tone }: { icon: typeof CalendarDays; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon size={17} />
        </div>
      </div>
      <p className="mt-3 text-[10px] text-slate-400">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold">{value}</p>
    </div>
  );
}

function InterviewRow({
  iv,
  onConfirm,
  onDecline,
  onCancel,
  isUpdating,
}: {
  iv: Interview;
  onConfirm: () => void;
  onDecline: () => void;
  onCancel: () => void;
  isUpdating: boolean;
}) {
  const statusTone = INTERVIEW_STATUS_TONE[iv.status];
  const isFuture = new Date(iv.start_time) > new Date();
  const canConfirmDecline = iv.status === "SCHEDULED" && isFuture;
  const canCancel = (iv.status === "SCHEDULED" || iv.status === "CONFIRMED") && isFuture;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        {/* Left: schedule info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {iv.interview_type === "Phỏng vấn trực tiếp" ? (
              <MapPin size={13} className="text-rose-500" />
            ) : (
              <Video size={13} className="text-indigo-500" />
            )}
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              {iv.interview_type}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[8px] font-semibold ${statusTone.bg} ${statusTone.text}`}
            >
              {INTERVIEW_STATUS_LABELS[iv.status]}
            </span>
          </div>

          <p className="mt-1 text-[12px] font-extrabold text-slate-800">
            {formatDateTime(iv.start_time)}
          </p>
          <p className="text-[9px] text-slate-400">
            {iv.duration_minutes} phút · {iv.platform || "Chưa chọn platform"} ·{" "}
            {formatRelativeTime(iv.start_time)}
          </p>

          {iv.meet_link && (
            <a
              href={iv.meet_link}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[9px] font-semibold text-indigo-600 hover:bg-indigo-100"
            >
              <ExternalLink size={10} /> Link cuộc họp
            </a>
          )}

          {iv.note && (
            <p className="mt-2 max-w-md whitespace-pre-line text-[9px] leading-4 text-slate-500">
              {iv.note}
            </p>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {canConfirmDecline && (
            <>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isUpdating}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40"
              >
                <Check size={11} /> Xác nhận
              </button>
              <button
                type="button"
                onClick={onDecline}
                disabled={isUpdating}
                className="flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-bold text-rose-500 transition hover:bg-rose-50 disabled:opacity-40"
              >
                <X size={11} /> Từ chối
              </button>
            </>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isUpdating}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Huỷ lịch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyInterviews() {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const { data: interviews, isLoading, error } = useInterviews();
  const updateStatus = useUpdateInterviewStatus();

  const all = interviews ?? [];
  const filtered = filter === "ALL" ? all : all.filter((i) => i.status === filter);

  const upcoming = all.filter((i) => new Date(i.start_time) > new Date()).length;
  const scheduled = all.filter((i) => i.status === "SCHEDULED").length;
  const confirmed = all.filter((i) => i.status === "CONFIRMED").length;
  const completed = all.filter((i) => i.status === "COMPLETED").length;

  const handleUpdate = (id: string, status: InterviewStatusValue, label: string) => {
    const note = window.prompt(
      status === "DECLINED"
        ? "Lý do từ chối (tuỳ chọn):"
        : status === "CANCELED"
        ? "Lý do huỷ lịch (tuỳ chọn):"
        : undefined,
    );
    // cancel prompt = null = decline without note; user pressing Escape = undefined = skip
    if (status === "DECLINED" || status === "CANCELED") {
      if (note === null && !window.confirm(`Xác nhận ${label.toLowerCase()}?`)) return;
    }
    updateStatus.mutate({ id, status, note: note || undefined });
  };

  return (
    <BusinessShell active="Phỏng vấn của tôi">
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-medium text-slate-400">Workspace / Phỏng vấn</p>
        <h1 className="text-[24px] font-extrabold tracking-tight">Lịch phỏng vấn của tôi</h1>
        <p className="mt-1 text-xs text-slate-500">
          Danh sách lời mời phỏng vấn từ doanh nghiệp. Xác nhận tham dự hoặc từ chối để doanh nghiệp sắp xếp lịch khác.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={CalendarDays} label="Sắp tới" value={String(upcoming)} tone="bg-sky-50 text-sky-600" />
        <Stat icon={Check} label="Đã xác nhận" value={String(confirmed)} tone="bg-emerald-50 text-emerald-600" />
        <Stat
          icon={Loader2}
          label="Chờ xác nhận"
          value={String(scheduled)}
          tone="bg-amber-50 text-amber-600"
        />
        <Stat
          icon={Check}
          label="Đã hoàn thành"
          value={String(completed)}
          tone="bg-slate-100 text-slate-500"
        />
      </div>

      {/* Filter tabs */}
      <nav className="mb-4 flex gap-6 border-b border-slate-200 text-[10px] font-semibold text-slate-400">
        {FILTERS.map((f) => {
          const count = f.value === "ALL" ? all.length : all.filter((i) => i.status === f.value).length;
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-1.5 pb-3 ${active ? "border-b-2 border-indigo-600 text-indigo-600" : ""}`}
            >
              {f.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                  active ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-xs text-rose-500">
          Không tải được lịch phỏng vấn. Vui lòng thử lại sau.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <CalendarDays size={20} className="text-slate-400" />
          </div>
          <p className="text-xs text-slate-400">
            {filter === "ALL"
              ? "Chưa có lời mời phỏng vấn nào."
              : `Không có lịch phỏng vấn ở trạng thái "${FILTERS.find((f) => f.value === filter)?.label}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((iv) => (
            <InterviewRow
              key={iv.id}
              iv={iv}
              isUpdating={updateStatus.isPending}
              onConfirm={() =>
                toast.promise(
                  updateStatus.mutateAsync({ id: iv.id, status: "CONFIRMED" }),
                  { loading: "Đang xác nhận...", success: "Đã xác nhận tham dự!", error: "Xác nhận thất bại" },
                )
              }
              onDecline={() => handleUpdate(iv.id, "DECLINED", "Từ chối")}
              onCancel={() => handleUpdate(iv.id, "CANCELED", "Huỷ lịch")}
            />
          ))}
        </div>
      )}
    </BusinessShell>
  );
}