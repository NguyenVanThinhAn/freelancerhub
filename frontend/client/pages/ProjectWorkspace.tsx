import { useState } from "react";
import { CalendarDays, Check, FileText, Loader2, MoreHorizontal, Upload, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { useContract, useMyContracts, useSubmitMilestone, MILESTONE_STATUS_LABELS, MILESTONE_STATUS_TONE, formatCurrency } from "@/hooks/use-contracts";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import type { Task } from "@/hooks/use-tasks";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type ProjectTab = "overview" | "milestone" | "task" | "document" | "discussion" | "report";

const TASK_STATUS_TONE: Record<string, string> = {
  "Đã hoàn thành": "bg-emerald-50 text-emerald-600",
  "Đang thực hiện": "bg-sky-50 text-sky-600",
  "Chưa bắt đầu": "bg-slate-100 text-slate-500",
};

function MilestoneDot({ index }: { index: number }) {
  const colors = ["bg-emerald-500", "bg-amber-400", "bg-indigo-500", "bg-slate-300"];
  return <span className={`mt-1 h-2 w-2 rounded-full ${colors[index % colors.length]}`} />;
}

export default function ProjectWorkspace() {
  const navigate = useNavigate();
  const { contractId: paramContractId } = useParams();
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");

  // Nếu không có contractId trên URL, tự động lấy hợp đồng đầu tiên của user
  const { data: contracts } = useMyContracts();
  const contractId = paramContractId || (contracts?.[0]?.id ?? "");

  const { data: contract, isLoading } = useContract(contractId);
  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks(contractId);
  
  const submitMilestone = useSubmitMilestone();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [submitContent, setSubmitContent] = useState("");
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskMilestone, setNewTaskMilestone] = useState("");

  const milestones = contract?.milestones ?? [];
  const completedMilestones = milestones.filter((m) => m.status === "APPROVED" || m.status === "PAID").length;
  const progress = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

  const activeMilestone = milestones.find((m) => m.status === "IN_PROGRESS" || m.status === "PENDING");

  const handleSubmitWork = (milestoneId: string) => {
    if (!submitContent.trim()) {
      toast.error("Vui lòng nhập mô tả bài nộp");
      return;
    }
    submitMilestone.mutate(
      { milestoneId, payload: { content: submitContent } },
      {
        onSuccess: () => {
          toast.success("Đã nộp bài!");
          setSubmittingFor(null);
          setSubmitContent("");
        },
      }
    );
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    
    createTask.mutate(
      { 
        contract_id: contractId,
        title: newTaskTitle,
        milestone_id: newTaskMilestone || undefined
      },
      {
        onSuccess: () => {
          setNewTaskTitle("");
          setNewTaskMilestone("");
          setShowTaskForm(false);
        }
      }
    );
  };

  const toggleTaskStatus = (task: Task) => {
    const nextStatus = task.status === "Chưa bắt đầu" ? "Đang thực hiện" : 
                      task.status === "Đang thực hiện" ? "Đã hoàn thành" : "Chưa bắt đầu";
    updateTask.mutate({ taskId: task.id, payload: { status: nextStatus } });
  };

  return (
    <BusinessShell active="Workspace">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="mb-1 text-[11px] text-slate-400">Workspace / Dự án của tôi</p>
          <h1 className="text-[24px] font-extrabold tracking-tight">Workspace dự án</h1>
        </div>
        <button type="button" onClick={() => navigate("/jobs")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600">
          Quay lại danh sách
        </button>
      </div>

      {/* Contract header */}
      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : contract ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl">🎓</div>
              <div>
                <h2 className="text-sm font-extrabold">
                  {contract.job_id ? `Dự án #${contract.job_id.slice(0, 8).toUpperCase()}` : "Dự án hợp đồng"}
                </h2>
                <p className="mt-1 text-[10px] text-slate-400">
                  Freelancer: <span className="font-bold text-slate-600">{contract.freelancer_id.slice(0, 8)}...</span> · HĐ #{contract.id.slice(0, 8)}
                </p>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
              contract.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600"
              : contract.status === "COMPLETED" ? "bg-slate-100 text-slate-600"
              : "bg-amber-50 text-amber-600"
            }`}>
              {contract.status}
            </span>
          </div>
          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
            <div>
              <p className="text-[9px] text-slate-400">Tổng giá trị dự án</p>
              <p className="mt-1 text-sm font-extrabold">{formatCurrency(contract.total_amount)}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400">Loại hợp đồng</p>
              <p className="mt-1 text-[10px] font-bold">Fixed Price</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400">Ngày bắt đầu</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-bold">
                <CalendarDays size={12} />
                {new Date(contract.start_date).toLocaleDateString("vi-VN")}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400">Hạn hoàn thành</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-bold">
                <CalendarDays size={12} />
                {contract.end_date ? new Date(contract.end_date).toLocaleDateString("vi-VN") : "—"}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-center text-xs text-slate-400">Không tìm thấy hợp đồng.</p>
        </section>
      )}

      {/* Tabs */}
      <nav className="mt-4 flex gap-5 overflow-x-auto border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-400">
        {[
          { id: "overview", label: "Tổng quan" },
          { id: "milestone", label: "Milestone" },
          { id: "task", label: "Công việc" },
          { id: "document", label: "Tài liệu" },
          { id: "discussion", label: "Thảo luận" },
          { id: "report", label: "Báo cáo thời gian" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as ProjectTab)}
            className={`pb-2 whitespace-nowrap ${activeTab === tab.id ? "border-b-2 border-indigo-600 text-indigo-600" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          {activeTab === "overview" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Progress */}
                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-500">Tiến độ dự án</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="relative flex h-20 w-20 items-center justify-center rounded-full"
                      style={{ background: `conic-gradient(#536df5 ${progress}%, #e7eaff 0)` }}
                    >
                      <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-white">
                        <b className="text-lg">{progress}%</b>
                        <span className="text-[8px] text-slate-400">Hoàn thành</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-[9px]">
                      <p><Check size={11} className="mr-1 inline text-emerald-500" />{completedMilestones}/{milestones.length} Milestone đã hoàn thành</p>
                      <p><span className="mr-1 text-indigo-500">●</span>{milestones.length - completedMilestones}/{milestones.length} Milestone đang/chưa thực hiện</p>
                    </div>
                  </div>
                </section>

                {/* Next task */}
                <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-slate-500">Nhiệm vụ tiếp theo</p>
                    {activeMilestone && (
                      <span className="rounded bg-indigo-100 px-1.5 py-1 text-[8px] font-bold text-indigo-600">
                        MS{milestones.indexOf(activeMilestone) + 1}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-[11px] font-extrabold">{activeMilestone?.title ?? "Chưa có Milestone đang thực hiện"}</p>
                  {activeMilestone?.due_date && (
                    <p className="mt-1 text-[9px] text-slate-400">Hạn: {new Date(activeMilestone.due_date).toLocaleDateString("vi-VN")}</p>
                  )}
                  {activeMilestone && (
                    submittingFor ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={submitContent}
                          onChange={(e) => setSubmitContent(e.target.value)}
                          placeholder="Mô tả bài nộp..."
                          rows={2}
                          className="w-full resize-none rounded-lg border border-indigo-200 p-2 text-[9px] outline-none focus:border-indigo-400"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSubmitWork(submittingFor)}
                            disabled={submitMilestone.isPending}
                            className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-[10px] font-bold text-white disabled:opacity-50"
                          >
                            {submitMilestone.isPending ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Nộp bài"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setSubmittingFor(null); setSubmitContent(""); }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-500"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => activeMilestone && setSubmittingFor(activeMilestone.id)}
                        className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-indigo-600 py-2 text-[10px] font-bold text-white"
                      >
                        <Upload size={12} /> Nộp bài làm
                      </button>
                    )
                  )}
                </section>
              </div>

              {/* Dynamic tasks */}
              <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xs font-extrabold">Công việc dự án ({tasks.length})</h2>
                  <button type="button" onClick={() => setActiveTab("task")} className="text-[10px] font-bold text-indigo-600">Xem tất cả công việc →</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-[10px]">
                    <thead className="border-y border-slate-100 text-[9px] text-slate-400">
                      <tr>
                        <th className="py-2">Mã</th>
                        <th>Công việc</th>
                        <th>Milestone</th>
                        <th>Trạng thái</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.slice(0, 5).map((task) => {
                        const msIndex = milestones.findIndex(m => m.id === task.milestone_id);
                        return (
                          <tr key={task.id} className="border-b border-slate-50">
                            <td className="py-3 text-slate-400">{task.id.slice(0, 8)}</td>
                            <td className="font-semibold">{task.title}</td>
                            <td>
                              <span className="rounded bg-indigo-50 px-1.5 py-1 text-[8px] text-indigo-600">
                                {msIndex >= 0 ? `MS${msIndex + 1}` : "—"}
                              </span>
                            </td>
                            <td>
                              <button 
                                onClick={() => toggleTaskStatus(task)}
                                className={`rounded-full px-2 py-1 text-[8px] font-semibold cursor-pointer transition-colors ${TASK_STATUS_TONE[task.status] ?? ""}`}
                              >
                                {task.status}
                              </button>
                            </td>
                            <td>
                              <button onClick={() => {
                                if (confirm("Bạn có chắc muốn xóa công việc này?")) {
                                  deleteTask.mutate({ taskId: task.id, contractId });
                                }
                              }} className="text-red-400 hover:text-red-600">
                                Xóa
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {tasks.length === 0 && !isLoadingTasks && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                            Chưa có công việc nào. Hãy chuyển sang tab "Công việc" để tạo mới.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {activeTab === "milestone" && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-xs font-extrabold">Chi tiết Milestone</h2>
              {isLoading ? (
                <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
              ) : milestones.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-8">Chưa có milestone nào.</p>
              ) : (
                <div className="space-y-3">
                  {milestones.map((ms, i) => {
                    const tone = MILESTONE_STATUS_TONE[ms.status];
                    return (
                      <div key={ms.id} className="rounded-xl border border-slate-100 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <MilestoneDot index={i} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400">MS{i + 1}</span>
                                <span className="text-[11px] font-extrabold">{ms.title}</span>
                              </div>
                              {ms.description && (
                                <p className="mt-1 text-[9px] text-slate-500">{ms.description}</p>
                              )}
                              <div className="mt-2 flex items-center gap-3 text-[9px] text-slate-400">
                                <span className="flex items-center gap-1"><CalendarDays size={10} />{ms.due_date ? new Date(ms.due_date).toLocaleDateString("vi-VN") : "—"}</span>
                                <span className="font-semibold text-slate-600">{formatCurrency(ms.amount)}</span>
                              </div>
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${tone.bg} ${tone.text}`}>
                            {MILESTONE_STATUS_LABELS[ms.status]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === "task" && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-extrabold">Tất cả công việc</h2>
                <button 
                  onClick={() => setShowTaskForm(!showTaskForm)}
                  className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100"
                >
                  <Plus size={12} /> {showTaskForm ? "Hủy" : "Thêm việc"}
                </button>
              </div>

              {showTaskForm && (
                <form onSubmit={handleCreateTask} className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3 flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="mb-1 block text-[9px] font-bold text-slate-500">Tên công việc</label>
                    <input 
                      required 
                      value={newTaskTitle} 
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="VD: Thiết kế trang chủ..." 
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] outline-none" 
                    />
                  </div>
                  <div className="w-32">
                    <label className="mb-1 block text-[9px] font-bold text-slate-500">Thuộc Milestone</label>
                    <select 
                      value={newTaskMilestone}
                      onChange={(e) => setNewTaskMilestone(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] outline-none"
                    >
                      <option value="">Không bắt buộc</option>
                      {milestones.map((m, i) => (
                        <option key={m.id} value={m.id}>MS{i+1}: {m.title.slice(0, 10)}</option>
                      ))}
                    </select>
                  </div>
                  <button disabled={createTask.isPending} type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700">
                    Lưu
                  </button>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-[10px]">
                  <thead className="border-y border-slate-100 text-[9px] text-slate-400">
                    <tr>
                      <th className="py-2">Mã</th>
                      <th>Công việc</th>
                      <th>Milestone</th>
                      <th>Trạng thái</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => {
                      const msIndex = milestones.findIndex(m => m.id === task.milestone_id);
                      return (
                        <tr key={task.id} className="border-b border-slate-50">
                          <td className="py-3 text-slate-400">{task.id.slice(0, 8)}</td>
                          <td className="font-semibold">{task.title}</td>
                          <td>
                            <span className="rounded bg-indigo-50 px-1.5 py-1 text-[8px] text-indigo-600">
                              {msIndex >= 0 ? `MS${msIndex + 1}` : "—"}
                            </span>
                          </td>
                          <td>
                            <button 
                              onClick={() => toggleTaskStatus(task)}
                              className={`rounded-full px-2 py-1 text-[8px] font-semibold cursor-pointer transition-colors ${TASK_STATUS_TONE[task.status] ?? ""}`}
                            >
                              {task.status}
                            </button>
                          </td>
                          <td>
                            <button onClick={() => {
                              if (confirm("Bạn có chắc muốn xóa công việc này?")) {
                                deleteTask.mutate({ taskId: task.id, contractId });
                              }
                            }} className="text-red-400 hover:text-red-600">
                              <MoreHorizontal size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {tasks.length === 0 && !isLoadingTasks && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                          Chưa có công việc nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {(activeTab === "document" || activeTab === "discussion" || activeTab === "report") && (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
              <FileText size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-xs text-slate-400">Tính năng đang phát triển</p>
              <p className="mt-1 text-[10px] text-slate-400">Liên hệ backend team để bổ sung API</p>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Milestone</h2>
              <button type="button" onClick={() => setActiveTab("milestone")} className="text-[9px] font-bold text-indigo-600">Xem tất cả</button>
            </div>
            <div className="mt-4 space-y-4">
              {milestones.length === 0 && !isLoading && (
                <p className="text-[10px] text-slate-400">Chưa có milestone.</p>
              )}
              {milestones.map((ms, i) => (
                <div key={ms.id} className="flex gap-2">
                  <MilestoneDot index={i} />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="text-[9px] font-bold">
                        <span className="mr-1 text-slate-400">MS{i + 1}</span>
                        {ms.title}
                      </p>
                    </div>
                    <p className="mt-1 text-[8px] text-slate-400">
                      {ms.due_date ? new Date(ms.due_date).toLocaleDateString("vi-VN") : "—"}
                    </p>
                    <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${MILESTONE_STATUS_TONE[ms.status].bg} ${MILESTONE_STATUS_TONE[ms.status].text}`}>
                      {MILESTONE_STATUS_LABELS[ms.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Hoạt động gần đây</h2>
            </div>
            <div className="mt-3 space-y-3 text-[9px] opacity-50">
              <p className="text-center italic text-slate-400 mb-2">Đang sử dụng dữ liệu tĩnh</p>
              {[
                ["Mai Anh", "đã bình luận về M2", "30/05/2025 10:15"],
                ["Bạn", "đã bàn giao cho M2", "30/05/2025 09:42"],
                ["Mai Anh", "đã phê duyệt M1", "22/05/2025 16:30"],
              ].map(([user, action, time]) => (
                <p key={time}>
                  <b>{user}</b> {action} <span className="float-right text-slate-400">{time}</span>
                </p>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">Thời gian làm việc</h2>
              <button type="button" onClick={() => setActiveTab("report")} className="text-[9px] font-bold text-indigo-600">Xem báo cáo</button>
            </div>
            <div className="opacity-50">
              <p className="text-center italic text-[9px] text-slate-400 mb-2 mt-2">Đang sử dụng dữ liệu tĩnh</p>
              <p className="mt-3 text-xl font-extrabold">18h 30m <span className="text-[10px] font-normal text-slate-400">/ 40h 00m</span></p>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-24 w-24 rounded-full" style={{ background: "conic-gradient(#536df5 46%, #e9ecff 0)" }} />
                <div className="space-y-2 text-[9px] text-slate-500">
                  <p>● Thiết kế UI <b>12h 10m (65%)</b></p>
                  <p>● Wireframe & Nghiên cứu <b>4h 20m (23%)</b></p>
                  <p>● Họp & Trao đổi <b>2h (11%)</b></p>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </BusinessShell>
  );
}
