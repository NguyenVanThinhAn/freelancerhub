import { useState } from "react";
import {
  Check,
  ChevronRight,
  FileText,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { apiGet, apiPatch } from "@/api/client";
import {
  ENDPOINT_ADMIN_VERIFICATIONS,
  ENDPOINT_ADMIN_VERIFICATIONS_ID,
  ENDPOINT_ADMIN_VERIFICATIONS_ID_DECISION,
} from "@/api/endpoints";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { ApiError } from "@/types/api";

interface VerificationCaseItem {
  caseId: string;
  documentId: string;
  freelancerId: string;
  freelancerName: string;
  freelancerEmail: string;
  cvFilename: string;
  status: string;
  submittedAt: string;
  evidencesCount: number;
}

interface VerificationCaseDetail {
  caseId: string;
  documentId: string;
  freelancerId: string;
  freelancerName: string;
  freelancerEmail: string;
  cvFilename: string;
  status: string;
  submittedAt: string;
  notes: string | null;
  evidences: Array<{
    id: string;
    evidenceType: string;
    title: string;
    fileUrl: string | null;
    status: string;
  }>;
  threeColumnData: Array<{
    fieldPath: string;
    aiExtractedValue: unknown;
    aiConfidence: number | null;
    userConfirmedValue: unknown;
    evidenceLevel: string;
    isUserEdited: boolean;
    requiresUserReview: boolean;
  }>;
}

interface ListResponse {
  total: number;
  items: VerificationCaseItem[];
}

const STATUS_TONE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-600",
  VERIFIED: "bg-emerald-50 text-emerald-600",
  PARTIALLY_VERIFIED: "bg-sky-50 text-sky-600",
  REJECTED: "bg-rose-50 text-rose-600",
  NEEDS_MORE_INFO: "bg-violet-50 text-violet-600",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  VERIFIED: "Đã duyệt",
  PARTIALLY_VERIFIED: "Duyệt một phần",
  REJECTED: "Từ chối",
  NEEDS_MORE_INFO: "Cần thêm thông tin",
};

