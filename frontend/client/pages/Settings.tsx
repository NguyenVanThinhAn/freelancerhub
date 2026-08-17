import { useState } from "react";
import { BusinessShell } from "@/layout/BusinessShell";
import { useOrganizationProfile } from "@/hooks/use-organization";
import { useAuth } from "@/auth/AuthContext";
import { apiPatch } from "@/api/client";
import { ENDPOINT_ORGANIZATION_PROFILE, ENDPOINT_AUTH_CHANGE_PASSWORD } from "@/api/endpoints";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { OrganizationProfile } from "@/hooks/use-organization";

export default function Settings() {
  const { user } = useAuth();
  const userRole = (user as any)?.role || "freelancer";
  const isBusiness = userRole === "business" || userRole === "enterprise";

  return (
    <BusinessShell active="Cài đặt tài khoản">
      <div className="mb-5">
        <p className="mb-1 text-[11px] font-medium text-slate-400">Quản lý / Cài đặt tài khoản</p>
        <h1 className="text-[24px] font-extrabold tracking-tight">Cài đặt tài khoản</h1>
        <p className="mt-1 text-xs text-slate-500">
          Quản lý hồ sơ công ty và bảo mật tài khoản. Hồ sơ cá nhân của freelancer được quản lý tại trang Hồ sơ cá nhân.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {isBusiness && <BusinessProfileSection />}
        <AccountInfoAndPassword />
      </div>
    </BusinessShell>
  );
}

function BusinessProfileSection() {
  const { data: profile, isLoading } = useOrganizationProfile();
  const [form, setForm] = useState<Partial<OrganizationProfile>>({});
  const [saving, setSaving] = useState(false);

  const merged = { ...profile, ...form };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatch(ENDPOINT_ORGANIZATION_PROFILE, form);
      toast.success("Cập nhật hồ sơ thành công!");
      setForm({});
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-slate-300" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-sm font-bold">Hồ sơ công ty</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tên công ty</label>
          <input
            type="text"
            value={merged.name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ngành nghề</label>
          <input
            type="text"
            value={merged.industry ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            placeholder="Công nghệ thông tin"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Mô tả</label>
          <textarea
            value={merged.description ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Website</label>
          <input
            type="url"
            value={merged.website ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            placeholder="https://example.com"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Mã số thuế</label>
          <input
            type="text"
            value={merged.tax_code ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, tax_code: e.target.value }))}
            placeholder="0123456789"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Lưu thay đổi
        </button>
      </div>
    </section>
  );
}

function AccountInfoAndPassword() {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const handleChangePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm) {
      toast.error("Mật khẩu mới không khớp");
      return;
    }
    if (pwForm.new_password.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    setPwSaving(true);
    try {
      await apiPatch(ENDPOINT_AUTH_CHANGE_PASSWORD, {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      });
      toast.success("Đổi mật khẩu thành công!");
      setPwForm({ old_password: "", new_password: "", confirm: "" });
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "Lỗi khi đổi mật khẩu");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold">Thông tin tài khoản</h2>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Email</span>
            <span className="font-semibold">{user?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Vai trò</span>
            <span className="font-semibold capitalize">{user?.role ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Trạng thái</span>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">Đã xác minh</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-bold">Đổi mật khẩu</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-600">Mật khẩu hiện tại</label>
            <input
              type={showPw ? "text" : "password"}
              value={pwForm.old_password}
              onChange={(e) => setPwForm((f) => ({ ...f, old_password: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-600">Mật khẩu mới</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={pwForm.new_password}
                onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-slate-600">Xác nhận mật khẩu mới</label>
            <input
              type={showPw ? "text" : "password"}
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={pwSaving || !pwForm.old_password || !pwForm.new_password || !pwForm.confirm}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {pwSaving && <Loader2 size={13} className="animate-spin" />}
            Cập nhật mật khẩu
          </button>
        </div>
      </section>
    </div>
  );
}
