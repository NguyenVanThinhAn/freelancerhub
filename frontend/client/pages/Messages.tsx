import { useState, useEffect, useRef } from "react";
import { ChevronRight, Loader2, Plus, Send } from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { apiGet, apiPost } from "@/api/client";
import { ENDPOINT_CHAT_THREADS, ENDPOINT_CHAT_THREADS_ID_MESSAGES } from "@/api/endpoints";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { ApiError } from "@/types/api";

interface ChatThread {
  id: string;
  created_at: string;
  participants: Array<{ user_id: string; display_name: string }>;
  last_message: { id: string; content_text: string; created_at: string } | null;
}

interface ChatMessage {
  id: string;
  sender_id: string;
  content_text: string;
  created_at: string;
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
    return d.toLocaleDateString("vi-VN");
  } catch {
    return "—";
  }
}

export default function Messages() {
  const qc = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showNewThread, setShowNewThread] = useState(false);
  const [newParticipantId, setNewParticipantId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: threads, isLoading: threadsLoading } = useQuery({
    queryKey: ["chat", "threads"],
    queryFn: () => apiGet<ChatThread[]>(ENDPOINT_CHAT_THREADS),
    staleTime: 10_000,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["chat", "messages", selectedThreadId],
    queryFn: () => apiGet<ChatMessage[]>(ENDPOINT_CHAT_THREADS_ID_MESSAGES(selectedThreadId!)),
    enabled: !!selectedThreadId,
    refetchInterval: 5_000,
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      apiPost<{ message_id: string }>(ENDPOINT_CHAT_THREADS_ID_MESSAGES(selectedThreadId!), { content_text: content }),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["chat", "messages", selectedThreadId] });
      qc.invalidateQueries({ queryKey: ["chat", "threads"] });
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Gửi thất bại");
    },
  });

  const createThread = useMutation({
    mutationFn: (participantId: string) =>
      apiPost<{ thread_id: string }>(ENDPOINT_CHAT_THREADS, { participant_id: participantId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["chat", "threads"] });
      setSelectedThreadId(res.thread_id);
      setShowNewThread(false);
      setNewParticipantId("");
      toast.success("Đã tạo cuộc trò chuyện");
    },
    onError: (err: unknown) => {
      const e = err as ApiError;
      toast.error(e.message ?? "Tạo thread thất bại");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !selectedThreadId) return;
    sendMessage.mutate(text);
  };

  const selectedThread = threads?.find((t) => t.id === selectedThreadId);

  return (
    <BusinessShell active="Tin nhắn">
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-medium text-slate-400">Workspace / Tin nhắn</p>
        <h1 className="text-[24px] font-extrabold tracking-tight">Tin nhắn</h1>
        <p className="mt-1 text-xs text-slate-500">Liên hệ trực tiếp với freelancer / khách hàng.</p>
      </div>

      <div className="grid h-[calc(100vh-220px)] items-stretch gap-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm xl:grid-cols-[300px_1fr]">
        {/* Thread list */}
        <aside className="flex flex-col border-r border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 p-3">
            <h2 className="text-xs font-extrabold">Cuộc trò chuyện</h2>
            <button
              type="button"
              onClick={() => setShowNewThread(true)}
              className="rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-700"
              title="Tạo cuộc trò chuyện mới"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : !threads?.length ? (
              <div className="p-6 text-center">
                <p className="text-[10px] text-slate-400">Chưa có cuộc trò chuyện.</p>
                <button
                  type="button"
                  onClick={() => setShowNewThread(true)}
                  className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-bold text-white"
                >
                  Bắt đầu chat
                </button>
              </div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedThreadId(t.id)}
                  className={`flex w-full flex-col gap-1 border-b border-slate-50 p-3 text-left transition ${
                    selectedThreadId === t.id ? "bg-indigo-50/50" : "hover:bg-slate-50"
                  }`}
                >
                  <p className="text-[11px] font-bold text-slate-700">
                    {t.participants.map((p) => p.display_name).join(", ") || `Thread ${t.id.slice(0, 8)}`}
                  </p>
                  <p className="line-clamp-1 text-[9px] text-slate-400">
                    {t.last_message?.content_text ?? "Chưa có tin nhắn"}
                  </p>
                  <p className="text-[8px] text-slate-400">
                    {t.last_message ? formatRelative(t.last_message.created_at) : formatRelative(t.created_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Conversation */}
        <section className="flex flex-col">
          {!selectedThreadId ? (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p className="text-xs text-slate-400">Chọn cuộc trò chuyện để xem tin nhắn</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 p-3">
                <p className="text-xs font-extrabold">
                  {selectedThread?.participants.map((p) => p.display_name).join(", ")}
                </p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-slate-400" />
                  </div>
                ) : !messages?.length ? (
                  <div className="py-8 text-center text-[10px] text-slate-400">
                    Chưa có tin nhắn. Hãy gửi tin nhắn đầu tiên!
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="flex">
                      <div className="max-w-[70%] rounded-2xl bg-slate-100 px-3 py-2 text-[11px]">
                        <p className="whitespace-pre-line">{m.content_text}</p>
                        <p className="mt-1 text-right text-[8px] text-slate-400">
                          {new Date(m.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="border-t border-slate-100 p-3">
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Nhập tin nhắn..."
                    className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!draft.trim() || sendMessage.isPending}
                    className="rounded-lg bg-indigo-600 px-4 text-white disabled:opacity-50"
                  >
                    {sendMessage.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* New Thread Modal */}
      {showNewThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-sm font-bold">Tạo cuộc trò chuyện mới</h3>
            <p className="mb-3 text-xs text-slate-500">Nhập User ID của người bạn muốn chat cùng.</p>
            <input
              value={newParticipantId}
              onChange={(e) => setNewParticipantId(e.target.value)}
              placeholder="UUID người dùng..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-indigo-300"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowNewThread(false);
                  setNewParticipantId("");
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => newParticipantId.trim() && createThread.mutate(newParticipantId.trim())}
                disabled={!newParticipantId.trim() || createThread.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50"
              >
                {createThread.isPending ? "Đang tạo..." : "Tạo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </BusinessShell>
  );
}