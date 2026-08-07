import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import logoIcon from "@/assets/icon_w.png";
import { useNotifications } from "@/hooks/use-notifications";
import { useOrganizationProfile } from "@/hooks/use-organization";

export interface TopBarProps {
  onOpenSidebar: () => void;
  searchPlaceholder?: string;
}

export function TopBar({ onOpenSidebar, searchPlaceholder = "Tìm kiếm ứng viên, kỹ năng, tin tuyển dụng..." }: TopBarProps) {
  const { data: notifications } = useNotifications();
  const { data: orgProfile } = useOrganizationProfile();
  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;
  const orgName = orgProfile?.name ?? "Công ty ABC";

  return (
    <header className="flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-7">
      <div className="flex items-center gap-3">
        <button aria-label="Mở menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={onOpenSidebar}>
          <Menu size={20} />
        </button>
        <div className="relative hidden w-[340px] md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder={searchPlaceholder} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-12 text-xs outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] text-slate-400">⌘ K</span>
        </div>
        <span className="flex items-center gap-2 lg:hidden">
          <img src={logoIcon} alt="FreelanceHub" className="h-6 w-6 rounded-md object-cover" />
          <span className="text-sm font-semibold text-indigo-600">FreelanceHub AI</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button aria-label="Thông báo" className="relative text-slate-500">
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <div className="hidden h-7 w-px bg-slate-200 sm:block" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {orgName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-[11px] font-bold text-slate-800">{orgName}</p>
            <p className="text-[10px] text-slate-400">Enterprise</p>
          </div>
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>
    </header>
  );
}
