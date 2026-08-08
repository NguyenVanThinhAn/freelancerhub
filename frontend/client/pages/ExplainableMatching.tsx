import { ArrowRight, Check, ChevronRight, CircleAlert, FileText, MessageCircle, Sparkles, Star, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { RadarChart, type RadarChartDatum } from "@/components/RadarChart";
import { useProposal, useExplainMatch, formatCurrency } from "@/hooks/use-proposals";
import { Skeleton } from "@/components/ui/skeleton";

function ComparisonHeader({ navigate, proposal, explainData }: { navigate: ReturnType<typeof useNavigate>, proposal: any, explainData: any }) {
  const freelancer = proposal.freelancer;
  
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 to-orange-100 text-sm font-bold text-indigo-700">
            {freelancer?.display_name?.slice(0, 2).toUpperCase() || "FL"}
          </div>
          <div>
            <p className="text-xs font-extrabold">{freelancer?.display_name} <span className="text-indigo-500">✓</span></p>
            <p className="text-[10px] text-slate-500">{freelancer?.headline || "Freelancer"}</p>
            <div className="mt-1 flex gap-2">
              <span className="rounded bg-slate-50 px-2 py-1 text-[8px] text-slate-500">{freelancer?.experience_years ?? 0} năm kinh nghiệm</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-slate-400">
          <span className="rounded-full bg-slate-100 px-2 py-1">VS</span>
          <ArrowRight size={14} />
        </div>
        <div className="flex items-center gap-3 md:justify-end">
          <div>
            <p className="text-right text-xs font-extrabold">Yêu cầu Công việc</p>
            <p className="mt-1 text-right text-[10px] text-slate-500">Job ID: {proposal.job_id.slice(0,8)}</p>
            <div className="mt-1 flex justify-end gap-2">
              <span className="rounded bg-indigo-50 px-2 py-1 text-[8px] text-indigo-600">Bid: {formatCurrency(proposal.bid_amount)}</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <FileText size={22} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-[10px] text-slate-400">Độ phù hợp tổng thể</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold text-indigo-600">{explainData.fit_score}<span className="text-[11px] text-slate-400">/100</span></span>
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-600">Phù hợp</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(`/interview-scheduler/${proposal.id}`)} className="rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-bold text-white">
            <MessageCircle size={12} className="mr-1 inline" />Mời phỏng vấn
          </button>
          <button type="button" onClick={() => alert("Lưu shortlist — đang xây dựng")} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-indigo-600">
            <Star size={12} className="mr-1 inline" />Lưu shortlist
          </button>
        </div>
      </div>
    </section>
  );
}

export default function ExplainableMatching() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const { data: proposal, isLoading: isLoadingProp } = useProposal(id);
  const { data: explainData, isLoading: isLoadingExplain, error: errorExplain } = useExplainMatch(id);

  if (isLoadingProp || isLoadingExplain) {
    return (
      <BusinessShell active="Explainable AI">
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid gap-5 xl:grid-cols-[1fr_1fr_300px]">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      </BusinessShell>
    );
  }

  if (errorExplain || !proposal || !explainData) {
    return (
      <BusinessShell active="Explainable AI">
        <div className="py-12 text-center">
          <p className="text-xs text-red-500">Không phân tích được dữ liệu. Vui lòng thử lại.</p>
          <button
            type="button"
            onClick={() => navigate(`/candidate-detail/${id}`)}
            className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600"
          >
            Quay lại Hồ sơ
          </button>
        </div>
      </BusinessShell>
    );
  }

  const { factors, pros, cons, interview_questions } = explainData;

  const radarDimensions: RadarChartDatum[] = [
    { label: "Kỹ năng chuyên môn", value: factors.hard_skills, color: "#4f46e5" },
    { label: "Kinh nghiệm", value: factors.experience, color: "#8b5cf6" },
    { label: "Giao tiếp", value: factors.communication, color: "#0ea5e9" },
    { label: "Kiến thức miền", value: factors.domain_fit, color: "#f59e0b" },
    { label: "Kỳ vọng lương", value: factors.salary_fit, color: "#10b981" },
  ];

  const factorsList = [
    ["Hard skills", `${factors.hard_skills}/100`],
    ["Kinh nghiệm", `${factors.experience}/100`],
    ["Domain fit", `${factors.domain_fit}/100`],
    ["Giao tiếp", `${factors.communication}/100`],
    ["Salary fit", `${factors.salary_fit}/100`]
  ];

  return (
    <BusinessShell active="Explainable AI">
      <div className="mb-4 flex items-center gap-2 text-[10px] text-slate-400">
        <button onClick={() => navigate(`/candidate-detail/${id}`)} className="hover:text-indigo-600">Hồ sơ ứng viên</button>
        <ChevronRight size={12} />
        <span className="font-semibold text-indigo-600">Giải thích AI Matching</span>
      </div>
      <div className="mb-5">
        <h1 className="text-[24px] font-extrabold tracking-tight">Explainable AI Matching</h1>
        <p className="mt-1 text-xs text-slate-500">Giải thích chi tiết vì sao ứng viên phù hợp với vị trí tuyển dụng.</p>
      </div>

      <ComparisonHeader navigate={navigate} proposal={proposal} explainData={explainData} />

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1fr_1fr_300px]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-extrabold">1. Phù hợp theo tiêu chí chính</h2>
          <div className="mt-5 flex justify-center">
            <RadarChart data={radarDimensions} />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {radarDimensions.map((dim, i) => (
              <span key={dim.label} className="flex items-center gap-1 text-[9px] text-slate-500">
                <i className={`h-2 w-2 rounded-full ${["bg-indigo-600", "bg-violet-500", "bg-sky-500", "bg-amber-500", "bg-emerald-500"][i]}`} />
                {dim.label}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-extrabold">2. Lý do phù hợp (Pros)</h2>
          <div className="mt-4 space-y-3">
            {pros.map((reason, i) => (
              <div key={i} className="flex gap-2 text-[10px] leading-4 text-slate-600">
                <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                {reason}
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-indigo-50/60 p-3 text-[9px] leading-4 text-slate-500">
            <Sparkles size={12} className="mr-1 inline text-indigo-500" />
            AI tổng hợp dựa trên dữ liệu hồ sơ, yêu cầu JD và lịch sử dự án đã xác minh.
          </div>
        </section>

        <section className="row-span-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-extrabold">Phân rã điểm matching</h2>
          <div className="mt-4 space-y-3">
            {factorsList.map(([label, score]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-[9px]">
                  <span className="text-slate-500">{label}</span>
                  <b>{score}</b>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: score.split("/")[0] + "%" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-[9px] text-slate-600">
            <Check size={13} className="mr-1 inline text-emerald-500" />
            Ứng viên được phân tích thông qua trí tuệ nhân tạo.
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-extrabold">3. Khoảng trống cần đánh giá thêm (Cons)</h2>
          <div className="mt-4 space-y-3 text-[10px] text-slate-600">
            {cons.map((con, i) => (
              <p key={i} className="flex gap-2">
                <CircleAlert size={14} className="shrink-0 text-amber-500" />
                {con}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <h2 className="text-xs font-extrabold">4. Câu hỏi phỏng vấn AI đề xuất</h2>
          <ol className="mt-4 space-y-2 text-[10px] text-slate-600">
            {interview_questions.map((question, i) => (
              <li key={i} className="flex gap-2">
                <b className="text-indigo-600">{i + 1}.</b>
                {question}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </BusinessShell>
  );
}
