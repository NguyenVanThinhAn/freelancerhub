import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Upload,
  Loader2,
  Check,
  Pencil,
  Save,
  Sparkles,
  ChevronRight,
  ScanText,
  Wand2,
  UserCheck,
  ShieldCheck,
  X,
  Image as ImageIcon,
  FileType,
} from "lucide-react";
import { toast } from "sonner";
import { BusinessShell } from "@/layout/BusinessShell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useUploadCV,
  useStartParseCV,
  useParseTask,
  useCVResult,
  useReviewCV,
} from "@/hooks/use-cv";
import type { CVFieldReviewChange } from "@/types/cv";

type Phase = "idle" | "uploading" | "parsing" | "review" | "submitted";

type FieldDecision =
  | { kind: "pending" }
  | { kind: "confirm" }
  | { kind: "edit"; value: string };

// ─── Pipeline steps (sidebar stepper) ────────────────────────────────────────
type StepKey = "upload" | "extract" | "ai" | "review" | "verify";

const PIPELINE: {
  key: StepKey;
  label: string;
  hint: string;
  icon: typeof Upload;
}[] = [
  { key: "upload", label: "Tải CV lên", hint: "PDF, DOCX, PNG, JPG · tối đa 10MB", icon: Upload },
  { key: "extract", label: "Bóc tách văn bản", hint: "pdfplumber / OCR cho ảnh", icon: ScanText },
  { key: "ai", label: "AI chuẩn hoá", hint: "GPT trích xuất 13+ trường dữ liệu", icon: Wand2 },
  { key: "review", label: "Bạn xác nhận", hint: "Đối chiếu & sửa từng trường", icon: UserCheck },
  { key: "verify", label: "Admin phê duyệt", hint: "Trust Passport · huy hiệu xanh", icon: ShieldCheck },
];

function getPipelineState(
  phase: Phase,
  taskStatus: string | undefined,
): { activeIdx: number; reached: StepKey[] } {
  const reached: StepKey[] = ["upload"];
  let activeIdx = 0;
  if (phase === "uploading") {
    activeIdx = 0;
  } else if (phase === "parsing") {
    reached.push("extract", "ai");
    if (taskStatus === "RUNNING") {
      activeIdx = 1; // extracting
      if (taskStatus) activeIdx = 2; // ai
    }
    activeIdx = 2;
  } else if (phase === "review") {
    reached.push("extract", "ai", "review");
    activeIdx = 3;
  } else if (phase === "submitted") {
    reached.push("extract", "ai", "review");
    activeIdx = 4; // chờ admin verify
  }
  return { activeIdx, reached };
}

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
};

