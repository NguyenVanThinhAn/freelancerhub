import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { Save, Sparkles, WandSparkles } from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { JobStepper } from "@/components/JobStepper";
import { useCreateJob, type JobCreate } from "@/hooks/use-jobs";

export default function GeneratedJD() {
  const navigate = useNavigate();
  const location = useLocation();
  const createJob = useCreateJob();
  
  const jobForm = location.state?.jobForm as JobCreate;
  const generatedContent = location.state?.generatedContent as string;
  
  const [content, setContent] = useState(generatedContent || "");

  if (!jobForm || !generatedContent) {
    return <Navigate to="/create-job" replace />;
  }

  const publish = () => {
    // Override description with the AI generated markdown
    createJob.mutate(
      { ...jobForm, description: content },
      {
        onSuccess: () => {
          navigate("/jobs");
        },
      }
    );
  };

  const saveDraft = () => alert("Lưu bản nháp JD — sẽ gọi API ở Sprint 3");

  return (
    <BusinessShell active="Tạo JD">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[11px] font-medium text-slate-400">Quản lý / Tạo JD / Review</p>
          <h1 className="text-[24px] font-extrabold tracking-tight">JD được AI đề xuất</h1>
          <p className="mt-1 text-xs text-slate-500">Xem xét và tuỳ chỉnh nội dung trước khi đăng tin tuyển dụng.</p>
        </div>
        <button type="button" onClick={() => navigate("/create-job", { state: { form: jobForm } })} className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600">
          <WandSparkles size={13} className="text-indigo-500" /> Tạo lại bằng AI
        </button>
      </div>

      <JobStepper current={3} tone="violet" />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-extrabold">Nội dung JD (Markdown)</h2>
              <p className="mt-1 text-[10px] text-slate-400">Bạn có thể chỉnh sửa trực tiếp nội dung dưới đây</p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600">Đã hoàn tất</span>
          </div>
          
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-3 w-full rounded-lg border border-slate-200 p-4 text-[13px] text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            rows={25}
          />

          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row">
            <button 
              type="button" 
              onClick={publish} 
              disabled={createJob.isPending}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-[10px] font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              <Sparkles size={13} /> {createJob.isPending ? "Đang đăng..." : "Đăng tin tuyển dụng"}
            </button>
            <button type="button" onClick={saveDraft} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50">
              <Save size={13} /> Lưu bản nháp
            </button>
          </div>
          <p className="mt-2 text-[9px] text-slate-400">
            Tin tuyển dụng sẽ tuân thủ chính sách và được kiểm duyệt trước khi hiển thị.
          </p>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">AI đề xuất tối ưu</h2>
              <Sparkles size={15} className="text-indigo-500" />
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["Tiêu đề hiện tại có thể tăng CTR thêm 18%", "+18%"],
                ["Thêm kỹ năng Agile/Scrum", "Thêm"],
                ["Điều chỉnh mức lương theo thị trường", "Áp dụng"],
              ].map(([text, action], i) => (
                <div key={text} className="flex gap-2">
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                      i === 0
                        ? "bg-emerald-50 text-emerald-600"
                        : i === 1
                          ? "bg-violet-50 text-violet-600"
                          : "bg-sky-50 text-sky-600"
                    }`}
                  >
                    <Sparkles size={12} />
                  </span>
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold leading-4 text-slate-700">{text}</p>
                    <button className="mt-1 rounded bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600 hover:bg-indigo-50">
                      {action}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Điểm chất lượng JD</h2>
              <span className="text-lg font-extrabold text-slate-800">
                92<span className="text-[10px] text-slate-400">/100</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100">
              <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            </div>
            <div className="mt-4 space-y-2">
              {[
                ["Độ rõ ràng", "95/100"],
                ["Độ đầy đủ", "90/100"],
                ["Tính hấp dẫn", "92/100"],
                ["Thu hút ứng viên", "90/100"],
                ["Khả năng thu hút", "93/100"],
              ].map(([label, score]) => (
                <div key={label} className="flex items-center gap-2 text-[9px]">
                  <span className="w-24 text-slate-500">{label}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-400"
                      style={{ width: score.split("/")[0] + "%" }}
                    />
                  </div>
                  <span className="w-9 text-right text-slate-500">{score}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </BusinessShell>
  );
}
