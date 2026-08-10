import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar, type NavItem } from "./AppSidebar";
import { TopBar } from "./TopBar";

export interface BusinessShellProps {
  active: string;
  children: ReactNode;
  searchPlaceholder?: string;
}

const DEFAULT_ROUTE: Record<string, string> = {
  "T\u1ed4ng quan": "/",
  "T\u1ea1o JD": "/create-job",
  "AI Matching": "/matching",
  "Tin tuy\u1ec3n d\u1ee5ng": "/jobs",
  "Ph\u1ecfng v\u1ea5n": "/interview-scheduler",
  "Ph\u1ecfng v\u1ea5n c\u1ee7a t\u00f4i": "/my-interviews",
  "H\u1ee3p \u0111\u1ed3ng": "/contract-milestone",
  "Thanh to\u00e1n": "/wallet",
};

export function BusinessShell({
  active,
  children,
  searchPlaceholder,
}: BusinessShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSelect = (item: NavItem) => {
    const route = item.route ?? DEFAULT_ROUTE[item.label];
    if (route) navigate(route);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-900">
      <div className="flex min-h-screen">
        <AppSidebar
          active={active}
          onSelect={handleSelect}
          onAiClick={() => navigate("/explainable-matching")}
          open={sidebarOpen}
          setOpen={setSidebarOpen}
        />
        <main className="min-w-0 flex-1">
          <TopBar
            onOpenSidebar={() => setSidebarOpen(true)}
            searchPlaceholder={searchPlaceholder}
          />
          <div className="mx-auto max-w-[1500px] p-4 sm:p-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
