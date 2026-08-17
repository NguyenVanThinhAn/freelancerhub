import { useState } from "react";
import { Check, Loader2, Sparkles, X, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { toast } from "sonner";

const plans = [
  {
    id: "free",
    name: "Freelancer Free",
    price: 0,
    priceLabel: "Miễn phí",
    badge: null,
    features: [
      "Tạo và ứng tuyển công việc",
      "Xem Trust Passport cơ bản",
      "Chat và nhắn tin",
      "1 GB lưu trữ CV",
      "Hỗ trợ qua email",
    ],
    cta: "Dùng miễn phí",
    highlighted: false,
  },
  {
    id: "student",
    name: "Gói Sinh viên",
    price: 29000,
    priceLabel: "29.000đ/tháng",
    badge: "Phổ biến",
    features: [
      "Tất cả tính năng Free",
      "AI hỗ trợ tạo CV thông minh",
      "3 GB lưu trữ CV + chứng chỉ",
      "Ưu tiên hiển thị trong tìm kiếm",
      "Báo cáo thuế TNCN tự động",
      "Hỗ trợ qua chat ưu tiên",
    ],
    cta: "Đăng ký Sinh viên",
    highlighted: true,
    requiresVerification: true,
  },
  {
    id: "pro",
    name: "Freelancer Pro",
    price: 199000,
    priceLabel: "199.000đ/tháng",
    badge: "Đề xuất",
    features: [
      "Tất cả tính năng Gói Sinh viên",
      "AI nâng cao: matching thông minh",
      "0% phí sàn giao dịch",
      "10 GB lưu trữ CV + chứng chỉ",
      "Badge Pro hiển thị công khai",
      "Hỗ trợ 24/7 qua chat & điện thoại",
      "Dịch vụ hỗ trợ kê khai thuế",
    ],
    cta: "Nâng cấp Pro",
    highlighted: false,
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [studentIdCard, setStudentIdCard] = useState<File | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentSchool, setStudentSchool] = useState("");

  const handleUpgrade = async (planId: string) => {
    if (planId === "student") {
      setShowStudentForm(true);
      return;
    }
    setUpgrading(planId);
    // Simulate API call — replace with real subscription API when backend supports
    await new Promise((r) => setTimeout(r, 1500));
    setUpgrading(null);
    toast.success(`Đã đăng ký thành công gói ${planId === "pro" ? "Pro" : "Free"}!`);
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdCard) {
      toast.error("Vui lòng upload ảnh thẻ sinh viên");
      return;
    }
    setUpgrading("student");
    await new Promise((r) => setTimeout(r, 1500));
    setUpgrading(null);
    setShowStudentForm(false);
    toast.success("Đã gửi hồ sơ sinh viên! Đang chờ Admin duyệt (1-2 ngày làm việc).");
  };

  return (
    <BusinessShell active="Nâng cấp">
      <div className="mb-6 text-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-bold text-indigo-600">
          <Sparkles size={11} />
          Nâng cấp tài khoản
        </div>
        <h1 className="text-[28px] font-extrabold tracking-tight">Chọn gói phù hợp với bạn</h1>
        <p className="mt-2 text-sm text-slate-500">
          Mở khóa tính năng AI, giảm phí sàn và nhiều hơn nữa.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition ${
              plan.highlighted
                ? "border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-violet-50 shadow-md ring-2 ring-indigo-200"
                : "border-slate-200 bg-white"
            }`}
          >
            {plan.badge && (
              <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[9px] font-bold ${
                plan.highlighted ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {plan.badge}
              </span>
            )}

            <div className="mb-4">
              <h2 className="text-[15px] font-extrabold text-slate-900">{plan.name}</h2>
              <div className="mt-2">
                <span className="text-[26px] font-extrabold text-slate-900">
                  {plan.price === 0 ? "Miễn phí" : plan.price.toLocaleString("vi-VN")}
                </span>
                {plan.price > 0 && (
                  <span className="text-[11px] text-slate-400">đ/tháng</span>
                )}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">{plan.priceLabel}</p>
            </div>

            <ul className="mb-6 flex-1 space-y-2.5">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px]">
                  <Check size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                  <span className="text-slate-600">{f}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => handleUpgrade(plan.id)}
              disabled={upgrading !== null}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[12px] font-bold transition ${
                plan.highlighted
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              } disabled:opacity-50`}
            >
              {upgrading === plan.id ? (
                <><Loader2 size={13} className="animate-spin" /> Đang xử lý...</>
              ) : (
                plan.cta
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Student verification form */}
      {showStudentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">Xác minh sinh viên</h3>
              <button
                onClick={() => setShowStudentForm(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mb-4 text-[11px] text-slate-500">
              Vui lòng cung cấp thông tin sinh viên để đăng ký Gói Sinh viên 29.000đ/tháng. Admin sẽ duyệt trong 1-2 ngày làm việc.
            </p>
            <form onSubmit={handleStudentSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-700">Họ và tên</label>
                <input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                  placeholder="Nguyễn Văn A"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-700">Trường đại học / cao đẳng</label>
                <input
                  value={studentSchool}
                  onChange={(e) => setStudentSchool(e.target.value)}
                  required
                  placeholder="VD: Đại học Bách Khoa TP.HCM"
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[11px] outline-none focus:border-indigo-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-slate-700">
                  Ảnh thẻ sinh viên (PNG/JPG, tối đa 5MB) <b className="text-rose-500">*</b>
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-500 hover:bg-slate-100">
                    <Upload size={13} />
                    {studentIdCard ? studentIdCard.name : "Chọn ảnh thẻ SV"}
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={(e) => setStudentIdCard(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </label>
                  {studentIdCard && (
                    <span className="text-[10px] text-emerald-600 font-bold">✓ Đã chọn</span>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 text-[10px] text-amber-700">
                Thẻ sinh viên phải còn hiệu lực và hiển thị rõ thông tin cá nhân. Admin sẽ duyệt trong 1-2 ngày làm việc.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStudentForm(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={upgrading === "student"}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {upgrading === "student" ? <><Loader2 size={11} className="animate-spin" /> Đang gửi...</> : "Gửi đăng ký"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-[10px] text-slate-400">
        Thanh toán là simulation — không thu tiền thật. Liên hệ hỗ trợ nếu cần.
      </p>
    </BusinessShell>
  );
}
