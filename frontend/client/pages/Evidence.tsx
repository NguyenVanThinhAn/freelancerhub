import { useState } from "react";
import { useParams } from "react-router-dom";
import { Upload, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { useUploadEvidence, useSubmitVerification } from "@/hooks/use-cv";

const EVIDENCE_TYPES = [
  { value: "DIPLOMA", label: "Bằng cấp / Diploma" },
  { value: "CERTIFICATE", label: "Chứng chỉ / Certificate" },
  { value: "WORK_SAMPLE", label: "Mẫu công việc / Work sample" },
  { value: "REFERENCE", label: "Thư giới thiệu / Reference" },
  { value: "ID_CARD", label: "CMND/CCCD" },
] as const;

export function EvidencePage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("Bằng cấp / Chứng chỉ minh chứng");
  const [evidenceType, setEvidenceType] = useState<typeof EVIDENCE_TYPES[number]["value"]>("DIPLOMA");
  const [submitted, setSubmitted] = useState(false);

  const upload = useUploadEvidence(documentId ?? "");
  const submit = useSubmitVerification(documentId ?? "");

  if (!documentId) {
    return <div className="p-6 text-sm text-rose-600">Thiếu documentId trên URL.</div>;
  }

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
    try {
      await upload.mutateAsync({ file, title, evidenceType });
      setFile(null);
    } catch {
      // toast handled in hook
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-900">Đã gửi hồ sơ xác minh</h2>
          <p className="mt-2 text-sm text-slate-600">
            Admin sẽ đối soát và phản hồi trong vòng 24-48 giờ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <FileText size={26} className="text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upload minh chứng</h1>
          <p className="text-sm text-slate-500">
            Upload bằng cấp, chứng chỉ, mẫu công việc để Admin đối soát.
          </p>
        </div>
      </header>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Loại minh chứng</label>
          <select
            value={evidenceType}
            onChange={(e) => setEvidenceType(e.target.value as typeof EVIDENCE_TYPES[number]["value"])}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          >
            {EVIDENCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tiêu đề</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">File (PDF/PNG/JPG, max 10MB)</label>
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <Upload size={28} className="mx-auto mb-2 text-slate-400" />
            <label className="inline-flex cursor-pointer rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
              Chọn file
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
            </label>
            {file && (
              <p className="mt-2 text-xs text-slate-600">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onUpload}
          disabled={!file || upload.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {upload.isPending && <Loader2 size={15} className="animate-spin" />}
          Upload minh chứng
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <p className="mb-3 text-sm font-semibold text-slate-700">Sau khi upload xong tất cả minh chứng:</p>
        <button
          type="button"
          onClick={async () => {
            await submit.mutateAsync([]);
            setSubmitted(true);
          }}
          disabled={submit.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submit.isPending && <Loader2 size={15} className="animate-spin" />}
          Nộp hồ sơ xác minh cho Admin
        </button>
      </section>
    </div>
  );
}