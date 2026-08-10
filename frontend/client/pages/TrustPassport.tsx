import { useMyTrustPassport } from "@/hooks/use-cv";
import {
  ShieldCheck,
  Award,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Calendar,
  Hash,
  FileBadge,
  Plus,
  X,
  Upload,
  Loader2,
  Clock,
} from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { useState, useRef } from "react";
import { toast } from "sonner";

function formatValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.join(", ");
  return JSON.stringify(v);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function trustTier(score: number): { label: string; tone: string; bar: string } {
  if (score >= 80) return { label: "Xuất sắc", tone: "text-emerald-700", bar: "from-emerald-500 to-teal-500" };
  if (score >= 50) return { label: "Tốt", tone: "text-indigo-700", bar: "from-indigo-500 to-violet-500" };
  if (score >= 20) return { label: "Đang xây dựng", tone: "text-amber-700", bar: "from-amber-500 to-orange-500" };
  return { label: "Mới bắt đầu", tone: "text-slate-500", bar: "from-slate-400 to-slate-500" };
}

export function TrustPassportPage() {
  const { data, isLoading, error } = useMyTrustPassport();

  return (
    <BusinessShell active="Hộ chiếu uy tín">
      <Breadcrumb />

      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[25px] font-extrabold tracking-tight text-slate-900">
            Hộ chiếu Uy tín
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Minh bạch các thông tin đã được xác minh trên hồ sơ của bạn.
          </p>
        </div>
        {data && data.totalVerifiedBadges > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">
            <ShieldCheck size={11} />
            Đã xác minh bởi Admin
          </span>
        )}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {/* Trust score card */}
          <ScoreCard isLoading={isLoading} error={error} trustScore={data?.trustScore ?? 0} badgeCount={data?.totalVerifiedBadges ?? 0} />

          {/* Badges list */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
                  <Award size={14} className="text-amber-500" />
                  Minh chứng đã xác minh ({data?.totalVerifiedBadges ?? 0})
                </h2>
                <p className="mt-1 text-[10px] text-slate-400">
                  Mỗi minh chứng là một trường thông tin đã được Admin phê duyệt.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-[11px] text-rose-600">
                Không tải được Hộ chiếu uy tín. Vui lòng thử lại.
              </div>
            ) : !data || data.badges.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-2">
                {data.badges.map((b) => (
                  <BadgeRow key={b.id} badge={b} />
                ))}
              </div>
            )}
          </section>

          {/* Certificates section */}
          <CertificatesSection />
        </div>

        <aside className="space-y-4">
          <HowItWorks />
        </aside>
      </div>
    </BusinessShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Breadcrumb() {
  return (
    <div className="mb-3 flex items-center gap-2 text-[10px] text-slate-400">
      <span>Freelancer</span>
      <ChevronRight size={11} />
      <span className="font-semibold text-indigo-600">Hộ chiếu Uy tín</span>
    </div>
  );
}

function ScoreCard({
  isLoading,
  error,
  trustScore,
  badgeCount,
}: {
  isLoading: boolean;
  error: unknown;
  trustScore: number;
  badgeCount: number;
}) {
  if (error) return null;
  const tier = trustTier(trustScore);
  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-indigo-600 shadow-sm">
            <Sparkles size={10} /> Trust Passport
          </div>
          {isLoading ? (
            <div className="h-12 w-24 animate-pulse rounded-lg bg-white/60" />
          ) : (
            <p className={`text-[44px] font-extrabold leading-none tracking-tight ${tier.tone}`}>
              {trustScore}
              <span className="ml-1 text-[18px] font-bold text-slate-400">/100</span>
            </p>
          )}
          <p className="mt-2 text-[11px] font-semibold text-slate-600">
            Cấp độ: <b className={tier.tone}>{tier.label}</b>
          </p>
        </div>
        <div className="rounded-2xl border border-white bg-white/80 p-4 text-center shadow-sm sm:text-right">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Minh chứng</p>
          <p className="mt-1 text-[28px] font-extrabold text-slate-900">
            {isLoading ? "..." : badgeCount}
          </p>
          <p className="text-[9px] text-slate-400">đã xác minh</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="h-2 overflow-hidden rounded-full bg-white/70">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${tier.bar} transition-all duration-700`}
            style={{ width: `${Math.min(trustScore, 100)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-slate-400">
          <span>0</span>
          <span className={trustScore >= 50 ? "font-bold text-indigo-600" : ""}>50</span>
          <span className={trustScore >= 80 ? "font-bold text-emerald-600" : ""}>80</span>
          <span>100</span>
        </div>
      </div>
    </section>
  );
}