const stagger = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CVUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [decisions, setDecisions] = useState<Record<string, FieldDecision>>({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const upload = useUploadCV();
  const startParse = useStartParseCV();
  const reviewCV = useReviewCV(documentId ?? "");
  const { data: task } = useParseTask(taskId);
  const { data: result } = useCVResult(documentId, taskId);

  const onPick = (f: File | null) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File quá lớn (max 10MB)");
      return;
    }
    setFile(f);
  };

  const onUpload = async () => {
    if (!file) return;
    setPhase("uploading");
    try {
      const res = await upload.mutateAsync(file);
      // Defensive: support both unwrapped data and full BaseResponse shape
      const r = res as unknown as Record<string, unknown>;
      const data = r.data as Record<string, unknown> | undefined;
      const docId = r.documentId ?? r.id ?? data?.documentId ?? data?.id;
      if (!docId) {
        console.error("[CVUpload] Upload response missing documentId:", res);
        toast.error("Upload thất bại: không nhận được ID tài liệu");
        setPhase("idle");
        return;
      }
      setDocumentId(docId as string);
      setPhase("parsing");
      const t = await startParse.mutateAsync(docId as string);
      setTaskId(t.taskId);
    } catch {
      setPhase("idle");
    }
  };

  // Auto-transition to review when parse succeeds.
  // result được đảm bảo có dữ liệu khi task.status === "SUCCEEDED" (hook useCVResult
  // đã disable fetch cho tới khi task thành công).
  useEffect(() => {
    if (phase === "parsing" && task?.status === "SUCCEEDED" && result) {
      setPhase("review");
    }
  }, [phase, task?.status, result]);

  // Reset decisions when result refreshes (after save).
  useEffect(() => {
    if (!result) return;
    setDecisions((prev) => {
      const next: Record<string, FieldDecision> = {};
      for (const f of result.extractedFields) {
        next[f.fieldPath] = prev[f.fieldPath] ?? { kind: "pending" };
      }
      return next;
    });
  }, [result?.extractedFields?.length ?? -1]);

  const resetAll = () => {
    setPhase("idle");
    setFile(null);
    setTaskId(null);
    setDocumentId(null);
    setDecisions({});
  };

  const pipelineState = getPipelineState(phase, task?.status);

  return (
    <BusinessShell active="Upload CV">
      <Breadcrumb current={phase === "review" ? "Xác nhận kết quả" : "Upload CV"} />

      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[25px] font-extrabold tracking-tight text-slate-900">
            Upload CV của bạn
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            AI sẽ tự động bóc tách nội dung, bạn chỉ cần xác nhận lại các trường thông tin.
          </p>
        </div>
        {phase !== "idle" && phase !== "review" && (
          <button
            type="button"
            onClick={resetAll}
            className="flex w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
          >
            <X size={12} /> Huỷ
          </button>
        )}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* ─── Main column ─── */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {phase === "idle" && (
              <motion.section
                key="idle"
                {...fadeUp}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]"
              >
                <Dropzone
                  file={file}
                  dragging={dragging}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    onPick(e.dataTransfer.files?.[0] ?? null);
                  }}
                  onClick={() => inputRef.current?.click()}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.docx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                  />
                </Dropzone>

                {file && (
                  <motion.div
                    {...stagger}
                    className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                  >
                    <FileIcon name={file.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-bold text-slate-800">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB ·{" "}
                        {file.type || "định dạng khác"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-white"
                      >
                        Đổi
                      </button>
                      <button
                        type="button"
                        onClick={onUpload}
                        disabled={upload.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {upload.isPending ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Sparkles size={11} />
                        )}
                        Upload & phân tích
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.section>
            )}

            {(phase === "uploading" || phase === "parsing") && (
              <motion.section
                key="processing"
                {...fadeUp}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_6px_20px_rgba(55,65,120,0.04)]"
              >
                {task?.status === "FAILED" ? (
                  <FailedState onRetry={resetAll} message={task.errorMessage ?? task.errorCode} />
                ) : (
                  <ProcessingState phase={phase} task={task} />
                )}
              </motion.section>
            )}

            {phase === "review" && (
              <motion.section
                key="review"
                {...fadeUp}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]"
              >
                {result ? (
                  <ReviewForm
                    result={result}
                    decisions={decisions}
                    setDecisions={setDecisions}
                    onSubmit={(changes) =>
                      reviewCV.mutate(
                        { schemaVersion: "1.0", changes },
                        {
                          onSuccess: () => {
                            setPhase("submitted");
                          },
                        },
                      )
                    }
                    onUploadAnother={resetAll}
                    submitting={reviewCV.isPending}
                  />
                ) : (
                  <ReviewSkeleton />
                )}
              </motion.section>
            )}

            {phase === "submitted" && result && (
              <motion.section
                key="submitted"
                {...fadeUp}
                className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-[0_6px_20px_rgba(55,65,120,0.04)]"
              >
                <SubmittedState result={result} onUploadAnother={resetAll} />
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Sidebar (status pipeline + tips) ─── */}
        <aside className="space-y-4">
          <PipelineSidebar phase={phase} task={task} {...pipelineState} />
          <TipsCard phase={phase} />
        </aside>
      </div>
    </BusinessShell>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

function Breadcrumb({ current }: { current: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-[10px] text-slate-400">
      <span>Freelancer</span>
      <ChevronRight size={11} />
      <span>Trust Passport</span>
      <ChevronRight size={11} />
      <span className="font-semibold text-indigo-600">{current}</span>
    </div>
  );
}

function Dropzone({
  file,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  children,
}: {
  file: File | null;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
        dragging
          ? "border-indigo-400 bg-indigo-50/60"
          : file
            ? "border-emerald-300 bg-emerald-50/30"
            : "border-slate-200 bg-slate-50/40 hover:border-indigo-300 hover:bg-indigo-50/30"
      }`}
    >
      <div
        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition ${
          dragging
            ? "bg-indigo-100 text-indigo-600"
            : file
              ? "bg-emerald-100 text-emerald-600"
              : "bg-indigo-50 text-indigo-500 group-hover:scale-105"
        }`}
      >
        <Upload size={22} className="transition group-hover:-translate-y-0.5" />
      </div>
      <p className="text-[12px] font-semibold text-slate-700">
        {file ? "Đã chọn file" : dragging ? "Thả file để upload" : "Kéo thả CV hoặc nhấn để chọn"}
      </p>
      <p className="mt-1 text-[10px] text-slate-400">
        PDF, DOCX, PNG, JPG · tối đa 10MB
      </p>
      {children}
    </div>
  );
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["png", "jpg", "jpeg"].includes(ext);
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
        isImage ? "bg-violet-50 text-violet-600" : "bg-indigo-50 text-indigo-600"
      }`}
    >
      {isImage ? <ImageIcon size={16} /> : <FileType size={16} />}
    </div>
  );
}

function ProcessingState({
  phase,
  task,
}: {
  phase: Phase;
  task: { progressPercent?: number; currentStep?: string | null; status?: string } | undefined;
}) {
  const percent = task?.progressPercent ?? (phase === "uploading" ? 5 : 30);
  return (
    <div className="py-2 text-center">
      <div className="relative mx-auto mb-4 h-14 w-14">
        <div className="absolute inset-0 animate-ping rounded-full bg-indigo-200 opacity-30" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
          <Loader2 size={22} className="animate-spin text-indigo-600" />
        </div>
      </div>
      <p className="text-[13px] font-bold text-slate-800">
        {phase === "uploading"
          ? "Đang tải file lên..."
          : `AI đang phân tích · ${percent}%`}
      </p>
      <p className="mt-1 text-[10px] text-slate-400">
        {task?.currentStep ?? (phase === "uploading" ? "Vui lòng chờ trong giây lát" : "Đang gọi GPT trích xuất...")}
      </p>
      <div className="mx-auto mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
        />
      </div>
      <p className="mt-2 text-[9px] text-slate-400">
        Không tắt trang — tiến trình đang chạy nền.
      </p>
    </div>
  );
}

function FailedState({
  onRetry,
  message,
}: {
  onRetry: () => void;
  message: string | null | undefined;
}) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <X size={20} />
      </div>
      <p className="text-[13px] font-bold text-rose-700">Phân tích CV thất bại</p>
      <p className="mt-1 text-[10px] text-slate-500">{message ?? "Vui lòng thử lại với file khác."}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white hover:bg-indigo-700"
      >
        <Upload size={11} /> Upload lại
      </button>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}

// ─── Sidebar pipeline ─────────────────────────────────────────────────────────

function PipelineSidebar({
  phase,
  task,
  activeIdx,
  reached,
}: {
  phase: Phase;
  task: { status?: string } | undefined;
  activeIdx: number;
  reached: StepKey[];
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
      <h2 className="mb-1 text-[11px] font-extrabold text-slate-700">Tiến trình</h2>
      <p className="mb-4 text-[9px] text-slate-400">
        CV đi qua 5 bước để được xác minh
      </p>

      <ol className="relative space-y-0">
        {PIPELINE.map((step, idx) => {
          const Icon = step.icon;
          const isReached = reached.includes(step.key);
          const isActive = idx === activeIdx;
          const isLast = idx === PIPELINE.length - 1;

          const dotClass = isActive
            ? "bg-indigo-600 ring-4 ring-indigo-100"
            : isReached
              ? "bg-emerald-500"
              : "bg-slate-200";

          const iconClass = isActive
            ? "text-white"
            : isReached
              ? "text-white"
              : "text-slate-400";

          return (
            <li key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
              {/* Vertical connector */}
              {!isLast && (
                <span
                  className={`absolute left-[14px] top-7 h-[calc(100%-1.25rem)] w-px transition-colors ${
                    reached.includes(PIPELINE[idx + 1].key) || isActive
                      ? "bg-emerald-200"
                      : "bg-slate-100"
                  }`}
                />
              )}
              {/* Dot */}
              <span
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition ${dotClass}`}
              >
                {isActive ? (
                  <Loader2 size={11} className="animate-spin text-white" />
                ) : isReached ? (
                  <Check size={11} className="text-white" />
                ) : (
                  <Icon size={11} className={iconClass} />
                )}
              </span>
              {/* Text */}
              <div className="-mt-0.5 flex-1 pt-0.5">
                <p
                  className={`text-[10px] font-bold transition ${
                    isActive ? "text-indigo-700" : isReached ? "text-slate-800" : "text-slate-400"
                  }`}
                >
                  {step.label}
                </p>
                <p className={`mt-0.5 text-[9px] ${isReached ? "text-slate-500" : "text-slate-300"}`}>
                  {step.hint}
                </p>
                {isActive && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1 text-[9px] font-bold text-indigo-600"
                  >
                    ● Đang thực hiện
                  </motion.p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Live status chip */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-[9px] font-semibold text-slate-500">Trạng thái hiện tại</span>
        <StatusChip phase={phase} task={task} />
      </div>
    </section>
  );
}

