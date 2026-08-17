import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  LogOut,
  User as UserIcon,
  Check,
  Briefcase,
  MessageCircle,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Info,
  Crown,
} from "lucide-react";
import logoIcon from "@/assets/icon_w.png";
import {
  useNotifications,
  useMarkNotificationRead,
  type Notification,
} from "@/hooks/use-notifications";
import { useOrganizationProfile } from "@/hooks/use-organization";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export interface TopBarProps {
  onOpenSidebar: () => void;
  searchPlaceholder?: string;
}

// ─── Notification type → icon + tone mapping ────────────────────────────────
const NOTIF_META: Record<
  string,
  { icon: typeof Bell; tone: string; ring: string }
> = {
  JOB_INVITE: { icon: Briefcase, tone: "bg-indigo-50 text-indigo-600", ring: "" },
  MESSAGE_RECEIVED: { icon: MessageCircle, tone: "bg-sky-50 text-sky-600", ring: "" },
  CV_VERIFIED: { icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-600", ring: "" },
  VERIFICATION_APPROVED: { icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-600", ring: "" },
  VERIFICATION_REJECTED: { icon: ShieldX, tone: "bg-rose-50 text-rose-600", ring: "" },
  VERIFICATION_NEEDS_MORE_INFO: { icon: Info, tone: "bg-amber-50 text-amber-600", ring: "" },
  SYSTEM: { icon: Sparkles, tone: "bg-violet-50 text-violet-600", ring: "" },
};

function NotifIcon({ type }: { type: string }) {
  const meta = NOTIF_META[type] ?? { icon: Bell, tone: "bg-slate-50 text-slate-500", ring: "" };
  const Icon = meta.icon;
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
      <Icon size={13} />
    </span>
  );
}

function timeAgo(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return "vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
    return d.toLocaleDateString("vi-VN");
  } catch {
    return "";
  }
}

export function TopBar({ onOpenSidebar, searchPlaceholder }: TopBarProps) {
  const { user, logout } = useAuth();
  const userRole = (user as any)?.role || "freelancer";
  const isBusiness = userRole === "business" || userRole === "enterprise";
  const navigate = useNavigate();

  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();
  const { data: orgProfile } = useOrganizationProfile({ enabled: isBusiness });

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(event.target as Node)) {
        setAvatarOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;
  const list = notifications ?? [];

  const displayName = isBusiness
    ? (orgProfile?.name ?? "Doanh nghiệp")
    : (user as any)?.email?.split("@")[0] ?? "Freelancer";

  const roleLabel = userRole === "admin" ? "Admin" : userRole === "business" || userRole === "enterprise" ? "Enterprise" : "Freelancer";

  const resolvedPlaceholder =
    searchPlaceholder ?? (isBusiness ? "Tìm kiếm ứng viên, kỹ năng, tin tuyển dụng…" : "Tìm kiếm công việc, dự án, kỹ năng…");

  const handleNotifClick = (n: Notification) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.action_url) {
      setNotifOpen(false);
      navigate(n.action_url);
    }
  };

  return (
    <header className="flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-7">
      <div className="flex items-center gap-3">
        <button aria-label="Mở menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onOpenSidebar}>
          <Menu size={20} />
        </button>
        <div className="relative hidden w-[340px] md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder={resolvedPlaceholder} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-12 text-xs outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] text-slate-400">⌘ K</span>
        </div>
        <span className="flex items-center gap-2 lg:hidden">
          <img src={logoIcon} alt="FreelanceHub" className="h-6 w-6 rounded-md object-cover" />
          <span className="text-sm font-semibold text-indigo-600">FreelanceHub AI</span>
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* ─── Notification bell + dropdown ─── */}
        <div className="relative" ref={notifRef}>
          <button
            aria-label="Thông báo"
            onClick={() => setNotifOpen((v) => !v)}
            className={`relative rounded-lg p-2 transition ${
              notifOpen ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl z-50">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <div>
                  <p className="text-[12px] font-extrabold text-slate-800">Thông báo</p>
                  <p className="text-[10px] text-slate-400">
                    {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Tất cả đã đọc"}
                  </p>
                </div>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-bold text-indigo-600">
                  {list.length} tổng
                </span>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {list.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50">
                      <Bell size={16} className="text-slate-300" />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-600">Chưa có thông báo</p>
                    <p className="mt-0.5 text-[9px] text-slate-400">
                      Mọi hoạt động quan trọng sẽ hiện ở đây.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {list.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleNotifClick(n)}
                          className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-slate-50 ${
                            !n.is_read ? "bg-indigo-50/30" : ""
                          }`}
                        >
                          <NotifIcon type={n.type} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-[11px] leading-tight ${!n.is_read ? "font-extrabold text-slate-900" : "font-semibold text-slate-700"}`}>
                                {n.title}
                              </p>
                              {!n.is_read && (
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-500">
                              {n.message}
                            </p>
                            <p className="mt-1 text-[9px] text-slate-400">
                              {timeAgo(n.created_at)}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {list.length > 0 && (
                <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-2">
                  <p className="text-center text-[9px] text-slate-400">
                    Nhấn vào thông báo để đánh dấu đã đọc & mở liên kết.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden h-7 w-px bg-slate-200 sm:block" />

        {/* ─── Upgrade plan button ─── */}
        {userRole !== "admin" && (
          <button
            onClick={() => navigate("/pricing")}
            className="hidden items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:from-violet-700 hover:to-indigo-700 sm:flex"
            title="Xem các gói dịch vụ"
          >
            <Crown size={13} />
            Nâng cấp gói
          </button>
        )}

        {/* ─── Avatar dropdown ─── */}
        <div className="relative flex items-center gap-2 cursor-pointer" onClick={() => setAvatarOpen(!avatarOpen)} ref={avatarRef}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-[11px] font-bold text-slate-800">{displayName}</p>
            <p className="text-[10px] text-slate-400">{roleLabel}</p>
          </div>
          <ChevronDown size={14} className="text-slate-400" />

          {avatarOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAvatarOpen(false);
                  navigate(`/freelancer/profile`);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <UserIcon size={16} /> Hồ sơ cá nhân
              </button>
              <div className="my-1 h-px bg-slate-100" />
              <button
                onClick={(e) => { e.stopPropagation(); logout(); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-600 hover:bg-red-50 transition"
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}