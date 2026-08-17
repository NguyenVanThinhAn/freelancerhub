import { useState, type ReactNode } from "react";
import { ChevronDown, Pencil, Plus, Save, Sparkles, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { BusinessShell } from "@/layout/BusinessShell";
import { JobStepper } from "@/components/JobStepper";
import { useCreateJob, useCategories } from "@/hooks/use-jobs";
import type { JobCreate } from "@/hooks/use-jobs";
import { Loader2 } from "lucide-react";
import robotAi from "@/assets/robot-ai.png";

const EMPTY_FORM: JobCreate = {
  title: "",
  description: "",
  payment_type: "FIXED",
  budget_min: undefined,
  budget_max: undefined,
  category_id: undefined,
  skill_ids: [],
};

function Field({ label, value, hint, required = false, children }: { label: string; value?: string; hint?: string; required?: boolean; children?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold text-slate-700">
        {label}
        {required && <b className="ml-0.5 text-rose-500">*</b>}
      </span>
      {children ?? (
        <div className="flex h-9 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-700">
          <span>{value || "—"}</span>
          <ChevronDown size={13} className="text-slate-400" />
        </div>
      )}
      {hint && <span className="mt-1 block text-[9px] text-slate-400">{hint}</span>}
    </label>
  );
}

function SkillTag({ skill, onRemove, variant = "primary" }: { skill: string; onRemove: () => void; variant?: "primary" | "secondary" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${variant === "primary" ? "bg-indigo-50 text-indigo-700" : "bg-slate-50 text-slate-600"}`}>
      {skill}
      <button onClick={onRemove} type="button"><X size={11} /></button>
    </span>
  );
}

export default function CreateJob() {
  const navigate = useNavigate();
  const location = useLocation();
  const createJob = useCreateJob();
  const { data: categories } = useCategories();

  const initialForm = (location.state as any)?.form || EMPTY_FORM;

  const [form, setForm] = useState<JobCreate>(initialForm);
  const [skillInput, setSkillInput] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>(initialForm.skill_ids?.length ? initialForm.skill_ids : ["SQL", "UML", "Business Analysis"]);
  const [optionalSkills, setOptionalSkills] = useState<string[]>(["Power BI", "Agile/Scrum", "Jira"]);
  const [skillType, setSkillType] = useState<"required" | "optional">("required");

  const removeSkill = (skill: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.filter((s) => s !== skill));
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    const target = skillType === "required" ? requiredSkills : optionalSkills;
    const setter = skillType === "required" ? setRequiredSkills : setOptionalSkills;
    if (!target.includes(trimmed)) {
      setter([...target, trimmed]);
    }
    setSkillInput("");
  };

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Vui lòng nhập vị trí và mô tả ngắn");
      return;
    }
    navigate("/ai-processing", { 
      state: { 
        jobForm: { ...form, skill_ids: requiredSkills }
      } 
    });
  };

  const isSubmitting = false; // Moved to AIProcessing

  return (
    <BusinessShell active="Tạo JD">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="mb-1 text-[11px] font-medium text-slate-400">Quản lý / Tạo JD</p>
          <h1 className="text-[24px] font-extrabold tracking-tight">Tạo nhu cầu tuyển dụng</h1>
          <p className="mt-1 text-xs text-slate-500">
            Nhập thông tin nhu cầu tuyển dụng của bạn để AI giúp tạo JD phù hợp, chính xác và thu hút ứng viên.
          </p>
        </div>
        <JobStepper current={1} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {/* Vị trí */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Vị trí <b className="ml-0.5 text-rose-500">*</b>
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="VD: Senior Business Analyst"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-slate-700 shadow-sm outline-none focus:border-indigo-300"
              />
            </div>

            {/* Phòng ban */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Phòng ban <b className="ml-0.5 text-rose-500">*</b>
              </label>
              <select
                value={form.category_id ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || undefined }))}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-slate-700 shadow-sm outline-none focus:border-indigo-300"
              >
                <option value="">Chọn phòng ban</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Hình thức thanh toán */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Hình thức thanh toán <b className="ml-0.5 text-rose-500">*</b>
              </label>
              <div className="flex h-9 items-center gap-2">
                {(["FIXED", "HOURLY"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, payment_type: type }))}
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition ${form.payment_type === type ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-500"}`}
                  >
                    {type === "FIXED" ? "Giá cố định" : "Theo giờ"}
                  </button>
                ))}
              </div>
            </div>

            {/* Ngân sách min */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Ngân sách tối thiểu (VND)
              </label>
              <input
                type="number"
                value={form.budget_min ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, budget_min: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="20,000,000"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-slate-700 shadow-sm outline-none focus:border-indigo-300"
              />
            </div>

            {/* Ngân sách max */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Ngân sách tối đa (VND)
              </label>
              <input
                type="number"
                value={form.budget_max ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, budget_max: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="30,000,000"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-slate-700 shadow-sm outline-none focus:border-indigo-300"
              />
            </div>
          </div>

          {/* Kỹ năng bắt buộc */}
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700">
                Kỹ năng bắt buộc <b className="ml-0.5 text-rose-500">*</b>
              </span>
              <span className="text-[9px] text-slate-400">Nhấn Enter để thêm</span>
            </div>
            <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
              {requiredSkills.map((skill) => (
                <SkillTag key={skill} skill={skill} onRemove={() => removeSkill(skill, requiredSkills, setRequiredSkills)} variant="primary" />
              ))}
              <input
                value={skillType === "required" ? skillInput : ""}
                onChange={(e) => { setSkillType("required"); setSkillInput(e.target.value); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addSkill(); }
                }}
                placeholder="Thêm kỹ năng..."
                className="min-w-24 flex-1 bg-transparent text-[10px] outline-none"
              />
            </div>
          </div>

          {/* Kỹ năng nâng cao */}
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700">Kỹ năng nâng cao</span>
            </div>
            <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
              {optionalSkills.map((skill) => (
                <SkillTag key={skill} skill={skill} onRemove={() => removeSkill(skill, optionalSkills, setOptionalSkills)} variant="secondary" />
              ))}
              <input
                value={skillType === "optional" ? skillInput : ""}
                onChange={(e) => { setSkillType("optional"); setSkillInput(e.target.value); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addSkill(); }
                }}
                placeholder="Thêm kỹ năng..."
                className="min-w-24 flex-1 bg-transparent text-[10px] outline-none"
              />
            </div>
          </div>

          {/* Mô tả */}
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold text-slate-700">
                Mô tả ngắn về công việc <b className="ml-0.5 text-rose-500">*</b>
              </span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={5}
                placeholder="Mô tả công việc, trách nhiệm chính..."
                className="h-[116px] w-full resize-none rounded-lg border border-slate-200 p-3 text-[11px] leading-5 outline-none focus:border-indigo-300"
              />
              <span className="mt-1 block text-right text-[9px] text-slate-400">{form.description.length}/500</span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold text-slate-700">Mục tiêu tuyển dụng</span>
              <textarea
                rows={5}
                placeholder="Mục tiêu và kỳ vọng tuyển dụng..."
                className="h-[116px] w-full resize-none rounded-lg border border-slate-200 p-3 text-[11px] leading-5 outline-none focus:border-indigo-300"
              />
              <span className="mt-1 block text-right text-[9px] text-slate-400">0/500</span>
            </label>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-[#f6f4ff] to-[#f3f8ff] p-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <h2 className="text-xs font-extrabold text-slate-800">AI hỗ trợ tạo JD</h2>
                <p className="mt-2 text-[10px] leading-4 text-slate-500">
                  AI sẽ phân tích thông tin bạn nhập để tạo JD chính xác, hấp dẫn và thu hút ứng viên phù hợp.
                </p>
              </div>
              <div className="col-span-2 flex items-center justify-center">
                <img
                  src={robotAi}
                  alt="AI"
                  className="h-28 w-full max-w-[180px] object-contain"
                />
              </div>
            </div>
            <h3 className="mt-4 text-[10px] font-bold text-slate-700">Gợi ý để có JD chất lượng</h3>
            <ul className="mt-2 space-y-2">
              {[
                "Mô tả rõ ràng trách nhiệm và mục tiêu",
                "Liệt kê kỹ năng bắt buộc và ưu tiên",
                "Đưa ra mức lương cạnh tranh",
                "Nêu bật giá trị & cơ hội phát triển",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-[10px] text-slate-600">
                  <span className="mt-0.5 text-violet-600">●</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Tóm tắt đầu vào</h2>
            </div>
            <div className="mt-4 space-y-2.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Vị trí</span>
                <b className={form.title ? "text-slate-700" : "text-slate-400"}>{form.title || "Chưa nhập"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phòng ban</span>
                <b className="text-slate-700">
                  {categories?.find((c) => c.id === form.category_id)?.name ?? "—"}
                </b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thanh toán</span>
                <b className="text-slate-700">{form.payment_type === "FIXED" ? "Giá cố định" : "Theo giờ"}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ngân sách</span>
                <b className="text-slate-700">
                  {form.budget_min || form.budget_max
                    ? `${form.budget_min ? Number(form.budget_min).toLocaleString() : "—"}${form.budget_min && form.budget_max ? " – " : ""}${form.budget_max ? Number(form.budget_max).toLocaleString() : "—"} VND`
                    : "Thỏa thuận"}
                </b>
              </div>
              <div className="border-t border-slate-100 pt-2">
                <span className="text-slate-400">Kỹ năng chính</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {requiredSkills.slice(0, 3).map((s) => (
                    <span key={s} className="rounded bg-indigo-50 px-1.5 py-1 text-[9px] font-semibold text-indigo-700">{s}</span>
                  ))}
                  {requiredSkills.length > 3 && (
                    <span className="rounded bg-slate-100 px-1.5 py-1 text-[9px] text-slate-500">+{requiredSkills.length - 3}</span>
                  )}
                  {requiredSkills.length === 0 && <span className="text-slate-400">Chưa có</span>}
                </div>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !form.title.trim()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-xs font-bold text-white shadow-lg shadow-indigo-200 transition hover:from-blue-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <><Loader2 size={15} className="animate-spin" /> Đang tạo...</>
            ) : (
              <><Sparkles size={15} /> Tạo JD bằng AI</>
            )}
          </button>
          <button type="button" className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600">
            <Save size={14} /> Lưu bản nháp
          </button>
        </aside>
      </div>
    </BusinessShell>
  );
}