function StatusChip({
  phase,
  task,
}: {
  phase: Phase;
  task: { status?: string } | undefined;
}) {
  const map: Record<Phase, { tone: string; label: string }> = {
    idle: { tone: "bg-slate-100 text-slate-500", label: "Chưa upload" },
    uploading: { tone: "bg-amber-100 text-amber-700", label: "Đang upload" },
    parsing: {
      tone: "bg-indigo-100 text-indigo-700",
      label: task?.status === "RUNNING" ? "AI đang chạy" : "Đang xếp hàng",
    },
    review: { tone: "bg-violet-100 text-violet-700", label: "Chờ xác nhận" },
    submitted: { tone: "bg-emerald-100 text-emerald-700", label: "Đã nộp · chờ Admin" },
  };
  const cur = map[phase];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${cur.tone}`}>{cur.label}</span>
  );
}

// ─── Tips card ────────────────────────────────────────────────────────────────

function TipsCard({ phase }: { phase: Phase }) {
  const tips: Record<Phase, { icon: typeof Sparkles; title: string; desc: string }[]> = {
    idle: [
      { icon: ScanText, title: "File PDF scan?", desc: "Hệ thống tự dùng OCR — không cần convert." },
      { icon: Sparkles, title: "Dữ liệu riêng tư", desc: "Chỉ bạn & Admin xác minh được phép xem." },
    ],
    uploading: [
      { icon: Loader2, title: "Đang xử lý", desc: "Trang sẽ tự cập nhật — không cần F5." },
    ],
    parsing: [
      { icon: Wand2, title: "AI đang đọc", desc: "Trung bình 5–15 giây tuỳ độ dài CV." },
    ],
    review: [
      { icon: UserCheck, title: "Kiểm tra kỹ", desc: "Field có badge vàng = AI không chắc chắn." },
      { icon: ShieldCheck, title: "Sau khi bạn lưu", desc: "CV sẽ được đưa vào hàng chờ Admin duyệt." },
    ],
    submitted: [
      { icon: ShieldCheck, title: "Đã gửi Admin", desc: "Trung bình duyệt trong 24-48 giờ." },
      { icon: Sparkles, title: "Xem Trust Passport", desc: "Cập nhật Trust Score sau khi Admin duyệt." },
    ],
  };
  const items = tips[phase];
  return (
    <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
        <Sparkles size={11} className="text-indigo-500" /> Mẹo nhanh
      </h2>
      <ul className="space-y-3">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-500 shadow-sm">
                <Icon size={11} />
              </span>
              <div>
                <p className="text-[10px] font-bold text-slate-700">{it.title}</p>
                <p className="mt-0.5 text-[9px] leading-4 text-slate-500">{it.desc}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Review form ──────────────────────────────────────────────────────────────

function ReviewForm({
  result,
  decisions,
  setDecisions,
  onSubmit,
  onUploadAnother,
  submitting,
}: {
  result: import("@/types/cv").CVParseResultDetailResponse;
  decisions: Record<string, FieldDecision>;
  setDecisions: React.Dispatch<React.SetStateAction<Record<string, FieldDecision>>>;
  onSubmit: (changes: CVFieldReviewChange[]) => void;
  onUploadAnother: () => void;
  submitting: boolean;
}) {
  const decidedCount = Object.values(decisions).filter((d) => d.kind !== "pending").length;
  const requiredCount = result.extractedFields.filter((f) => f.requiresUserReview).length;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-extrabold text-slate-900">Kết quả phân tích</h2>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {requiredCount > 0
              ? `${requiredCount} trường cần bạn xác nhận`
              : "Tất cả trường đều rõ ràng — bạn có thể lưu luôn."}
          </p>
        </div>
        <button
          type="button"
          onClick={onUploadAnother}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
        >
          <Upload size={11} /> Upload CV khác
        </button>
      </div>

      {/* Metrics */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        <MetricTile
          tone="bg-indigo-50 text-indigo-600"
          label="Độ tin cậy"
          value={result.overallConfidence ? `${Math.round(result.overallConfidence * 100)}%` : "—"}
        />
        <MetricTile
          tone="bg-emerald-50 text-emerald-600"
          label="Hoàn thiện"
          value={`${result.completenessPercent ?? 0}%`}
        />
        <MetricTile
          tone="bg-amber-50 text-amber-600"
          label="Trường thiếu"
          value={String(result.missingFields.length)}
        />
      </div>

      {/* Field list */}
      <div className="space-y-2">
        {result.extractedFields.map((f) => (
          <FieldRow
            key={f.id}
            field={f}
            decision={decisions[f.fieldPath] ?? { kind: "pending" }}
            onChange={(d) =>
              setDecisions((prev) => ({ ...prev, [f.fieldPath]: d }))
            }
          />
        ))}
      </div>

      {/* Sticky-ish save bar */}
      <div className="sticky bottom-0 mt-5 -mx-5 -mb-5 rounded-b-2xl border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] text-slate-500">
            <b className="text-slate-700">{decidedCount}</b> / {result.extractedFields.length} trường đã xử lý
          </p>
          <button
            type="button"
            disabled={submitting || decidedCount === 0}
            onClick={() => {
              const changes: CVFieldReviewChange[] = [];
              for (const f of result.extractedFields) {
                const dec = decisions[f.fieldPath] ?? { kind: "pending" };
                if (dec.kind === "confirm") {
                  changes.push({ fieldPath: f.fieldPath, value: f.value, action: "CONFIRM" });
                } else if (dec.kind === "edit" && dec.value !== String(f.value ?? "")) {
                  changes.push({ fieldPath: f.fieldPath, value: dec.value, action: "EDIT" });
                }
              }
              if (!changes.length) return;
              onSubmit(changes);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
            Lưu chỉnh sửa
          </button>
        </div>
      </div>
    </>
  );
}

function MetricTile({
  tone,
  label,
  value,
}: {
  tone: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50/60 p-3">
      <p className={`text-[20px] font-extrabold leading-tight ${tone}`}>{value}</p>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function FieldRow({
  field,
  decision,
  onChange,
}: {
  field: import("@/types/cv").CVExtractedFieldDetail;
  decision: FieldDecision;
  onChange: (d: FieldDecision) => void;
}) {
  const editing = decision.kind === "edit";
  const confirmed = decision.kind === "confirm";

  const ringClass = confirmed
    ? "border-emerald-200 bg-emerald-50/40"
    : field.requiresUserReview
      ? "border-amber-200 bg-amber-50/30"
      : "border-slate-200 bg-white";

  return (
    <motion.div layout="position" className={`rounded-xl border p-3 transition ${ringClass}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[10px] text-slate-500">{field.fieldPath}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {field.confidence != null && (
            <span className="text-[9px] text-slate-400">AI {Math.round(field.confidence * 100)}%</span>
          )}
          {field.requiresUserReview && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">
              Cần xác nhận
            </span>
          )}
        </div>
      </div>

      {editing ? (
        <input
          type="text"
          autoFocus
          defaultValue={String(field.value ?? "")}
          onChange={(e) => onChange({ kind: "edit", value: e.target.value })}
          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] text-slate-800 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      ) : (
        <p className="break-words text-[12px] text-slate-800">
          {field.value == null ? <span className="italic text-slate-300">—</span> : String(field.value)}
        </p>
      )}

      {field.sourceText && !editing && (
        <p className="mt-1 line-clamp-1 text-[9px] italic text-slate-400">
          Nguồn: "{field.sourceText}"
        </p>
      )}

      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ kind: "confirm" })}
          disabled={confirmed}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-bold transition ${
            confirmed
              ? "bg-emerald-600 text-white"
              : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          <Check size={10} /> {confirmed ? "Đã xác nhận" : "Xác nhận"}
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({ kind: "edit", value: editing ? decision.value : String(field.value ?? "") })
          }
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-bold transition ${
            editing
              ? "bg-indigo-600 text-white"
              : "border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          }`}
        >
          <Pencil size={10} /> {editing ? "Đang sửa" : "Sửa"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Submitted state ────────────────────────────────────────────────────────

function SubmittedState({
  result,
  onUploadAnother,
}: {
  result: import("@/types/cv").CVParseResultDetailResponse;
  onUploadAnother: () => void;
}) {
  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100"
      >
        <ShieldCheck size={26} className="text-emerald-600" />
      </motion.div>
      <h2 className="text-[16px] font-extrabold tracking-tight text-slate-900">
        Đã lưu chỉnh sửa CV
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-[11px] leading-relaxed text-slate-500">
        {result.extractedFields.length} trường thông tin đã được xác nhận. Để Admin duyệt và
        cấp huy hiệu xanh, bạn cần upload minh chứng (bằng cấp, chứng chỉ...) và nộp hồ sơ
        xác minh.
      </p>

      <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-2">
        <div className="rounded-xl bg-white p-2.5 shadow-sm">
          <p className="text-[18px] font-extrabold text-indigo-600">
            {result.extractedFields.length}
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            Trường đã xác nhận
          </p>
        </div>
        <div className="rounded-xl bg-white p-2.5 shadow-sm">
          <p className="text-[18px] font-extrabold text-emerald-600">
            {result.overallConfidence ? Math.round(result.overallConfidence * 100) : 0}%
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            Độ tin cậy
          </p>
        </div>
        <div className="rounded-xl bg-white p-2.5 shadow-sm">
          <p className="text-[18px] font-extrabold text-amber-600">
            {result.missingFields.length}
          </p>
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
            Trường thiếu
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        {/* Bước tiếp theo: upload minh chứng + nộp hồ sơ để tạo VerificationCase
            — không có case này thì Admin không thấy hồ sơ của bạn trong
            /admin/verifications. */}
        <a
          href={`/freelancer/verification/evidence/${result.documentId}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700"
        >
          <Upload size={12} /> Upload minh chứng & nộp hồ sơ
        </a>
        <a
          href="/freelancer/trust-passport"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
        >
          <Sparkles size={12} /> Xem Trust Passport
        </a>
        <button
          type="button"
          onClick={onUploadAnother}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
        >
          <Upload size={12} /> Upload CV khác
        </button>
      </div>
    </div>
  );
}

// ─── Local toast fallback removed (use sonner) ────────────────────────────────
