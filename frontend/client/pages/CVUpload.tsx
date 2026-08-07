import { useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useUploadCV, useStartParseCV, useParseTask, useCVResult } from "@/hooks/use-cv";

type Phase = "idle" | "uploading" | "parsing" | "review";

export function CVUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");

  const upload = useUploadCV();
  const startParse = useStartParseCV();
  const { data: task } = useParseTask(taskId);
  const { data: result } = useCVResult(documentId);

  const onPick = (f: File | null) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      alert("File quá lớn (max 10MB)");
      return;
    }
    setFile(f);
  };

  const onUpload = async () => {
    if (!file) return;
    setPhase("uploading");
    try {
      const res = await upload.mutateAsync(file);
      setDocumentId(res.documentId);
      setPhase("parsing");
      const t = await startParse.mutateAsync(res.documentId);
      setTaskId(t.taskId);
    } catch {
      setPhase("idle");
    }
  };

  // Auto-transition to review when parse succeeds
  if (phase === "parsing" && task?.status === "SUCCEEDED" && result) {
    setPhase("review");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <FileText size={26} className="text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tải CV lên hệ thống</h1>
          <p className="text-sm text-slate-500">
            Hỗ trợ PDF, DOCX, PNG, JPG. Tối đa 10MB.
          </p>
        </div>
      </header>

      {phase === "idle" && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <Upload size={42} className="mx-auto mb-3 text-slate-400" />
          <p className="text-sm text-slate-700">Kéo thả file hoặc</p>
          <label className="mt-3 inline-flex cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Chọn file
            <input
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
          </label>
          {file && (
            <div className="mt-4 text-xs text-slate-600">
              Đã chọn: <b>{file.name}</b> ({(file.size / 1024).toFixed(1)} KB)
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                >
                  Chọn lại
                </button>
                <button
                  type="button"
                  onClick={onUpload}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Upload & phân tích
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(phase === "uploading" || phase === "parsing") && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Loader2 size={36} className="mx-auto mb-3 animate-spin text-indigo-600" />
          <p className="text-sm font-semibold text-slate-800">
            {phase === "uploading" ? "Đang upload..." : `Đang phân tích CV... ${task?.progressPercent ?? 0}%`}
          </p>
          {task?.currentStep && (
            <p className="mt-1 text-xs text-slate-500">{task.currentStep}</p>
          )}
        </div>
      )}

      {phase === "review" && result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Kết quả phân tích</h2>
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-indigo-50 p-3">
              <p className="text-2xl font-bold text-indigo-700">
                {result.overallConfidence ? Math.round(result.overallConfidence * 100) : 0}%
              </p>
              <p className="text-xs text-slate-600">Độ tin cậy</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-2xl font-bold text-emerald-700">
                {result.completenessPercent ?? 0}%
              </p>
              <p className="text-xs text-slate-600">Hoàn thiện</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-2xl font-bold text-amber-700">
                {result.missingFields.length}
              </p>
              <p className="text-xs text-slate-600">Trường thiếu</p>
            </div>
          </div>
          <div className="space-y-2">
            {result.extractedFields.slice(0, 5).map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
                <span className="font-mono text-xs text-slate-600">{f.fieldPath}</span>
                <span className="text-slate-900">{String(f.value ?? "—")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}