import { Check, Clock3, Pause, Sparkles } from "lucide-react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { BusinessShell } from "@/layout/BusinessShell";
import { JobStepper } from "@/components/JobStepper";
import { useGenerateJD } from "@/hooks/use-jobs";
import type { JobCreate } from "@/hooks/use-jobs";
import jdIllustration from "@/assets/jd-2.png";

function SummaryCard({ form, navigate }: { form: JobCreate, navigate: ReturnType<typeof useNavigate> }) {
  const summary = [
    ["Vị trí", form.title || "—"],
    ["Hình thức trả lương", form.payment_type === "FIXED" ? "Giá cố định" : "Theo giờ"],
    ["Ngân sách", form.budget_min || form.budget_max ? "Đã đặt" : "Thỏa thuận"],
  ];
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-extrabold">Tóm tắt nhu cầu tuyển dụng</h2>
        <button type="button" onClick={() => navigate("/create-job")} className="text-[10px] font-bold text-indigo-600">Chỉnh sửa</button>
      </div>
      <div className="mt-4 space-y-3 text-[10px]">
        {summary.map(([label, value]) => (
          <div key={label}>
            <p className="text-slate-400">{label}</p>
            <p className="mt-0.5 font-bold">{value as React.ReactNode}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
        <p className="font-semibold text-slate-700">Mô tả ngắn:</p>
        <p className="mt-1 leading-4">{form.description.slice(0, 100)}{form.description.length > 100 ? "..." : ""}</p>
      </div>
    </section>
  );
}

function ProgressCard({ navigate, progress }: { navigate: ReturnType<typeof useNavigate>, progress: number }) {
  const statusSteps = [
    "Đang phân tích yêu cầu công việc",
    "Đang tổng hợp thông tin thị trường",
    "Đang soạn thảo nội dung JD...",
  ];

  let currentStepIndex = 0;
  if (progress > 30) currentStepIndex = 1;
  if (progress > 60) currentStepIndex = 2;

  return (
    <section className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative flex w-full items-center justify-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(238,242,255,0.95) 0%, rgba(255,255,255,0) 70%)",
            }}
          />
          <img
            src={jdIllustration}
            alt="AI đang tạo mô tả công việc"
            className="relative block w-full object-contain"
            style={{
              maskImage:
                "radial-gradient(circle at 50% 50%, black 35%, rgba(0,0,0,0.6) 60%, transparent 90%)",
              WebkitMaskImage:
                "radial-gradient(circle at 50% 50%, black 35%, rgba(0,0,0,0.6) 60%, transparent 90%)",
            }}
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-5">
          <div
            className="relative h-20 w-20 rounded-full"
            style={{ background: `conic-gradient(#536df5 ${progress}%, #e9ecff 0)` }}
          >
            <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-white">
              <span className="text-xl font-extrabold text-indigo-600">{progress}%</span>
              <span className="text-[9px] text-slate-400">Đang xử lý...</span>
            </div>
          </div>
          <div className="space-y-3">
            {statusSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-2 text-[10px]">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    index < currentStepIndex
                      ? "bg-emerald-100 text-emerald-600"
                      : index === currentStepIndex
                        ? "border-2 border-indigo-500 text-indigo-500 animate-pulse"
                        : "border border-slate-300 text-transparent"
                  }`}
                >
                  {index < currentStepIndex && <Check size={10} />}
                  {index === currentStepIndex && <Clock3 size={10} />}
                </span>
                <span className={index > currentStepIndex ? "text-slate-400" : "font-semibold text-slate-700"}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-center text-[10px] text-slate-500">
        <Sparkles size={14} className="mr-1 inline text-indigo-500" />
        AI đang phân tích dữ liệu thị trường và hàng nghìn JD thành công để tạo mô tả công việc hấp dẫn của bạn.
      </div>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => navigate("/create-job")}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500 hover:bg-slate-50"
        >
          <Pause size={12} />
          Huỷ tác vụ
        </button>
      </div>
    </section>
  );
}

export default function AIProcessing() {
  const navigate = useNavigate();
  const location = useLocation();
  const generateJD = useGenerateJD();
  const [progress, setProgress] = useState(0);

  const jobForm = location.state?.jobForm as JobCreate;

  useEffect(() => {
    if (!jobForm) return;

    // Fake progress bar while waiting
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p < 85) return p + Math.floor(Math.random() * 5) + 1;
        if (p < 95) return p + 1;
        return p;
      });
    }, 800);

    // Call AI
    generateJD.mutate({
      title: jobForm.title,
      description: jobForm.description,
      category_id: jobForm.category_id,
      budget_min: jobForm.budget_min,
      budget_max: jobForm.budget_max,
      payment_type: jobForm.payment_type,
      skill_ids: jobForm.skill_ids
    }, {
      onSuccess: (data) => {
        clearInterval(interval);
        setProgress(100);
        setTimeout(() => {
          navigate("/generated-jd", {
            state: { jobForm, generatedContent: data.jd_content }
          });
        }, 500);
      },
      onError: () => {
        clearInterval(interval);
        navigate("/create-job");
      }
    });

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobForm]);

  if (!jobForm) {
    return <Navigate to="/create-job" replace />;
  }

  return (
    <BusinessShell active="Tạo JD">
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-medium text-slate-400">Workspace / Tạo JD</p>
        <h1 className="text-[24px] font-extrabold tracking-tight">AI đang tạo JD cho bạn</h1>
        <p className="mt-1 text-xs text-slate-500">
          Hệ thống đang phân tích nhu cầu tuyển dụng và soạn thảo mô tả công việc tối ưu nhất.
        </p>
      </div>
      <JobStepper current={2} />
      <div className="grid items-stretch gap-5 xl:grid-cols-[1fr_2fr]">
        <SummaryCard form={jobForm} navigate={navigate} />
        <ProgressCard progress={progress} navigate={navigate} />
      </div>
    </BusinessShell>
  );
}
