import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, GripVertical, Pencil, Save, Sparkles, WandSparkles } from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { JobStepper } from "@/components/JobStepper";

const sections = [
  ["1", "Tiêu đề tuyển dụng", "Senior Business Analyst", "Công ty ABC đang tìm kiếm một chuyên viên phân tích nghiệp vụ có năng lực và tư duy chuyển đổi số cho doanh nghiệp vừa và lớn tại Việt Nam."],
  ["2", "Giới thiệu công ty", "", "Phân tích nghiệp vụ, tư vấn và triển khai các giải pháp phù hợp với các bên liên quan để đạt hiệu quả tối đa."],
  ["3", "Mô tả công việc", "", "Thu thập, phân tích và làm rõ yêu cầu nghiệp vụ từ khách hàng. Phối hợp với đội ngũ phát triển và các bên liên quan trong suốt dự án."],
  ["4", "Trách nhiệm chính", "", "• Đặc tả nghiệp vụ (BRD, Use Case, User Story) và quy trình.\n• Phối hợp với đội phát triển, QA và các bên liên quan.\n• Theo dõi tiến độ dự án và đảm bảo chất lượng bàn giao."],
  ["5", "Yêu cầu ứng viên", "", "• Tối thiểu 3 năm kinh nghiệm ở vị trí Business Analyst.\n• Thành thạo phân tích nghiệp vụ và mô hình hóa quy trình.\n• Kỹ năng giao tiếp, trình bày và làm việc nhóm tốt.\n• Ưu tiên có chứng chỉ CBAP/PMI-PBA."],
  ["6", "Quyền lợi", "", "Môi trường năng động, cơ hội phát triển nghề nghiệp rõ ràng, được đào tạo chuyên môn và hưởng đầy đủ chính sách phúc lợi."],
  ["7", "Thông tin lương thưởng", "", "Mức lương cạnh tranh theo năng lực, thưởng hiệu quả và các chế độ hỗ trợ dành cho nhân sự chủ chốt."],
  ["8", "Câu hỏi sàng lọc", "", "3 câu hỏi sàng lọc ứng viên được AI đề xuất để đánh giá kinh nghiệm và mức độ phù hợp."],
];

function ReviewSection({
  section,
  editing,
  onEdit,
}: {
  section: string[];
  editing: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="group flex gap-2 border-b border-slate-100 py-3 last:border-0">
      <div className="mt-0.5 flex w-5 shrink-0 items-start justify-center text-emerald-600">
        <GripVertical size={13} className="mr-1 text-slate-300" />
        <Check size={13} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold text-slate-700">
            {section[0]}. {section[1]}
          </span>
          {section[0] === "1" && (
            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600">
              AI đề xuất
            </span>
          )}
        </div>
        {section[2] && <p className="mt-1 text-[11px] font-semibold text-slate-700">{section[2]}</p>}
        <p className="mt-1 whitespace-pre-line text-[10px] leading-4 text-slate-500">{section[3]}</p>
      </div>
      <button
        onClick={onEdit}
        aria-label={`Chỉnh sửa ${section[1]}`}
        className={`h-fit rounded p-1.5 ${
          editing ? "bg-indigo-50 text-indigo-600" : "text-slate-400 opacity-0 group-hover:opacity-100"
        }`}
      >
        <Pencil size={12} />
      </button>
    </div>
  );
}

export default function GeneratedJD() {
  const [editing, setEditing] = useState<string | null>(null);
  const navigate = useNavigate();
  const publish = () => alert("Đăng tin tuyển dụng — sẽ gọi POST /api/jobs ở Sprint 3");
  const saveDraft = () => alert("Lưu bản nháp JD — sẽ gọi POST /api/jobs/draft ở Sprint 3");
  return (
    <BusinessShell active="Tạo JD">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[11px] font-medium text-slate-400">Workspace / Tạo JD / Review</p>
          <h1 className="text-[24px] font-extrabold tracking-tight">JD được AI đề xuất</h1>
          <p className="mt-1 text-xs text-slate-500">Xem xét và tuỳ chỉnh nội dung trước khi đăng tin tuyển dụng.</p>
        </div>
        <button type="button" onClick={() => navigate("/create-job")} className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600">
          <WandSparkles size={13} className="text-indigo-500" /> Tạo lại bằng AI
        </button>
      </div>

      <JobStepper current={3} tone="violet" />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-extrabold">Nội dung JD</h2>
              <p className="mt-1 text-[10px] text-slate-400">Bạn có thể kéo thả hoặc chỉnh sửa từng mục</p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600">Đã hoàn tất</span>
          </div>
          {sections.map((section) => (
            <ReviewSection
              key={section[0]}
              section={section}
              editing={editing === section[0]}
              onEdit={() => setEditing(editing === section[0] ? null : section[0])}
            />
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row">
            <button type="button" onClick={publish} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-[10px] font-bold text-white shadow-sm">
              <Sparkles size={13} /> Đăng tin tuyển dụng
            </button>
            <button type="button" onClick={saveDraft} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600">
              <Save size={13} /> Lưu bản nháp
            </button>
            <button
              onClick={() => navigate("/create-job")}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600"
            >
              Tạo lại bằng AI
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
                ["Điều chỉnh mức lương sang 22–30 triệu", "Áp dụng"],
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
                    <button className="mt-1 rounded bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-600">
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

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-extrabold">Xem trước tin tuyển dụng</h2>
            <div className="mt-3 rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-bold">
                Senior Business Analyst{" "}
                <span className="ml-1 rounded bg-emerald-50 px-1 text-[8px] text-emerald-600">Mới</span>
              </p>
              <p className="mt-2 text-[9px] text-slate-500">Công ty ABC · Hà Nội · Full-time · 22 – 30 triệu VND</p>
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="rounded bg-white px-1.5 py-1 text-[8px] text-slate-500">Business Analysis</span>
                <span className="rounded bg-white px-1.5 py-1 text-[8px] text-slate-500">Data Analysis</span>
                <span className="rounded bg-white px-1.5 py-1 text-[8px] text-slate-500">Agile/Scrum</span>
              </div>
            </div>
            <button type="button" onClick={() => alert("Xem chi tiết preview JD — sẽ gọi GET /api/jobs/preview/:id Sprint 3")} className="mt-3 w-full text-right text-[10px] font-bold text-indigo-600">Xem chi tiết preview →</button>
          </section>
        </aside>
      </div>
    </BusinessShell>
  );
}
