import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProposal } from "@/hooks/use-proposals";
import { toast } from "sonner";
import { apiPost } from "@/api/client";
import { CalendarDays, Check, ChevronLeft, ChevronRight, FileText, Pencil, PenLine, Plus, ShieldCheck, Trash2, Loader2 } from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { useCreateContract, useMyContracts, MILESTONE_STATUS_LABELS, MILESTONE_STATUS_TONE, formatCurrency } from "@/hooks/use-contracts";
import { Skeleton } from "@/components/ui/skeleton";

const STEPS = [
  { num: 1, label: "Thông tin chung", shortLabel: "Thông tin chung" },
  { num: 2, label: "Milestone & Thanh toán", shortLabel: "Milestone" },
  { num: 3, label: "Điều khoản", shortLabel: "Điều khoản" },
  { num: 4, label: "Xem trước & Gửi", shortLabel: "Xem trước & Gửi" },
];

const STEP_H = 48;
const ARROW_SIZE = 15;

const clipFirst = `polygon(0 0, calc(100% - ${ARROW_SIZE}px) 0, 100% 50%, calc(100% - ${ARROW_SIZE}px) 100%, 0 100%)`;
const clipMiddle = `polygon(0 0, calc(100% - ${ARROW_SIZE}px) 0, 100% 50%, calc(100% - ${ARROW_SIZE}px) 100%, 0 100%, ${ARROW_SIZE}px 50%)`;
const clipLast = `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${ARROW_SIZE}px 50%)`;

const STEP_BG: Record<string, { bgClass: string; textClass: string; badgeClass: string }> = {
  current: { bgClass: "bg-indigo-100", textClass: "text-indigo-700", badgeClass: "bg-indigo-600" },
  done: { bgClass: "bg-emerald-50", textClass: "text-emerald-700", badgeClass: "bg-emerald-500" },
  pending: { bgClass: "bg-white", textClass: "text-slate-400", badgeClass: "bg-slate-200 text-slate-500" },
};

function getStepState(num: number, current: number): "done" | "current" | "pending" {
  if (num < current) return "done";
  if (num === current) return "current";
  return "pending";
}

