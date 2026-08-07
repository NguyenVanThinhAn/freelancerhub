import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, User, Briefcase, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { AuthLayout } from "@/components/AuthLayout";

type AuthMode = "login" | "register-freelancer" | "register-business";

const LOGIN_BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Xác minh danh tính",
    desc: "Trust Passport AI bảo vệ bạn khỏi gian lận và profile giả.",
  },
  {
    icon: Zap,
    title: "Kết nối nhanh",
    desc: "Matching bằng AI trong vài giây — không cần gửi hàng chục proposal.",
  },
  {
    icon: Briefcase,
    title: "Thanh toán an toàn",
    desc: "Escrow thông minh, giải ngân theo milestone, không lo bị bom hợp đồng.",
  },
];

const REGISTER_FREELANCER_BENEFITS = [
  {
    icon: User,
    title: "Hồ sơ nổi bật",
    desc: "Được Trust Passport AI đánh giá giúp hồ sơ tăng điểm uy tín.",
  },
  {
    icon: Zap,
    title: "Việc làm chất lượng",
    desc: "AI matching dự án phù hợp với kỹ năng và lịch sử làm việc của bạn.",
  },
  {
    icon: ShieldCheck,
    title: "Quyền lợi được bảo vệ",
    desc: "Hợp đồng rõ ràng, escrow minh bạch, giải ngân tự động.",
  },
];

const REGISTER_BUSINESS_BENEFITS = [
  {
    icon: User,
    title: "Talent chất lượng",
    desc: "Truy cập 10.000+ freelancer đã xác minh danh tính bằng công nghệ AI.",
  },
  {
    icon: Zap,
    title: "Đăng job trong 60s",
    desc: "AI hỗ trợ viết JD, gợi ý ngân sách và lọc ứng viên tự động.",
  },
  {
    icon: ShieldCheck,
    title: "Quản trị rủi ro",
    desc: "Escrow bảo vệ ngân sách, KPI milestone rõ ràng, hỗ trợ tranh chấp 24/7.",
  },
];

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode !== "login";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        // TODO: wire register endpoints when backend is ready
        setError("Tính năng đăng ký đang được phát triển. Vui lòng đăng nhập.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  const getLayoutProps = () => {
    if (mode === "login") {
      return {
        title: "Chào mừng trở lại với FreelancerHub AI",
        subtitle: "Đăng nhập để tiếp tục làm việc với các dự án, freelancer và hợp đồng của bạn.",
        benefits: LOGIN_BENEFITS,
      };
    }
    if (mode === "register-freelancer") {
      return {
        title: "Bắt đầu hành trình Freelancer của bạn",
        subtitle: "Tạo tài khoản miễn phí để truy cập 2.500+ dự án đang chờ và xây dựng Trust Passport AI.",
        benefits: REGISTER_FREELANCER_BENEFITS,
      };
    }
    return {
      title: "Tuyển dụng freelancer tốt hơn với AI",
      subtitle: "Tạo tài khoản Doanh nghiệp để đăng job, matching ứng viên tự động và quản lý escrow.",
      benefits: REGISTER_BUSINESS_BENEFITS,
    };
  };

  const layoutProps = getLayoutProps();

  return (
    <AuthLayout
      title={layoutProps.title}
      subtitle={layoutProps.subtitle}
      benefits={layoutProps.benefits}
    >
      {/* Form heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          {mode === "login"
            ? "Đăng nhập"
            : mode === "register-freelancer"
              ? "Đăng ký Freelancer"
              : "Đăng ký Doanh nghiệp"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Nhập email và mật khẩu để vào tài khoản của bạn."
            : "Điền thông tin cơ bản — hoàn tất hồ sơ ngay sau khi đăng nhập."}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Họ và tên
            </label>
            <input
              type="text"
              required={isRegister}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-input bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-input bg-white px-4 py-2.5 pr-11 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {mode === "login" && (
          <div className="text-right">
            <button
              type="button"
              className="text-xs text-primary hover:opacity-80 transition"
              onClick={() => setError("Tính năng quên mật khẩu đang được phát triển")}
            >
              Quên mật khẩu?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading && <Loader2 size={15} className="animate-spin" />}
          {mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
        </button>
      </form>

      {/* Divider */}
      {mode === "login" && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-xs text-muted-foreground">hoặc tiếp tục với</span>
            </div>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-foreground">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-6 text-center text-xs text-muted-foreground">
        {mode === "login" ? (
          <>
            Chưa có tài khoản?{" "}
            <div className="mt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setMode("register-freelancer")}
                className="font-semibold text-primary hover:opacity-80 transition"
              >
                Đăng ký Freelancer
              </button>
              <span className="text-border">·</span>
              <button
                type="button"
                onClick={() => setMode("register-business")}
                className="font-semibold text-primary hover:opacity-80 transition"
              >
                Đăng ký Doanh nghiệp
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className="font-semibold text-primary hover:opacity-80 transition"
          >
            ← Quay lại đăng nhập
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Bằng việc tiếp tục, bạn đồng ý với{" "}
        <span className="underline cursor-pointer">Điều khoản sử dụng</span> và{" "}
        <span className="underline cursor-pointer">Chính sách bảo mật</span>.
      </p>
    </AuthLayout>
  );
}