export default function AdminVerifications() {
  const qc = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [decisionMode, setDecisionMode] = useState<
    "none" | "approve" | "reject" | "partial" | "needs_info"
  >("none");
  const [reason, setReason] = useState("");

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ["admin", "verifications"],
    queryFn: () => apiGet<ListResponse>(ENDPOINT_ADMIN_VERIFICATIONS),
    staleTime: 30_000,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin", "verifications", selectedCaseId],
    queryFn: () =>
      apiGet<VerificationCaseDetail>(
        ENDPOINT_ADMIN_VERIFICATIONS_ID(selectedCaseId!),
      ),
    enabled: !!selectedCaseId,
    staleTime: 30_000,
  });

  const decisionMutation = useMutation({
    mutationFn: (payload: {
      action: string;
      reason: string;
      verifiedFieldPaths?: string[];
    }) =>
      apiPatch<unknown>(
        ENDPOINT_ADMIN_VERIFICATIONS_ID_DECISION(selectedCaseId!),
        payload,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "verifications"] });
      toast.success("Đã gửi quyết định");
      setDecisionMode("none");
      setReason("");
      setSelectedCaseId(null);
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Gửi quyết định thất bại");
    },
  });

  const handleDecision = (action: string) => {
    decisionMutation.mutate({ action, reason });
  };

  return (
    <BusinessShell active="Admin">
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-medium text-slate-400">
          Workspace / Admin
        </p>
        <h1 className="text-[24px] font-extrabold tracking-tight">
          Duyệt hồ sơ xác minh
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Review hồ sơ CV, evidences và đưa ra quyết định xác minh cho
          freelancer.
        </p>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[420px_1fr]">
        {/* Case List */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-extrabold">Hàng đợi</h2>
            <span className="text-[10px] text-slate-400">
              {list?.total ?? 0} cases
            </span>
          </div>
          {listLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !list?.items?.length ? (
            <p className="py-8 text-center text-xs text-slate-400">
              Không có case nào.
            </p>
          ) : (
            <div className="space-y-2">
              {list.items.map((c) => (
                <button
                  key={c.caseId}
                  type="button"
                  onClick={() => setSelectedCaseId(c.caseId)}
                  className={`flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition ${
                    selectedCaseId === c.caseId
                      ? "border-indigo-300 bg-indigo-50/50"
                      : "border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-700">
                      {c.freelancerName}
                    </p>
                    <span
                      className={`rounded-full px-2 py-1 text-[8px] font-semibold ${STATUS_TONE[c.status] ?? "bg-slate-100 text-slate-500"}`}
                    >
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400">{c.cvFilename}</p>
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span>📎 {c.evidencesCount} evidences</span>
                    <span>
                      {new Date(c.submittedAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Detail */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          {!selectedCaseId ? (
            <div className="py-16 text-center">
              <FileText size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-xs text-slate-400">
                Chọn một case để xem chi tiết
              </p>
            </div>
          ) : detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : detail ? (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold">
                    {detail.freelancerName}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-semibold ${STATUS_TONE[detail.status] ?? "bg-slate-100 text-slate-500"}`}
                  >
                    {STATUS_LABEL[detail.status] ?? detail.status}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  {detail.freelancerEmail} · {detail.cvFilename}
                </p>
                {detail.notes && (
                  <p className="mt-2 rounded-lg bg-slate-50 p-3 text-[10px] text-slate-600">
                    <AlertCircle
                      size={11}
                      className="mr-1 inline text-amber-500"
                    />
                    {detail.notes}
                  </p>
                )}
              </div>

              {/* 3-column data */}
              <div>
                <h3 className="mb-2 text-[11px] font-bold">
                  Dữ liệu đối soát (3 cột)
                </h3>
                <div className="space-y-2">
                  {detail.threeColumnData.length === 0 ? (
                    <p className="text-[10px] text-slate-400">
                      Chưa có dữ liệu trích xuất.
                    </p>
                  ) : (
                    detail.threeColumnData.slice(0, 10).map((field) => (
                      <div
                        key={field.fieldPath}
                        className="rounded-lg border border-slate-100 p-2 text-[10px]"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold">{field.fieldPath}</p>
                          {field.requiresUserReview && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-600">
                              Cần review
                            </span>
                          )}
                        </div>
                        <div className="mt-1 grid gap-2 sm:grid-cols-2">
                          <div>
                            <p className="text-[9px] text-slate-400">
                              AI bóc tách
                            </p>
                            <p className="font-mono text-[9px]">
                              {JSON.stringify(field.aiExtractedValue)}
                            </p>
                            {field.aiConfidence !== null && (
                              <p className="text-[9px] text-slate-400">
                                Conf: {(field.aiConfidence * 100).toFixed(0)}%
                              </p>
                            )}
                          </div>
                          {field.isUserEdited && (
                            <div>
                              <p className="text-[9px] text-slate-400">
                                User đã sửa
                              </p>
                              <p className="font-mono text-[9px]">
                                {JSON.stringify(field.userConfirmedValue)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Evidences */}
              <div>
                <h3 className="mb-2 text-[11px] font-bold">
                  Minh chứng đính kèm ({detail.evidences.length})
                </h3>
                {detail.evidences.length === 0 ? (
                  <p className="text-[10px] text-slate-400">
                    Chưa có minh chứng.
                  </p>
                ) : (
                  <ul className="space-y-1 text-[10px]">
                    {detail.evidences.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-100 p-2"
                      >
                        <FileText size={11} className="text-indigo-500" />
                        <span className="font-semibold">{e.title}</span>
                        <span className="text-slate-400">
                          ({e.evidenceType})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Action buttons */}
              <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-slate-100 bg-white p-4">
                {decisionMode === "none" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDecisionMode("approve")}
                      className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-[10px] font-bold text-white"
                    >
                      <Check size={12} className="mr-1 inline" />
                      Duyệt toàn bộ
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisionMode("partial")}
                      className="flex-1 rounded-lg bg-sky-600 px-4 py-2 text-[10px] font-bold text-white"
                    >
                      Duyệt một phần
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisionMode("needs_info")}
                      className="rounded-lg border border-violet-300 px-4 py-2 text-[10px] font-bold text-violet-600"
                    >
                      Yêu cầu thêm
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisionMode("reject")}
                      className="rounded-lg border border-rose-300 px-4 py-2 text-[10px] font-bold text-rose-600"
                    >
                      <X size={12} className="mr-1 inline" />
                      Từ chối
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold">
                      {decisionMode === "approve" && "Duyệt toàn bộ hồ sơ"}
                      {decisionMode === "partial" && "Duyệt một phần hồ sơ"}
                      {decisionMode === "needs_info" &&
                        "Yêu cầu bổ sung thông tin"}
                      {decisionMode === "reject" && "Từ chối hồ sơ"}
                    </p>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Lý do / ghi chú (tùy chọn)..."
                      rows={2}
                      className="w-full resize-none rounded-lg border border-slate-200 p-2 text-[10px] outline-none focus:border-indigo-300"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDecisionMode("none")}
                        className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const actionMap = {
                            approve: "VERIFY",
                            partial: "PARTIALLY_VERIFY",
                            needs_info: "REQUEST_MORE_INFO",
                            reject: "REJECT",
                          } as const;
                          handleDecision(actionMap[decisionMode]);
                        }}
                        disabled={decisionMutation.isPending}
                        className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50"
                      >
                        {decisionMutation.isPending ? (
                          <Loader2 size={12} className="mx-auto animate-spin" />
                        ) : (
                          "Xác nhận"
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-red-500">
              Không tải được chi tiết case.
            </p>
          )}
        </section>
      </div>
    </BusinessShell>
  );
}
