import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, CalendarDays, ChevronRight, DollarSign, Loader2 } from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { useContract } from "@/hooks/use-contracts";
import { formatCurrency } from "@/hooks/use-wallet";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContractListItem } from "@/hooks/use-contracts";

const STATUS_TONE: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE:   { bg: "bg-emerald-50", text: "text-emerald-600", label: "Đang thực hiện" },
  COMPLETED:{ bg: "bg-slate-100",  text: "text-slate-600",   label: "Hoàn thành" },
  PENDING:  { bg: "bg-amber-50",   text: "text-amber-600",   label: "Chờ duyệt" },
  DRAFT:    { bg: "bg-slate-50",   text: "text-slate-400",   label: "Bản nháp" },
  DISPUTED: { bg: "bg-rose-50",    text: "text-rose-600",    label: "Tranh chấp" },
};

function ContractCard({ contract, onClick }: { contract: ContractListItem; onClick: () => void }) {
  const { data: detail, isLoading } = useContract(contract.id);

  const tone = STATUS_TONE[contract.status] ?? STATUS_TONE.DRAFT;
  const milestones = detail?.milestones ?? [];
  const completedMilestones = milestones.filter(
    (m) => m.status === "APPROVED" || m.status === "PAID"
  ).length;
  const progress = milestones.length > 0
    ? Math.round((completedMilestones / milestones.length) * 100)
    : 0;

  return (
    <article
      className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl transition group-hover:bg-indigo-100">
          🎓
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${tone.bg} ${tone.text}`}>
          {tone.label}
        </span>
      </div>

      <p className="mb-1 text-[9px] font-bold text-slate-400">
        #{contract.job_id?.slice(0, 8).toUpperCase() ?? "DRAFT"}
      </p>

      <p className="mb-3 text-[12px] font-extrabold leading-tight text-slate-900">
        {contract.description ?? "Dự án hợp đồng"}
      </p>

      <div className="mb-3 space-y-1.5 text-[9px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <DollarSign size={10} className="text-emerald-500" />
          <span className="font-semibold text-slate-700">
            {formatCurrency(contract.total_amount)}
          </span>
        </div>
        {contract.start_date && (
          <div className="flex items-center gap-1.5">
            <CalendarDays size={10} className="text-slate-400" />
            {new Date(contract.start_date).toLocaleDateString("vi-VN")}
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-8 w-full rounded-lg" />
      ) : (
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-[9px]">
            <span className="text-slate-400">Tiến độ</span>
            <span className="font-bold text-indigo-600">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-[9px] text-slate-400">
            {completedMilestones}/{milestones.length} milestone hoàn thành
          </p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-[9px] text-slate-400">
          HĐ#{contract.id.slice(0, 8)}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 opacity-0 transition group-hover:opacity-100">
          Mở workspace <ChevronRight size={11} />
        </span>
      </div>
    </article>
  );
}

interface MyProjectsProps {
  contracts?: ContractListItem[];
  isLoading?: boolean;
}

export default function MyProjects({ contracts, isLoading }: MyProjectsProps) {
  const navigate = useNavigate();
  const { data: contractsData, isLoading: loading } = useContract("") as unknown as { data: ContractListItem[] | undefined; isLoading: boolean };

  const list = contracts ?? contractsData;
  const loading_final = isLoading ?? loading;

  return (
    <BusinessShell active="Dự án của tôi">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[11px] text-slate-400">Freelancer / Dự án của tôi</p>
          <h1 className="text-[24px] font-extrabold tracking-tight">Dự án của tôi</h1>
          <p className="mt-1 text-xs text-slate-500">
            Danh sách tất cả hợp đồng và dự án bạn đang tham gia.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600">
          {list?.length ?? 0} dự án
        </span>
      </div>

      {loading_final ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : !list || list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/30 p-12 text-center">
          <BriefcaseBusiness size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="text-[13px] font-bold text-slate-600">Chưa có dự án nào</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Hãy tìm việc phù hợp và bắt đầu dự án đầu tiên của bạn
          </p>
          <button
            type="button"
            onClick={() => navigate("/jobs/browse")}
            className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 text-[11px] font-bold text-white hover:bg-indigo-700"
          >
            Tìm việc ngay
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.map((contract) => (
            <ContractCard
              key={contract.id}
              contract={contract}
              onClick={() => navigate(`/workspace/${contract.id}`)}
            />
          ))}
        </div>
      )}
    </BusinessShell>
  );
}
