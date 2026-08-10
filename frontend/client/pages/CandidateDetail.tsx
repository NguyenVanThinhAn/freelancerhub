import { ChevronRight, FileText, Link2, MessageCircle, Star } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { useProposal, useExplainMatch } from "@/hooks/use-proposals";
import { Skeleton } from "@/components/ui/skeleton";

function scoreTone(score: number | undefined): { bar: string; chip: string; label: string } {
  if (score == null) return { bar: "bg-slate-200", chip: "bg-slate-100 text-slate-500", label: "Đang chờ AI" };
  if (score >= 80) return { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-600", label: "Rất phù hợp" };
  if (score >= 65) return { bar: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-600", label: "Phù hợp" };
  if (score >= 50) return { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-600", label: "Cân nhắc" };
  return { bar: "bg-rose-500", chip: "bg-rose-50 text-rose-600", label: "Yếu" };
}

function ScoreBars({ onExplain, score, factors, isLoading }: { onExplain: () => void; score?: number; factors?: { hard_skills: number; experience: number; domain_fit: number; communication: number; salary_fit: number }; isLoading: boolean }) {
  const tone = scoreTone(score);
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-extrabold">AI Matching tổng quan</h2>
        {isLoading ? (
          <Skeleton className="h-7 w-16 rounded-md" />
        ) : (
          <span className="text-xl font-extrabold text-indigo-600">
            {score ?? "—"}
            <span className="text-[10px] text-slate-400">/100</span>
          </span>
        )}
      </div>
      <p className="mt-3 text-[10px] text-slate-500">
        {isLoading
          ? "Hệ thống AI đang phân tích hồ sơ…"
          : score != null
          ? `Mức độ phù hợp tổng thể — ${tone.label.toLowerCase()}.`
          : "Hệ thống AI chưa phân tích. Vui lòng xem chi tiết đánh giá để biết thêm."}
      </p>

      {factors && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          {[
            ["Hard skills", factors.hard_skills],
            ["Kinh nghiệm", factors.experience],
            ["Domain fit", factors.domain_fit],
            ["Giao tiếp", factors.communication],
            ["Salary fit", factors.salary_fit],
          ].map(([label, value]) => (
            <div key={label as string} className="flex items-center gap-2">
              <span className="w-20 text-[9px] text-slate-500">{label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full ${scoreTone(value as number).bar}`}
                  style={{ width: `${value as number}%` }}
                />
              </div>
              <span className="w-7 text-right text-[9px] font-semibold text-slate-500">{value as number}</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={onExplain} className="mt-4 w-full text-right text-[10px] font-bold text-indigo-600">
        Xem giải thích AI Matching →
      </button>
    </section>
  );
}

export default function CandidateDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: proposal, isLoading, error } = useProposal(id);
  const { data: explain, isLoading: isLoadingExplain } = useExplainMatch(id);

  if (isLoading) {
    return (
      <BusinessShell active="AI Matching">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="mt-4 grid gap-5 xl:grid-cols-[1fr_300px]">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </BusinessShell>
    );
  }

  if (error || !proposal || !proposal.freelancer) {
    return (
      <BusinessShell active="AI Matching">
        <div className="py-12 text-center">
          <p className="text-xs text-red-500">Không tải được thông tin ứng viên. Vui lòng thử lại.</p>
          <button
            type="button"
            onClick={() => navigate("/matching")}
            className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600"
          >
            Quay lại
          </button>
        </div>
      </BusinessShell>
    );
  }

  const freelancer = proposal.freelancer;
  const skills = freelancer.skills?.map(s => s.name) || [];
  
  // Parse history if available
  const history = freelancer.parsed_cv_json?.work_history || [];
  const education = freelancer.parsed_cv_json?.education || [];

  return (
    <BusinessShell active="AI Matching">
      <div className="mb-3 flex items-center gap-2 text-[10px] text-slate-400">
        <button onClick={() => navigate("/matching")} className="hover:text-indigo-600">
          AI Matching
        </button>
        <ChevronRight size={12} />
        {freelancer.headline || "Ứng viên"}
        <ChevronRight size={12} />
        <span className="font-semibold text-indigo-600">{freelancer.display_name}</span>
      </div>

      <section className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-orange-100 text-lg font-bold text-indigo-700">
            {freelancer.display_name.slice(0, 2).toUpperCase()}
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold">
              {freelancer.display_name} <span className="text-indigo-500">✓</span>
            </h1>
            <p className="mt-1 text-[10px] text-slate-500">{freelancer.headline || "Chưa có chức danh"}</p>
            <div className="mt-1 flex flex-wrap gap-3 text-[9px] text-slate-400">
              <span>◷ {freelancer.experience_years ?? 0} năm</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            {isLoadingExplain ? (
              <Skeleton className="h-12 w-12 rounded-full" />
            ) : (
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full bg-white">
                <b className={`text-base ${explain?.fit_score != null ? "text-indigo-600" : "text-slate-400"}`}>
                  {explain?.fit_score ?? "—"}
                </b>
                <span className="text-[8px] text-slate-400">phù hợp</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => navigate(`/interview-scheduler/${id}`)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white"
            >
              <MessageCircle size={12} className="mr-1 inline" />
              Mời phỏng vấn
            </button>
            <button
              type="button"
              onClick={() => alert("Lưu shortlist — đang xây dựng")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-indigo-600"
            >
              <Star size={12} className="mr-1 inline" />
              Lưu shortlist
            </button>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-extrabold">Tóm tắt hồ sơ</h2>
            <p className="mt-3 text-[10px] leading-5 text-slate-500">
              {freelancer.bio || "Ứng viên chưa cung cấp tóm tắt hồ sơ."}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-extrabold">Kỹ năng nổi bật</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skills.length > 0 ? (
                skills.map((skill: string) => (
                  <span
                    key={skill}
                    className="rounded-md bg-indigo-50 px-2 py-1 text-[9px] font-semibold text-indigo-700"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-400">Chưa có kỹ năng.</span>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-extrabold">Kinh nghiệm làm việc</h2>
            <div className="mt-4 space-y-4">
              {history.length > 0 ? (
                history.map((h: any, index: number) => (
                  <div key={index} className="relative flex gap-3 border-l border-indigo-100 pl-4">
                    <span className="absolute -left-[5px] top-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-500" />
                    <div className="w-24 shrink-0 text-[9px] text-slate-400">
                      {h.start_date || "?"} – {h.end_date || "nay"}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold">
                        {h.title} <span className="font-normal text-slate-400">· {h.company}</span>
                      </p>
                      <p className="mt-1 text-[9px] leading-4 text-slate-500">{h.description}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-slate-400">Không có thông tin kinh nghiệm.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h2 className="text-xs font-extrabold">Học vấn & chứng chỉ</h2>
                {education.length > 0 ? (
                  education.map((e: any, index: number) => (
                    <div key={index} className="mt-3">
                      <p className="text-[10px] font-semibold">{e.institution}</p>
                      <p className="text-[9px] text-slate-400">{e.degree}</p>
                    </div>
                  ))
                ) : (
                  <p className="mt-3 text-[10px] text-slate-400">Chưa cập nhật.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <ScoreBars
            onExplain={() => navigate(`/explainable-matching/${proposal.id}`)}
            score={explain?.fit_score}
            factors={explain?.factors}
            isLoading={isLoadingExplain}
          />

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-extrabold">Tài liệu ứng viên</h2>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                <FileText size={13} className="text-indigo-500" />
                <span className="flex-1 text-[9px] font-semibold">CV_Parsed_Data.json</span>
                <Link2 size={11} className="text-slate-400" />
              </div>
            </div>
          </section>
        </aside>
      </div>
    </BusinessShell>
  );
}
