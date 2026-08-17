import { Check, ChevronDown, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { JobStepper } from "@/components/JobStepper";

const channels = ["LinkedIn", "Facebook", "TopCV", "VietnamWorks", "Email nội bộ"];
const tags = ["Hybrid", "22 – 30 triệu", "Agile/Scrum", "Cơ hội phát triển", "Doanh nghiệp ổn định"];
const keywords = ["Business Analyst", "Phân tích nghiệp vụ", "X Agile", "SQL", "Data Analysis", "Stakeholder"];

function SelectField({ label, value, required = false }: { label: string; value: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold text-slate-700">
        {label}
        {required && <b className="ml-0.5 text-rose-500">*</b>}
      </span>
      <div className="flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-[10px] text-slate-700 shadow-sm">
        <span>{value}</span>
        <ChevronDown size={13} className="text-slate-400" />
      </div>
    </label>
  );
}

export default function ContentInput() {
  const navigate = useNavigate();
  return (
    <BusinessShell active="Tin tuyển dụng">
      <JobStepper current={1} tone="indigo" steps={["Nhập yêu cầu", "Kết quả"]} />

      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="mb-1 text-[11px] font-medium text-slate-400">Quản lý / Tin tuyển dụng / AI Content</p>
          <h1 className="text-[24px] font-extrabold tracking-tight">AI tạo content tuyển dụng</h1>
          <p className="mt-1 text-xs text-slate-500">
            AI sẽ chuyển đổi JD thành nội dung tuyển dụng tối ưu cho từng kênh, giúp bạn thu hút đúng ứng viên phù hợp.
          </p>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label="Chọn tin tuyển dụng" value="Senior Business Analyst" required />
            <SelectField label="Mục tiêu" value="Thu hút ứng viên chất lượng" required />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold text-slate-700">
              Kênh đăng tuyển <b className="text-rose-500">*</b>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {channels.map((channel, i) => (
                <button
                  key={channel}
                  className={`flex h-11 items-center justify-center gap-1 rounded-lg border text-[9px] font-semibold ${
                    i < 4 ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md text-[8px] font-extrabold ${
                      i === 0
                        ? "bg-sky-600 text-white"
                        : i === 1
                          ? "bg-blue-600 text-white"
                          : i === 2
                            ? "bg-emerald-500 text-white"
                            : i === 3
                              ? "bg-indigo-500 text-white"
                              : "bg-violet-100 text-violet-600"
                    }`}
                  >
                    {channel.slice(0, 2)}
                  </span>
                  {channel}
                  {i < 4 && <Check size={11} className="text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold text-slate-700">
              Giọng văn <b className="text-rose-500">*</b>
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {["Chuyên nghiệp", "Thân thiện", "Năng động", "Thuyết phục"].map((tone, i) => (
                <button
                  key={tone}
                  className={`h-9 rounded-lg border text-[10px] font-semibold ${
                    i === 0
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold text-slate-700">
              Độ dài nội dung <b className="text-rose-500">*</b>
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["Ngắn", "~80–120 từ"],
                ["Trung bình", "~150–250 từ"],
                ["Chi tiết", "~250–400 từ"],
              ].map(([label, detail], i) => (
                <button
                  key={label}
                  className={`rounded-lg border px-3 py-2 text-left ${
                    i === 1 ? "border-indigo-400 bg-indigo-50" : "border-slate-200"
                  }`}
                >
                  <span className="block text-[10px] font-bold text-slate-700">{label}</span>
                  <span className="text-[9px] text-slate-400">{detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold text-slate-700">Điểm nhấn cần nhắc đến</p>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 p-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[9px] font-semibold text-slate-600"
                >
                  {tag}
                  <X size={10} />
                </span>
              ))}
              <ChevronDown size={13} className="ml-auto mt-1 text-slate-400" />
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[10px] font-bold text-slate-700">CTA mong muốn</p>
            <div className="flex h-10 items-center rounded-lg border border-slate-200 px-3 text-[10px] text-slate-600">
              Ứng tuyển ngay để cùng chúng tôi triển khai các dự án chuyển đổi số
            </div>
            <p className="mt-1 text-right text-[9px] text-slate-400">46/200</p>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[10px] font-bold text-slate-700">Từ khóa ưu tiên</p>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 p-2">
              {keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[9px] font-semibold text-indigo-700"
                >
                  {keyword}
                  <X size={10} />
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-4 text-[10px] font-semibold text-slate-600">
            <label>
              <input type="checkbox" defaultChecked className="mr-2 accent-indigo-600" />
              Tạo nhiều biến thể
            </label>
            <label>
              <input type="checkbox" defaultChecked className="mr-2 accent-indigo-600" />
              Tối ưu theo từng kênh
            </label>
            <label>
              <input type="checkbox" defaultChecked className="mr-2 accent-indigo-600" />
              Đề xuất hashtag
            </label>
            <label>
              <input type="checkbox" className="mr-2 accent-indigo-600" />
              Rút gọn cho social
            </label>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-[#f6f4ff] to-[#f3f8ff] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">AI hỗ trợ tạo content</h2>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white">
                <Sparkles size={16} />
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-4 text-slate-500">
              AI sẽ phân tích JD và tạo nội dung phù hợp với từng kênh tuyển dụng bạn đã chọn.
            </p>
            <h3 className="mt-4 text-[10px] font-bold">AI sẽ giúp bạn:</h3>
            <ul className="mt-2 space-y-2">
              {[
                "Viết nội dung hấp dẫn, đúng giọng văn đã chọn",
                "Tối ưu theo đặc thù từng kênh tuyển dụng",
                "Đề xuất CTA và hashtag hiệu quả",
                "Tăng khả năng thu hút ứng viên chất lượng",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-[10px] text-slate-600">
                  <span className="text-violet-600">●</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Tóm tắt đầu vào</h2>
              <button type="button" onClick={() => navigate("/jobs")} className="text-[10px] font-bold text-indigo-600">Chỉnh sửa</button>
            </div>
            <div className="mt-4 space-y-2.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Tin tuyển dụng</span>
                <b>Senior Business Analyst</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mục tiêu</span>
                <b>Thu hút ứng viên chất lượng</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kênh đăng tuyển</span>
                <b>LinkedIn · Facebook · TopCV</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Giọng văn</span>
                <b>Chuyên nghiệp</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Độ dài</span>
                <b>Trung bình</b>
              </div>
              <div>
                <span className="text-slate-400">CTA</span>
                <p className="mt-1 font-semibold text-slate-700">Ứng tuyển ngay để cùng chúng tôi...</p>
              </div>
            </div>
          </section>

          <button
            onClick={() => navigate("/content-result")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-xs font-bold text-white shadow-lg shadow-indigo-200"
          >
            <Sparkles size={15} />
            Tạo content bằng AI
          </button>
          <button type="button" onClick={() => alert("Lưu bản nháp content — sẽ kết nối backend Sprint 3")} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600">
            Lưu bản nháp
          </button>
        </aside>
      </div>
    </BusinessShell>
  );
}