function ContractMilestoneStepper({ currentStep, onStepChange }: { currentStep: number; onStepChange: (step: number) => void }) {
  return (
    <div className="relative mb-5 flex w-full items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white text-[10px] font-semibold shadow-sm" style={{ minHeight: STEP_H }}>
      {STEPS.map((step, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === STEPS.length - 1;
        const state = getStepState(step.num, currentStep);
        const s = STEP_BG[state];
        const clipPath = isFirst ? clipFirst : isLast ? clipLast : clipMiddle;
        return (
          <button
            key={step.num}
            type="button"
            onClick={() => onStepChange(step.num)}
            className={["relative flex flex-1 items-center justify-center gap-2 py-3 pl-6 pr-6", s.bgClass, s.textClass].join(" ")}
            style={{ clipPath, marginLeft: isFirst ? 0 : `-${ARROW_SIZE}px` }}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${s.badgeClass}`}>
              {state === "done" ? <Check size={11} /> : step.num}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
            <span className="sm:hidden">{step.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function ContractMilestone() {
  const [searchParams] = useSearchParams();
  const proposalId = searchParams.get("proposalId");
  const { data: proposal, isLoading: proposalLoading } = useProposal(proposalId ?? undefined);
  const navigate = useNavigate();
  const createContract = useCreateContract();

  const [currentStep, setCurrentStep] = useState(1);
  const [zoomContract, setZoomContract] = useState(false);

  // Signature canvas state
  const [sigAData, setSigAData] = useState<string[]>([]);
  const [sigBData, setSigBData] = useState<string[]>([]);
  const sigAPadRef = useRef<HTMLCanvasElement>(null);
  const sigBPadRef = useRef<HTMLCanvasElement>(null);
  const drawingA = useRef(false);
  const drawingB = useRef(false);

  // Get canvas context + handle coordinate
  const getCtx = (ref: React.RefObject<HTMLCanvasElement | null>) => {
    const c = ref.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return { ctx: c.getContext("2d"), rect };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent, party: "A" | "B") => {
    const ref = party === "A" ? sigAPadRef : sigBPadRef;
    const { ctx, rect } = getCtx(ref) ?? {};
    if (!ctx || !rect) return;
    if (party === "A") drawingA.current = true;
    else drawingB.current = true;
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent, party: "A" | "B") => {
    const ref = party === "A" ? sigAPadRef : sigBPadRef;
    const isDrawing = party === "A" ? drawingA.current : drawingB.current;
    if (!isDrawing) return;
    const { ctx, rect } = getCtx(ref) ?? {};
    if (!ctx || !rect) return;
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = (party: "A" | "B") => {
    if (party === "A") drawingA.current = false;
    else drawingB.current = false;
  };

  const clearSig = (party: "A" | "B") => {
    const ref = party === "A" ? sigAPadRef : sigBPadRef;
    const c = ref.current;
    if (!c) return;
    c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    if (party === "A") setSigAData([]);
    else setSigBData([]);
  };
  const [terms, setTerms] = useState({
    paymentTerms: "Thanh toán trong vòng 7 ngày sau khi milestone được nghiệm thu.",
    revisionLimit: 2,
    ipAssignment: "Toàn bộ quyền sở hữu trí tuệ thuộc về Khách hàng sau khi thanh toán đầy đủ.",
    confidentiality: "Hai bên cam kết bảo mật thông tin dự án trong vòng 24 tháng.",
    latePenalty: "Phạt 0.05% giá trị hợp đồng/ngày khi trễ hạn (tối đa 10%).",
    cancellation: "Bên hủy hợp đồng trước khi bắt đầu chịu phí 5% giá trị hợp đồng.",
  });

  // Mock milestone list for wizard display (will be replaced by contract milestones after creation)
  const [milestoneList, setMilestoneList] = useState<Array<{
    title: string; description: string; due_date: string; amount: number; percent: number;
  }>>([
    { title: "Nghiên cứu & Wireframe", description: "Nghiên cứu yêu cầu, phân tích khách hàng và đưa ra wireframe", due_date: "17/06/2024", amount: 10000000, percent: 20 },
    { title: "Thiết kế UI - High Fidelity", description: "Thiết kế giao diện UI hoàn chỉnh dựa trên wireframe đã duyệt", due_date: "27/06/2024", amount: 15000000, percent: 30 },
    { title: "Lập trình Frontend", description: "Lập trình giao diện responsive và tích hợp API", due_date: "12/07/2024", amount: 20000000, percent: 30 },
    { title: "Kiểm thử & Bàn giao", description: "Kiểm thử, sửa lỗi và bàn giao mã nguồn, tài liệu", due_date: "24/07/2024", amount: 5000000, percent: 10 },
  ]);

  // Load existing contracts to show in summary
  const { data: contracts, isLoading: contractsLoading } = useMyContracts();

  // Step 2 milestone form state
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", due_date: "", amount: "", percent: "" });
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", description: "", due_date: "", amount: "", percent: "" });

  const goPrev = () => setCurrentStep((s) => Math.max(1, s - 1));
  const goNext = () => setCurrentStep((s) => Math.min(STEPS.length, s + 1));

  const totalAmount = milestoneList.reduce((sum, m) => sum + m.amount, 0);

  const handleEditStart = (idx: number) => {
    const m = milestoneList[idx];
    setEditingIdx(idx);
    setEditForm({
      title: m.title,
      description: m.description,
      due_date: m.due_date,
      amount: String(m.amount),
      percent: String(m.percent),
    });
  };

  const handleEditSave = () => {
    if (editingIdx === null) return;
    setMilestoneList((list) =>
      list.map((m, i) =>
        i === editingIdx
          ? { ...m, title: editForm.title, description: editForm.description, due_date: editForm.due_date, amount: Number(editForm.amount) || 0, percent: Number(editForm.percent) || 0 }
          : m
      )
    );
    setEditingIdx(null);
  };

  const handleAddNew = () => {
    const amount = Number(newForm.amount) || 0;
    const percent = Number(newForm.percent) || 0;
    if (!newForm.title.trim()) return;
    setMilestoneList((list) => [
      ...list,
      { title: newForm.title, description: newForm.description, due_date: newForm.due_date, amount, percent },
    ]);
    setNewForm({ title: "", description: "", due_date: "", amount: "", percent: "" });
    setAddingNew(false);
  };

  const removeMilestone = (idx: number) =>
    setMilestoneList((list) => list.filter((_, i) => i !== idx));

  return (
    <BusinessShell active="Hợp đồng">
      <div className="mb-5">
        <p className="mb-1 text-[11px] text-slate-400">Quản lý / Hợp đồng</p>
        <h1 className="text-[24px] font-extrabold tracking-tight">Tạo hợp đồng theo milestone</h1>
      </div>

      <ContractMilestoneStepper currentStep={currentStep} onStepChange={setCurrentStep} />

      {/* Project summary */}
      <section className="mb-5 grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:grid-cols-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><FileText size={17} /></div>
          <div>
            <p className="text-[9px] text-slate-400">Dự án</p>
            <p className="text-[10px] font-bold">{proposal ? `Job #${proposal.job_id.slice(0, 8)}` : "Website thương mại điện tử"}</p>
          </div>
        </div>
        <div>
          <p className="text-[9px] text-slate-400">Freelancer</p>
          <p className="text-[10px] font-bold">{proposal?.freelancer?.display_name || "Nguyễn Minh Anh"}</p>
          <p className="text-[9px] text-amber-500">★ 4.9 (38 đánh giá)</p>
        </div>
        <div>
          <p className="text-[9px] text-slate-400">Loại hợp đồng</p>
          <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-600">Theo milestone</span>
        </div>
        <div>
          <p className="text-[9px] text-slate-400">Thời gian dự kiến</p>
          <p className="mt-1 flex items-center gap-1 text-[10px] font-bold"><CalendarDays size={12} />45 ngày</p>
          <p className="text-[9px] text-slate-400">10/06/2024 – 24/07/2024</p>
        </div>
      </section>

      {/* Step 1: General info */}
      {currentStep === 1 && (
        <section className="mb-5 grid gap-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-xs font-extrabold">Thông tin dự án</h2>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold text-slate-700">Tên dự án</span>
              <input value={proposal ? `Job #${proposal.job_id.slice(0, 8)}` : "Website thương mại điện tử"} readOnly className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold text-slate-700">Mô tả ngắn</span>
              <textarea defaultValue="Xây dựng website thương mại điện tử full-stack với Next.js và Stripe." className="h-20 w-full resize-none rounded-lg border border-slate-200 p-3 text-[11px] outline-none focus:border-indigo-300" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold text-slate-700">Ngày bắt đầu</span>
              <input defaultValue="10/06/2024" className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300" />
            </label>
          </div>
          <div className="space-y-4">
            <h2 className="text-xs font-extrabold">Thông tin freelancer & khách hàng</h2>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold text-slate-700">Freelancer</span>
              <input value={proposal?.freelancer?.display_name || "Nguyễn Minh Anh"} readOnly className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold text-slate-700">Email freelancer</span>
              <input defaultValue="minhanh@example.com" className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold text-slate-700">Công ty khách hàng</span>
              <input defaultValue="Your Organization" className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300" />
            </label>
          </div>
        </section>
      )}

      {/* Step 2: Milestones */}
      {currentStep === 2 && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-extrabold">Milestone & Thanh toán</h2>
                <p className="mt-1 text-[10px] text-slate-400">Chia dự án thành các giai đoạn thanh toán</p>
              </div>
              <button type="button" onClick={() => setAddingNew(true)} className="flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-2 text-[10px] font-bold text-indigo-600">
                <Plus size={13} />Thêm milestone
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="border-y border-slate-100 text-[9px] text-slate-400">
                  <tr>
                    <th className="py-2">#</th>
                    <th>Milestone</th>
                    <th>Mô tả</th>
                    <th>Hạn hoàn thành</th>
                    <th>Thanh toán (VND)</th>
                    <th>Tỷ lệ (%)</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {milestoneList.map((milestone, i) => (
                    <tr key={`${milestone.title}-${i}`} className="border-b border-slate-50 text-[10px]">
                      <td className="py-3 font-bold text-slate-400">{i + 1}</td>
                      <td className="font-bold">
                        {editingIdx === i ? (
                          <input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="h-7 w-full min-w-[120px] rounded border border-indigo-300 bg-white px-2 text-[10px] font-bold outline-none" />
                        ) : (
                          <span className="text-slate-700">{milestone.title}</span>
                        )}
                      </td>
                      <td className="max-w-[190px] text-[9px] leading-4 text-slate-500">
                        {editingIdx === i ? (
                          <input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="h-7 w-full rounded border border-indigo-300 bg-white px-2 text-[9px] outline-none" />
                        ) : (
                          <span className="line-clamp-2">{milestone.description}</span>
                        )}
                      </td>
                      <td>
                        {editingIdx === i ? (
                          <input value={editForm.due_date} onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))} className="h-7 w-24 rounded border border-indigo-300 bg-white px-2 text-[9px] outline-none" />
                        ) : (
                          <span className="flex items-center gap-1"><CalendarDays size={11} className="text-slate-400" />{milestone.due_date}</span>
                        )}
                      </td>
                      <td className="font-bold">
                        {editingIdx === i ? (
                          <input type="number" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} className="h-7 w-24 rounded border border-indigo-300 bg-white px-2 text-[10px] font-bold outline-none" />
                        ) : (
                          <span className="text-slate-700">{formatCurrency(milestone.amount)}</span>
                        )}
                      </td>
                      <td>
                        {editingIdx === i ? (
                          <input type="number" value={editForm.percent} onChange={(e) => setEditForm((f) => ({ ...f, percent: e.target.value }))} className="h-7 w-12 rounded border border-indigo-300 bg-white px-2 text-[9px] outline-none" />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-12 rounded-full bg-slate-100"><span className="block h-full rounded-full bg-indigo-500" style={{ width: `${milestone.percent}%` }} /></span>
                            <span className="text-[9px] text-slate-500">{milestone.percent}%</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {editingIdx === i ? (
                          <div className="flex gap-1">
                            <button type="button" onClick={handleEditSave} className="rounded bg-emerald-100 p-1 text-emerald-600"><Check size={12} /></button>
                            <button type="button" onClick={() => setEditingIdx(null)} className="rounded bg-slate-100 p-1 text-slate-500">✕</button>
                          </div>
                        ) : (
                          <div className="flex gap-2 text-slate-400">
                            <button type="button" onClick={() => handleEditStart(i)} className="rounded p-1 hover:bg-slate-100"><Pencil size={12} /></button>
                            <button type="button" onClick={() => removeMilestone(i)} className="rounded p-1 text-rose-400 hover:bg-rose-50"><Trash2 size={13} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Add new row */}
                  {addingNew && (
                    <tr className="border-b border-indigo-100 bg-indigo-50/30">
                      <td className="py-3 font-bold text-indigo-400">{milestoneList.length + 1}</td>
                      <td><input value={newForm.title} onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))} placeholder="Tên milestone" className="h-7 w-full min-w-[120px] rounded border border-indigo-300 bg-white px-2 text-[10px] font-bold outline-none" /></td>
                      <td><input value={newForm.description} onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))} placeholder="Mô tả" className="h-7 w-full rounded border border-indigo-300 bg-white px-2 text-[9px] outline-none" /></td>
                      <td><input value={newForm.due_date} onChange={(e) => setNewForm((f) => ({ ...f, due_date: e.target.value }))} placeholder="dd/mm/yyyy" className="h-7 w-24 rounded border border-indigo-300 bg-white px-2 text-[9px] outline-none" /></td>
                      <td><input type="number" value={newForm.amount} onChange={(e) => setNewForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" className="h-7 w-24 rounded border border-indigo-300 bg-white px-2 text-[10px] font-bold outline-none" /></td>
                      <td><input type="number" value={newForm.percent} onChange={(e) => setNewForm((f) => ({ ...f, percent: e.target.value }))} placeholder="0" className="h-7 w-12 rounded border border-indigo-300 bg-white px-2 text-[9px] outline-none" /></td>
                      <td>
                        <div className="flex gap-1">
                          <button type="button" onClick={handleAddNew} className="rounded bg-emerald-100 p-1 text-emerald-600"><Check size={12} /></button>
                          <button type="button" onClick={() => setAddingNew(false)} className="rounded bg-slate-100 p-1 text-slate-500">✕</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="text-[10px] font-extrabold">
                    <td colSpan={4} className="py-3 text-right">Tổng cộng</td>
                    <td className="text-indigo-600">{formatCurrency(totalAmount)}</td>
                    <td>{milestoneList.reduce((s, m) => s + m.percent, 0)}%</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                <div>
                  <p className="text-[10px] font-bold">Ký quỹ an toàn (Escrow)</p>
                  <p className="text-[9px] text-slate-400">FreelanceHub AI giữ tiền an toàn</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] text-slate-400">Số dư hiện tại</p>
                <p className="text-sm font-extrabold text-emerald-600">{formatCurrency(60000000)}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400">Số dư sau ký quỹ</p>
                <p className="text-sm font-extrabold">{formatCurrency(Math.max(0, 60000000 - totalAmount))}</p>
                <p className="text-[9px] text-slate-400">{Math.round((totalAmount / 60000000) * 100)}% tổng giá trị</p>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-extrabold">Tóm tắt hợp đồng</h2>
              <div className="mt-4 space-y-3 text-[10px]">
                <div className="flex justify-between"><span className="text-slate-400">Tổng giá trị</span><b className="text-indigo-600">{formatCurrency(totalAmount)}</b></div>
                <div className="flex justify-between"><span className="text-slate-400">Số milestone</span><b>{milestoneList.length}</b></div>
                <div className="flex justify-between"><span className="text-slate-400">Thời gian dự kiến</span><b>45 ngày</b></div>
                <div className="flex justify-between"><span className="text-slate-400">Bắt đầu dự kiến</span><b>10/06/2024</b></div>
                <div className="flex justify-between"><span className="text-slate-400">Hoàn thành dự kiến</span><b>24/07/2024</b></div>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-extrabold"><ShieldCheck size={14} className="mr-1 inline text-indigo-500" />Ký quỹ an toàn</h2>
              <p className="mt-3 text-[10px] leading-5 text-slate-500">Số tiền ký quỹ sẽ an toàn trong hệ thống và chỉ được giải ngân sau khi freelancer hoàn thành milestone.</p>
            </section>
          </aside>
        </div>
      )}

      {/* Step 3: Terms */}
      {currentStep === 3 && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-extrabold">Điều khoản hợp đồng</h2>
            <p className="text-[10px] text-slate-400">Các điều khoản sẽ được đính kèm hợp đồng. Hai bên cần đồng ý trước khi ký.</p>
            {[
              { key: "paymentTerms", label: "Điều kiện thanh toán", multiline: true },
              { key: "revisionLimit", label: "Số lần chỉnh sửa miễn phí", multiline: false, type: "number" },
              { key: "ipAssignment", label: "Chuyển nhượng quyền sở hữu trí tuệ", multiline: true },
              { key: "confidentiality", label: "Bảo mật thông tin", multiline: true },
              { key: "latePenalty", label: "Phạt trễ hạn", multiline: false },
              { key: "cancellation", label: "Điều kiện hủy hợp đồng", multiline: true },
            ].map(({ key, label, multiline, type }) => (
              <label key={key} className="block">
                <span className="mb-1.5 block text-[10px] font-bold text-slate-700">{label}</span>
                {multiline ? (
                  <textarea
                    value={terms[key as keyof typeof terms]}
                    onChange={(e) => setTerms((t) => ({ ...t, [key]: e.target.value }))}
                    className="h-20 w-full resize-none rounded-lg border border-slate-200 p-3 text-[11px] outline-none focus:border-indigo-300"
                  />
                ) : (
                  <input
                    type={type ?? "text"}
                    value={terms[key as keyof typeof terms]}
                    onChange={(e) => setTerms((t) => ({ ...t, [key]: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300"
                  />
                )}
              </label>
            ))}
          </section>
          <aside className="space-y-4">
            <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-[#f6f4ff] to-[#f3f8ff] p-4">
              <h2 className="text-xs font-extrabold text-indigo-700">Mẹo từ AI</h2>
              <ul className="mt-3 space-y-2 text-[10px] text-slate-600">
                <li>ⓘ Đặt số lần revision rõ ràng để tránh tranh chấp.</li>
                <li>ⓘ Quy định phạt trễ hạn giúp bảo vệ deadline.</li>
                <li>ⓘ Điều khoản bảo mật nên gắn với NDA riêng nếu cần.</li>
              </ul>
            </section>
          </aside>
        </div>
      )}

      {/* Step 4: Preview */}
      {currentStep === 4 && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-xs font-extrabold">Xem trước hợp đồng</h2>
              <p className="mt-1 text-[10px] text-slate-400">Tài liệu này sẽ được gửi cho freelancer để ký.</p>
            </div>
            <div className="space-y-3">
              {/* Zoom toggle */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500">
                  {zoomContract ? "Nội dung hợp đồng" : "Xem trước hợp đồng"}
                </span>
                <button
                  type="button"
                  onClick={() => setZoomContract((z) => !z)}
                  className="flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-[10px] font-bold text-indigo-600 transition hover:bg-indigo-50"
                >
                  <PenLine size={12} />
                  {zoomContract ? "Thu nhỏ" : "Phóng to"}
                </button>
              </div>

              {/* Contract content — normal or zoomed */}
              <div className={zoomContract
                ? "rounded-xl border border-indigo-200 bg-white p-6 text-sm leading-relaxed text-slate-700 max-h-[70vh] overflow-y-auto"
                : "rounded-xl border border-slate-200 bg-slate-50 p-4 text-[10px] leading-5 text-slate-700"
              }>
                <p className="mb-2 text-sm font-extrabold">HỢP ĐỒNG CUNG CẤP DỊCH VỤ</p>
                <p><b>Bên A (Khách hàng):</b> Your Organization</p>
                <p><b>Bên B (Freelancer):</b> Nguyễn Minh Anh</p>
                <p><b>Dự án:</b> Website thương mại điện tử</p>
                <p><b>Thời gian:</b> 10/06/2024 – 24/07/2024 (45 ngày)</p>
                <p className="mt-3"><b>Tổng giá trị hợp đồng:</b> {formatCurrency(totalAmount)}</p>
                <p><b>Số milestone:</b> {milestoneList.length}</p>
                {milestoneList.map((m, i) => (
                  <p key={i}><b>MS{i + 1}:</b> {m.title} — {formatCurrency(m.amount)} ({m.percent}%) — {m.due_date}</p>
                ))}
                <p className="mt-3"><b>Điều kiện thanh toán:</b> {terms.paymentTerms}</p>
                <p><b>Số lần chỉnh sửa:</b> {terms.revisionLimit}</p>
                <p><b>Quyền sở hữu trí tuệ:</b> {terms.ipAssignment}</p>
                <p><b>Bảo mật:</b> {terms.confidentiality}</p>
                <p><b>Phạt trễ hạn:</b> {terms.latePenalty}</p>
                <p><b>Hủy hợp đồng:</b> {terms.cancellation}</p>
              </div>

              {/* Signature section — interactive canvas drawing */}
              <div className="grid grid-cols-2 gap-6">
                {/* Party A (Customer) */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500">Chữ ký Bên A (Khách hàng)</p>
                  <div className="relative rounded-xl border-2 border-dashed border-indigo-200 bg-white overflow-hidden">
                    <canvas
                      ref={sigAPadRef}
                      width={280}
                      height={120}
                      className="block w-full cursor-crosshair touch-none"
                      onMouseDown={(e) => startDraw(e, 'A')}
                      onMouseMove={(e) => draw(e, 'A')}
                      onMouseUp={() => stopDraw('A')}
                      onMouseLeave={() => stopDraw('A')}
                      onTouchStart={(e) => startDraw(e, 'A')}
                      onTouchMove={(e) => draw(e, 'A')}
                      onTouchEnd={() => stopDraw('A')}
                    />
                    {sigAData.length === 0 && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] text-slate-300">
                        Ký tay tại đây
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => clearSig('A')} className="flex-1 rounded border border-slate-200 py-1 text-[9px] font-bold text-slate-500 hover:bg-slate-50">
                      Xóa
                    </button>
                    <span className="flex-1 py-1 text-center text-[9px] text-slate-400">Your Organization</span>
                    <span className="flex-1 py-1 text-center text-[9px] text-slate-400">Ngày: ___</span>
                  </div>
                </div>

                {/* Party B (Freelancer) */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500">Chữ ký Bên B (Freelancer)</p>
                  <div className="relative rounded-xl border-2 border-dashed border-indigo-200 bg-white overflow-hidden">
                    <canvas
                      ref={sigBPadRef}
                      width={280}
                      height={120}
                      className="block w-full cursor-crosshair touch-none"
                      onMouseDown={(e) => startDraw(e, 'B')}
                      onMouseMove={(e) => draw(e, 'B')}
                      onMouseUp={() => stopDraw('B')}
                      onMouseLeave={() => stopDraw('B')}
                      onTouchStart={(e) => startDraw(e, 'B')}
                      onTouchMove={(e) => draw(e, 'B')}
                      onTouchEnd={() => stopDraw('B')}
                    />
                    {sigBData.length === 0 && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] text-slate-300">
                        Ký tay tại đây
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => clearSig('B')} className="flex-1 rounded border border-slate-200 py-1 text-[9px] font-bold text-slate-500 hover:bg-slate-50">
                      Xóa
                    </button>
                    <span className="flex-1 py-1 text-center text-[9px] text-slate-400">Nguyễn Minh Anh</span>
                    <span className="flex-1 py-1 text-center text-[9px] text-slate-400">Ngày: ___</span>
                  </div>
                </div>
              </div>

              {/* Validity notice */}
              <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-[10px] text-slate-700">
                <Check size={16} className="text-emerald-600" />
                <span>Hợp đồng sẽ có hiệu lực khi cả hai bên xác nhận điện tử.</span>
              </div>
            </div>
          </section>
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-extrabold">Hành động gửi</h2>
              <p className="mt-3 text-[10px] text-slate-500">Hợp đồng sẽ được gửi qua email và thông báo trong ứng dụng.</p>
              <div className="mt-4 space-y-2 text-[10px]">
                {[
                  { label: "Gửi email cho freelancer", checked: true },
                  { label: "Đính kèm bản PDF", checked: true },
                  { label: "Gửi bản sao cho kế toán", checked: false },
                ].map(({ label, checked }) => (
                  <label key={label} className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked={checked} className="accent-indigo-600" />
                    {label}
                  </label>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      {/* Footer nav */}
      <div className="mt-5 flex justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentStep === 1}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={13} />
          Quay lại: {STEPS[currentStep - 2]?.label ?? ""}
        </button>
        <div className="flex gap-2">
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[10px] font-bold text-slate-600">Lưu nháp</button>
          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white shadow-md"
            >
              Tiếp tục: {STEPS[currentStep]?.label ?? ""}
              <ChevronRight size={13} className="ml-1 inline" />
            </button>
          ) : (
            <button 
              type="button" 
              onClick={async () => {
                if (!proposal) {
                  toast.error("Không có proposal");
                  return;
                }
                createContract.mutate({
                  job_id: proposal.job_id,
                  freelancer_id: proposal.freelancer_id,
                  total_amount: totalAmount,
                  proposal_id: proposal.id
                }, {
                  onSuccess: async (contract) => {
                    toast.success("Đang tạo milestone...");
                    for (let i = 0; i < milestoneList.length; i++) {
                       const m = milestoneList[i];
                       try {
                         await apiPost(`/contracts/${contract.id}/milestones`, {
                           sequence_no: i + 1,
                           title: m.title,
                           description: m.description,
                           amount: m.amount,
                           due_at: m.due_date ? new Date(m.due_date.split("/").reverse().join("-")).toISOString() : undefined
                         });
                       } catch(err) {
                         console.error("Lỗi tạo milestone", err);
                       }
                    }
                    navigate("/my-projects");
                  }
                });
              }}
              disabled={createContract.isPending}
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-[10px] font-bold text-white shadow-md disabled:opacity-50"
            >
              {createContract.isPending ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
              {createContract.isPending ? "Đang xử lý..." : "Gửi hợp đồng"}
            </button>
          )}
        </div>
      </div>
    </BusinessShell>
  );
}
