import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, ShieldAlert, Briefcase } from "lucide-react";
import registerImage from "@/assets/register.png";
import iconLogo from "@/assets/icon_w.png";
import { useAuth } from "@/auth/AuthContext";

interface Benefit {
  icon: React.ElementType;
  title: string;
  desc: string;
}

interface AuthLayoutProps {
  title: React.ReactNode;
  subtitle: string;
  benefits: Benefit[];
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, benefits, children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Sau khi login, "Khám phá" đi đâu tùy role:
  // - freelancer → /jobs/browse (tìm việc)
  // - business/enterprise → /jobs (quản lý JD của mình)
  // - admin → /admin/users
  // - chưa login → /jobs (sẽ redirect về /login rồi)
  const browseRoute =
    user?.role === "freelancer" ? "/jobs/browse"
    : user?.role === "admin" ? "/admin/users"
    : "/jobs";

  const handleBrowse = () => {
    navigate(browseRoute);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-white">
      {/* Header */}
      <header className="flex-none w-full px-6 lg:px-10 xl:px-12 2xl:px-16 py-4 lg:py-5 bg-white">
        <div className="flex items-center justify-between max-w-[1800px] mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={iconLogo}
              alt="FreelancerHub"
              className="h-9 w-9 shrink-0"
            />
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              FreelancerHub <span className="bg-gradient-to-r from-sky-400 to-primary bg-clip-text text-transparent">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="px-4 py-2 rounded-xl border border-border bg-white text-sm font-semibold text-foreground hover:bg-muted hover:border-primary hover:text-primary transition-all"
            >
              Trang chủ
            </Link>
            <button
              type="button"
              onClick={handleBrowse}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
            >
              {user?.role === "freelancer" ? "Tìm việc" : "Khám phá"}
            </button>
          </div>
        </div>
      </header>

      {/* Content - 2 Panel */}
      <div className="flex-1 min-h-0 flex">
        {/* Left Panel: Visuals & Stats */}
        <section className="hidden md:flex flex-col relative overflow-hidden h-full flex-1 bg-white">
          <div className="absolute inset-x-0 bottom-0 w-full pb-0 flex items-end justify-center pointer-events-none z-0">
            <img
              className="w-full h-[55vh] lg:h-[60vh] object-fill mix-blend-multiply"
              src={registerImage}
              alt="Illustration"
            />
          </div>

          <div className="relative z-10 w-full h-full flex flex-col justify-between pointer-events-none">
            <div className="flex-none pl-6 lg:pl-10 xl:pl-12 2xl:pl-16 pr-6 max-w-[850px] mr-auto w-full pointer-events-auto">
              <h2 className="text-[36px] xl:text-[42px] leading-[1.2] font-bold text-foreground mb-4">
                {title}
              </h2>
              <p className="text-[15px] xl:text-[17px] text-muted-foreground leading-[1.6] mb-8">
                {subtitle}
              </p>

              <div className="flex flex-col gap-5 mb-6">
                {benefits.map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <div key={i} className="flex gap-4 items-start bg-white/80 backdrop-blur-[2px] rounded-2xl p-3 shadow-sm">
                      <div className="w-11 h-11 rounded-full bg-white shadow-sm text-primary flex items-center justify-center shrink-0">
                        <Icon size={22} />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-bold text-foreground mb-0.5">{b.title}</h4>
                        <p className="text-[14px] text-muted-foreground">{b.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stats Bar Overlay */}
            <div className="flex-none mx-auto w-[90%] max-w-lg mb-6 sm:mb-8 pointer-events-auto">
              <div className="grid grid-cols-3 gap-4 bg-white/70 backdrop-blur-md border border-white p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <User size={20} />
                  </div>
                  <div className="whitespace-nowrap">
                    <strong className="block text-[15px] text-blue-600 leading-tight">10.000+</strong>
                    <span className="text-[11px] text-muted-foreground font-medium">Freelancer tài năng</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Briefcase size={20} />
                  </div>
                  <div className="whitespace-nowrap">
                    <strong className="block text-[15px] text-primary leading-tight">2.500+</strong>
                    <span className="text-[11px] text-muted-foreground font-medium">Dự án đang chờ</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <ShieldAlert size={20} />
                  </div>
                  <div className="whitespace-nowrap">
                    <strong className="block text-[15px] text-blue-600 leading-tight">98%</strong>
                    <span className="text-[11px] text-muted-foreground font-medium">Khách hàng hài lòng</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Panel: Form */}
        <section className="flex flex-col h-full overflow-y-auto w-full md:w-[420px] lg:w-[460px] xl:w-[500px] shrink-0 bg-white">
          <div className="w-full m-auto flex flex-col px-4 sm:px-8 py-8 lg:py-12">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
};
