import { Check, Clock3, Pause, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { JobStepper } from "@/components/JobStepper";
import jdIllustration from "@/assets/jd-2.png";

const summary = [
  ["Vị trí", "UI/UX Designer"],
  ["Cấp bậc", "Middle (2–4 năm)"],
  ["Hình thức làm việc", "Full-time · Hybrid"],
  ["Địa điểm", "Hà Nội, Việt Nam"],
  ["Ngành nghề", "Công nghệ / SaaS"],
  ["Mức lương đề xuất", "20,000,000 – 28,000,000 ₫"],
  ["Ngày bắt đầu", "Càng sớm càng tốt"],
];

const processItems = [
  "Phân tích tính năng công việc",
  "Đề xuất tiêu đề và cấp bậc",
  "Soạn thảo toàn bộ công việc",
  "Mô tả trách nhiệm chính",
  "Yêu cầu kỹ năng cần thiết",
  "Quyền lợi & phúc lợi",
  "Câu hỏi sàng lọc ứng viên",
];

function SummaryCard({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
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
            <p className="mt-0.5 font-bold">{value}</p>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => alert("Xem chi tiết yêu cầu JD — sẽ kết nối backend Sprint 3")} className="mt-7 text-[10px] font-bold text-indigo-600">Xem chi tiết yêu cầu →</button>
    </section>
  );
}

function ProgressCard({ navigate }: { navigate: (path: string) => void }) {
  const statusSteps = [
    "Đang phân tích tính năng bắt buộc",
    "Đang đề xuất phạm vi trách nhiệm",
    "Đang tối ưu tiêu đề và mức lương",
  ];

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
            style={{ background: "conic-gradient(#536df5 76%, #e9ecff 0)" }}
          >
            <div className="absolute inset-2 flex flex-col items-center justify-center rounded-full bg-white">
              <span className="text-xl font-extrabold text-indigo-600">76%</span>
              <span className="text-[9px] text-slate-400">Đang xử lý...</span>
            </div>
          </div>
          <div className="space-y-3">
            {statusSteps.map((step, index) => (
              <div key={step} className="flex items-center gap-2 text-[10px]">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    index === 0
                      ? "bg-emerald-100 text-emerald-600"
                      : index === 1
                        ? "border-2 border-indigo-500"
                        : "border border-slate-300"
                  }`}
                >
                  {index === 0 && <Check size={10} />}
                </span>
                <span className={index === 2 ? "text-slate-400" : "font-semibold text-slate-700"}>{step}</span>
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
          onClick={() => navigate("/generated-jd")}
          className="flex h-9 flex-1 items-center justify-center rounded-lg bg-indigo-600 text-[10px] font-bold text-white shadow-sm"
        >
          Xem bản nháp JD
        </button>
        <button
          onClick={() => navigate("/create-job")}
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-500"
        >
          <Pause size={12} />
          Huỷ tác vụ
        </button>
      </div>
      <p className="mt-3 text-center text-[9px] text-slate-400">
        Bạn có thể đóng trang này. Chúng tôi sẽ thông báo khi bản nháp JD sẵn sàng.
      </p>
    </section>
  );
}

function ActivityCard() {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-extrabold">AI đang xử lý</h2>
        <span className="flex items-center gap-1 text-[9px] font-semibold text-indigo-600">
          <i className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Đang hoạt động
        </span>
      </div>
      <div className="mt-4 space-y-4">
        {processItems.map((item, index) => (
          <div key={item} className="flex gap-2 text-[10px]">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                index < 2
                  ? "bg-emerald-100 text-emerald-600"
                  : index === 2
                    ? "border border-indigo-500 text-indigo-500"
                    : "border border-slate-200 text-slate-300"
              }`}
            >
              {index < 2 ? (
                <Check size={10} />
              ) : index === 2 ? (
                <Clock3 size={9} />
              ) : (
                <span className="h-1 w-1 rounded-full bg-slate-300" />
              )}
            </span>
            <div>
              <p className={index > 2 ? "text-slate-400" : "font-semibold text-slate-700"}>{item}</p>
              {index < 3 && (
                <p className="mt-0.5 text-[9px] text-slate-400">
                  {index === 2 ? "Đang xử lý..." : "Đã hoàn tất"}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-lg bg-slate-50 p-3 text-[9px] leading-4 text-slate-500">
        <Sparkles size={12} className="mr-1 inline text-indigo-500" />
        AI của FreelanceHub AI được huấn luyện trên dữ liệu tuyển dụng thực tế và luôn cập nhật xu hướng thị trường.
      </div>
    </section>
  );
}

export default function AIProcessing() {
  const navigate = useNavigate();
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
      <div className="grid items-stretch gap-5 xl:grid-cols-[1fr_1.45fr_320px]">
        <SummaryCard navigate={navigate} />
        <ProgressCard navigate={navigate} />
        <ActivityCard />
      </div>
    </BusinessShell>
  );
}
