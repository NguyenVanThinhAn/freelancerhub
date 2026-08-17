import { useState } from "react";
import { Check, Clipboard, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { JobStepper } from "@/components/JobStepper";

const socialPost = `[GÓC TÌM KIẾM ĐỒNG ĐỘI]

Công ty ABC tuyển Senior Business Analyst...

- Ngân sách: 22-30 triệu
- Hybrid tại Hà Nội
- Ký quỹ bảo vệ giao dịch

#FreelanceHubAI #BusinessAnalyst`;

export default function ContentResult() {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(socialPost).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }).catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      });
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };
  return (
    <div className="min-h-screen bg-[#f7f8fc] px-4 py-6 text-slate-900 sm:px-8 lg:px-16">
      <div className="mx-auto max-w-[1180px]">
        <button
          onClick={() => navigate("/content-input")}
          className="text-lg font-extrabold tracking-tight"
        >
          FreelanceHub <span className="text-indigo-600">AI</span>
        </button>
        <JobStepper
          current={2}
          tone="violet"
          steps={["Nhập yêu cầu", "Kết quả"]}
        />
        <div className="mb-6 mt-2">
          <h1 className="text-[24px] font-extrabold tracking-tight">
            Kết quả content tuyển dụng
          </h1>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-700">
            REFERENCE DRAFT · Dev dựng theo Screen Spec BUS-06
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold">Thông tin chiến dịch</h2>
            <div className="mt-5 space-y-4 text-[10px]">
              <div>
                <p className="text-slate-400">Vị trí</p>
                <p className="mt-1 font-semibold">Senior Business Analyst</p>
              </div>
              <div>
                <p className="text-slate-400">Kênh</p>
                <p className="mt-1 font-semibold">Facebook / LinkedIn</p>
              </div>
              <div>
                <p className="text-slate-400">Tone</p>
                <p className="mt-1 font-semibold">Chuyên nghiệp</p>
              </div>
              <div>
                <p className="text-slate-400">Độ dài</p>
                <p className="mt-1 font-semibold">150-250 từ</p>
              </div>
              <div>
                <p className="text-slate-400">CTA</p>
                <p className="mt-1 font-semibold">Ứng tuyển ngay</p>
              </div>
              <div>
                <p className="text-slate-400">Từ khóa</p>
                <p className="mt-1 font-semibold">BA, Agile, SQL</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/content-input")}
              className="mt-8 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-[10px] font-bold text-white shadow-lg shadow-indigo-200"
            >
              <Sparkles size={13} />
              Tạo lại bằng AI
            </button>
          </aside>
          <main className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">A. Bài viết mạng xã hội</h2>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-lg bg-violet-50 px-3 py-2 text-[10px] font-bold text-violet-700"
                >
                  {copied ? <Check size={12} /> : <Clipboard size={12} />}
                  {copied ? "Đã sao chép" : "Sao chép"}
                </button>
              </div>
              <div className="mt-5 space-y-3 text-[10px] leading-5 text-slate-600">
                <p>[GÓC TÌM KIẾM ĐỒNG ĐỘI]</p>
                <p>Công ty ABC tuyển Senior Business Analyst...</p>
                <p>- Ngân sách: 22-30 triệu</p>
                <p>- Hybrid tại Hà Nội</p>
                <p>- Ký quỹ bảo vệ giao dịch</p>
                <p className="pt-2 font-semibold text-slate-500">
                  #FreelanceHubAI #BusinessAnalyst
                </p>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold">B. Kịch bản video ngắn</h2>
              <div className="mt-5 space-y-4 text-[10px] leading-5 text-slate-600">
                <p>
                  <b>Hook 0-3s:</b> Bạn đang tìm dự án BA an toàn?
                </p>
                <p>
                  <b>Body 4-25s:</b> Nêu nhiệm vụ, ngân sách, kỹ năng...
                </p>
                <p>
                  <b>CTA 25-30s:</b> Ứng tuyển trên FreelanceHub AI.
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={() => alert("Lưu & duyệt content — sẽ gọi POST /api/contents Sprint 3")} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white">
                  <Check size={12} />
                  Lưu & duyệt
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
