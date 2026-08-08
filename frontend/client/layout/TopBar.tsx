import { Bell, ChevronDown, Menu, Search, LogOut, User as UserIcon } from "lucide-react";
import logoIcon from "@/assets/icon_w.png";
import { useNotifications } from "@/hooks/use-notifications";
import { useOrganizationProfile } from "@/hooks/use-organization";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/auth/AuthContext";

export interface TopBarProps {
  onOpenSidebar: () => void;
  searchPlaceholder?: string;
}

export function TopBar({ onOpenSidebar, searchPlaceholder = "Tìm kiếm ứng viên, kỹ năng, tin tuyển dụng..." }: TopBarProps) {
  const { user, logout } = useAuth();
  const userRole = (user as any)?.role || "freelancer";
  const isBusiness = userRole === "business" || userRole === "enterprise";

  const { data: notifications } = useNotifications();
  const { data: orgProfile } = useOrganizationProfile({ enabled: isBusiness });
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;
  
  const displayName = isBusiness
    ? (orgProfile?.name ?? "Doanh nghiệp") 
    : (user as any)?.email?.split("@")[0] ?? "Freelancer";
  
  const roleLabel = userRole === "admin" ? "Admin" : userRole === "business" || userRole === "enterprise" ? "Enterprise" : "Freelancer";

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
        <div className="relative flex items-center gap-2 cursor-pointer" onClick={() => setDropdownOpen(!dropdownOpen)} ref={dropdownRef}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-[11px] font-bold text-slate-800">{displayName}</p>
            <p className="text-[10px] text-slate-400">{roleLabel}</p>
          </div>
          <ChevronDown size={14} className="text-slate-400" />
          
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-50">
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition">
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
