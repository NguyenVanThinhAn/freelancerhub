import { useMyTrustPassport } from "@/hooks/use-cv";
import { ShieldCheck, Award } from "lucide-react";

const LEVEL_LABELS: Record<string, string> = {
  AI_EXTRACTED: "AI tự trích xuất",
  USER_CONFIRMED: "Người dùng xác nhận",
  ADMIN_VERIFIED: "Admin đã xác minh",
  UNVERIFIED: "Chưa xác minh",
};

const LEVEL_COLOR: Record<string, string> = {
  AI_EXTRACTED: "bg-slate-100 text-slate-700",
  USER_CONFIRMED: "bg-indigo-100 text-indigo-700",
  ADMIN_VERIFIED: "bg-emerald-100 text-emerald-700",
  UNVERIFIED: "bg-amber-100 text-amber-700",
};

export function TrustPassportPage() {
  const { data, isLoading, error } = useMyTrustPassport();

  if (isLoading) return <div className="p-6 text-sm text-slate-500">Đang tải Hộ chiếu uy tín...</div>;
  if (error) return <div className="p-6 text-sm text-rose-600">Không tải được dữ liệu.</div>;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <ShieldCheck size={28} className="text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hộ chiếu Uy tín</h1>
          <p className="text-sm text-slate-500">
            Minh bạch các thông tin đã được xác minh trên hồ sơ của bạn.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-emerald-50 p-6">
        <p className="text-xs uppercase tracking-wider text-slate-500">Điểm uy tín</p>
        <p className="mt-1 text-5xl font-extrabold text-indigo-700">{data.trust_score}</p>
        <p className="mt-2 text-sm text-slate-600">/100 — {data.trust_score >= 80 ? "Xuất sắc" : data.trust_score >= 50 ? "Tốt" : "Cần bổ sung"}</p>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
          <Award size={18} className="text-amber-500" />
          Danh sách minh chứng ({data.badges.length})
        </h2>
        <div className="space-y-2">
          {data.badges.length === 0 && (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              Bạn chưa có minh chứng nào. Hãy upload CV và bổ sung bằng cấp để tăng điểm uy tín.
            </p>
          )}
          {data.badges.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-semibold text-slate-900">{b.claim_type}</p>
                <p className="text-sm text-slate-600">{b.claim_value}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${LEVEL_COLOR[b.evidence_level] ?? "bg-slate-100"}`}>
                {LEVEL_LABELS[b.evidence_level] ?? b.evidence_level}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}