function BadgeRow({ badge }: { badge: import("@/types/cv").TrustPassportBadge }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-indigo-200 hover:shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <FileBadge size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-bold text-slate-900">{badge.badgeName}</p>
        <p className="mt-0.5 truncate font-mono text-[9px] text-slate-400">{badge.fieldPath}</p>
        <p className="mt-1 line-clamp-1 text-[11px] text-slate-600">
          {formatValue(badge.value)}
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
          <CheckCircle2 size={10} />
          Đã xác minh
        </span>
        <p className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-400">
          <Calendar size={9} />
          {formatDate(badge.verifiedAt)}
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <ShieldCheck size={22} className="text-slate-300" />
      </div>
      <p className="text-[12px] font-bold text-slate-700">Chưa có minh chứng nào</p>
      <p className="mx-auto mt-1 max-w-xs text-[10px] leading-relaxed text-slate-500">
        Upload CV và chờ Admin phê duyệt. Mỗi trường thông tin được duyệt sẽ trở thành một minh chứng có huy hiệu xanh.
      </p>
      <a
        href="/freelancer/upload"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:bg-indigo-700"
      >
        Upload CV ngay
      </a>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: ShieldCheck, title: "Admin duyệt", desc: "Trường đạt → minh chứng có huy hiệu xanh" },
    { icon: Sparkles, title: "Tăng điểm", desc: "Mỗi minh chứng +5 điểm uy tín" },
    { icon: Award, title: "Hiển thị công khai", desc: "Doanh nghiệp thấy trong matching" },
  ];
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
      <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
        <Hash size={11} className="text-indigo-500" /> Cách hoạt động
      </h2>
      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[10px] font-bold text-indigo-600">
                {i + 1}
              </span>
              <div>
                <p className="flex items-center gap-1 text-[10px] font-bold text-slate-700">
                  <Icon size={10} className="text-indigo-500" />
                  {s.title}
                </p>
                <p className="mt-0.5 text-[9px] leading-4 text-slate-500">{s.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ─── Certificates Section ────────────────────────────────────────────────────

const CERT_STATUS_TONE: Record<string, string> = {
  UPLOADED: "bg-slate-100 text-slate-500",
  PENDING: "bg-amber-50 text-amber-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  REJECTED: "bg-rose-50 text-rose-600",
};

const CERT_STATUS_LABEL: Record<string, string> = {
  UPLOADED: "Mới tải lên",
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};

interface CertificateItem {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  status: string;
  createdAt: string;
}

// Mock data — replace with real API when backend supports list certificates
const MOCK_CERTS: CertificateItem[] = [];

function CertificatesSection() {
  const [showForm, setShowForm] = useState(false);
  const [certs, setCerts] = useState<CertificateItem[]>(MOCK_CERTS);
  const [uploading, setUploading] = useState(false);
  const [certName, setCertName] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certDate, setCertDate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName.trim()) { toast.error("Vui lòng nhập tên chứng chỉ"); return; }
    setUploading(true);

    // Simulate upload — replace with real API call when backend supports
    await new Promise((r) => setTimeout(r, 1200));
    const newCert: CertificateItem = {
      id: crypto.randomUUID(),
      title: certName,
      issuer: certIssuer,
      issueDate: certDate,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    setCerts((prev) => [newCert, ...prev]);
    setCertName(""); setCertIssuer(""); setCertDate("");
    setSelectedFile(null);
    setShowForm(false);
    setUploading(false);
    toast.success("Đã gửi chứng chỉ chờ Admin duyệt!");
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
            <Award size={14} className="text-indigo-500" />
            Chứng chỉ nghề nghiệp
          </h2>
          <p className="mt-1 text-[10px] text-slate-400">
            Upload chứng chỉ (IELTS, AWS, PMP...) để Admin phê duyệt. Mỗi chứng chỉ được duyệt → +5 điểm Trust Score.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700"
        >
          <Plus size={11} /> Thêm chứng chỉ
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">Tên chứng chỉ <b className="text-rose-500">*</b></label>
              <input
                value={certName}
                onChange={(e) => setCertName(e.target.value)}
                placeholder="VD: AWS Solutions Architect"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">Tổ chức cấp</label>
              <input
                value={certIssuer}
                onChange={(e) => setCertIssuer(e.target.value)}
                placeholder="VD: Amazon Web Services"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">Ngày cấp</label>
              <input
                type="date"
                value={certDate}
                onChange={(e) => setCertDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold text-slate-700">File minh chứng (PDF/PNG/JPG)</label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] file:mr-2 file:font-bold file:text-indigo-600 file:text-[10px]"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50">
              Hủy
            </button>
            <button type="submit" disabled={uploading} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
              {uploading ? <><Loader2 size={11} className="animate-spin" /> Đang gửi...</> : <><Upload size={11} /> Gửi duyệt</>}
            </button>
          </div>
        </form>
      )}

      {certs.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/30 p-6 text-center">
          <Award size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-[11px] font-semibold text-slate-500">Chưa có chứng chỉ nào</p>
          <p className="mt-1 text-[10px] text-slate-400">Bấm "Thêm chứng chỉ" để upload chứng chỉ nghề nghiệp của bạn</p>
        </div>
      ) : (
        <div className="space-y-2">
          {certs.map((cert) => (
            <div key={cert.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Award size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-slate-900">{cert.title}</p>
                <p className="mt-0.5 text-[9px] text-slate-400">
                  {cert.issuer && <span>{cert.issuer} · </span>}
                  {cert.issueDate && <span>Ngày cấp: {new Date(cert.issueDate).toLocaleDateString("vi-VN")} · </span>}
                  {new Date(cert.createdAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${CERT_STATUS_TONE[cert.status] ?? "bg-slate-100 text-slate-500"}`}>
                  {cert.status === "PENDING" && <Clock size={9} className="mr-1 inline" />}
                  {cert.status === "APPROVED" && <CheckCircle2 size={9} className="mr-1 inline" />}
                  {CERT_STATUS_LABEL[cert.status] ?? cert.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
