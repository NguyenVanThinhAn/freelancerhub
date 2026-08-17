import { ChevronRight, X, type LucideIcon } from "lucide-react";
import {
  Activity,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  FileText,
  LayoutDashboard,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react";
import aiIllustration from "@/assets/nâng-cấp-trải-nghiệm-tuyển-dụng-với-ai.png";
import logoIcon from "@/assets/icon_w.png";
import { useQuotas } from "@/hooks/use-quotas";
import { useAuth } from "@/auth/AuthContext";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  route?: string;
  badge?: string;
  allowedRoles?: string[];
}

const navItems: NavItem[] = [
  // ────── Common (cả 3 role) ──────
  {
    label: "Tổng quan",
    icon: LayoutDashboard,
    route: "/",
    allowedRoles: ["freelancer", "business", "enterprise"],
  },
  {
    label: "Tin nhắn",
    icon: Activity,
    route: "/messages",
    allowedRoles: ["freelancer", "business", "enterprise"],
  },
  {
    label: "Tranh chấp",
    icon: ShieldCheck,
    route: "/disputes",
    allowedRoles: ["freelancer", "business", "enterprise"],
  },
  {
    label: "Hồ sơ cá nhân",
    icon: Settings,
    route: "/freelancer/profile",
    allowedRoles: ["freelancer"],
  },
  {
    label: "Cài đặt tài khoản",
    icon: Settings,
    route: "/settings",
    allowedRoles: ["business", "enterprise"],
  },
  {
    label: "Ước tính thuế",
    icon: Calculator,
    route: "/tax-estimation",
    allowedRoles: ["freelancer"],
  },
  {
    label: "Tìm việc",
    icon: Search,
    route: "/jobs/browse",
    allowedRoles: ["freelancer"],
  },
  {
    label: "Dự án của tôi",
    icon: BriefcaseBusiness,
    route: "/my-projects",
    allowedRoles: ["freelancer", "business", "enterprise"],
  },

  // ────── Business + Enterprise ──────
  {
    label: "Tạo JD",
    icon: FileText,
    route: "/create-job",
    allowedRoles: ["business", "enterprise"],
  },
  {
    label: "AI Matching",
    icon: UsersRound,
    route: "/matching",
    allowedRoles: ["business", "enterprise"],
  },
  {
    label: "Explainable AI",
    icon: Sparkles,
    route: "/explainable-matching",
    allowedRoles: ["business", "enterprise"],
  },
  {
    label: "Tin tuyển dụng",
    icon: BriefcaseBusiness,
    route: "/jobs",
    allowedRoles: ["business", "enterprise"],
  },
  {
    label: "Phỏng vấn",
    icon: CalendarDays,
    route: "/interview-scheduler",
    allowedRoles: ["business", "enterprise"],
  },
  {
    label: "Hợp đồng",
    icon: FileText,
    route: "/contract-milestone",
    allowedRoles: ["business", "enterprise"],
  },
  {
    label: "Thanh toán",
    icon: WalletCards,
    route: "/wallet",
    allowedRoles: ["business", "enterprise"],
  },

  // ────── Freelancer ──────
  {
    label: "Phỏng vấn của tôi",
    icon: CalendarDays,
    route: "/my-interviews",
    allowedRoles: ["freelancer"],
  },
  {
    label: "Upload CV",
    icon: FileText,
    route: "/freelancer/upload",
    allowedRoles: ["freelancer"],
  },
  {
    label: "Hộ chiếu uy tín",
    icon: Sparkles,
    route: "/freelancer/trust-passport",
    allowedRoles: ["freelancer"],
  },

  // ────── Admin-only ──────
  {
    label: "Quản lý Users",
    icon: UsersRound,
    route: "/admin/users",
    allowedRoles: ["admin"],
  },
  {
    label: "Duyệt hồ sơ",
    icon: ShieldCheck,
    route: "/admin/verifications",
    allowedRoles: ["admin"],
  },
  {
    label: "Xử lý tranh chấp",
    icon: Scale,
    route: "/admin/disputes",
    allowedRoles: ["admin"],
  },
  {
    label: "Contact Monitor",
    icon: ShieldCheck,
    route: "/admin/contact-monitor",
    allowedRoles: ["admin"],
  },
];

export interface AppSidebarProps {
  active: string;
  onSelect?: (item: NavItem) => void;
  onAiClick?: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function AppSidebar({
  active,
  onSelect,
  onAiClick,
  open,
  setOpen,
}: AppSidebarProps) {
  const { data: quotas } = useQuotas();
  const { user } = useAuth();
  const userRole = (user as any)?.role || "freelancer";
  const aiQuota =
    quotas?.find((q) => q.feature === "ai_matching") ?? quotas?.[0];
  const usedPct =
    aiQuota && aiQuota.limit_count > 0
      ? Math.round((aiQuota.used_count / aiQuota.limit_count) * 100)
      : 0;
  return (
    <>
      {open && (
        <button
          aria-label="Đóng menu"
          className="fixed inset-0 z-30 bg-slate-900/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[246px] flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-2.5">
            <img
              src={logoIcon}
              alt="FreelanceHub"
              className="h-8 w-8 rounded-xl object-cover"
            />
            <span className="text-[17px] font-extrabold tracking-tight text-slate-900">
              FreelanceHub <span className="text-indigo-600">AI</span>
            </span>
          </div>
          <button
            className="text-slate-400 lg:hidden"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Quản lý
          </p>
          <div className="space-y-1">
            {navItems
              .filter(
                (item) =>
                  !item.allowedRoles || item.allowedRoles.includes(userRole),
              )
              .map(({ label, icon: Icon, route, badge }) => {
                const selected = active === label;
                const disabled = !route;
                return (
                  <button
                    key={label}
                    disabled={disabled}
                    title={
                      disabled
                        ? "Tính năng đang phát triển (Sprint 4)"
                        : undefined
                    }
                    onClick={() => {
                      if (disabled) return;
                      onSelect?.({ label, icon: Icon, route });
                      setOpen(false);
                    }}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition active:scale-[0.98] ${disabled ? "cursor-not-allowed opacity-40" : selected ? "bg-indigo-50 text-indigo-700 active:bg-indigo-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"}`}
                  >
                    <Icon size={17} strokeWidth={selected ? 2.3 : 1.8} />
                    <span className="flex-1">{label}</span>
                    {badge && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-100 px-1.5 text-[10px] font-bold text-violet-700">
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        </nav>

        <div className="sticky bottom-0 mx-4 mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#f2f1ff] to-[#eef6ff] px-2 pt-2 pb-4">
          <img
            src={aiIllustration}
            alt="AI tuyển dụng"
            className="mb-3 block w-full rounded-xl object-cover"
          />
          <p className="text-[12px] font-bold leading-5 text-slate-800">
            Nâng cấp trải nghiệm tuyển dụng với AI
          </p>
          {aiQuota && (
            <div className="mt-2">
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>
                  Đã dùng: {aiQuota.used_count}/{aiQuota.limit_count}
                </span>
                <span>{usedPct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/70">
                <div
                  className={`h-full rounded-full transition-all ${usedPct >= 90 ? "bg-red-400" : usedPct >= 70 ? "bg-amber-400" : "bg-indigo-400"}`}
                  style={{ width: `${Math.min(usedPct, 100)}%` }}
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onAiClick}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-white px-2 py-2 text-[10px] font-bold text-indigo-600 shadow-sm"
          >
            Khám phá tính năng AI <ChevronRight size={12} />
          </button>
        </div>
      </aside>
    </>
  );
}
