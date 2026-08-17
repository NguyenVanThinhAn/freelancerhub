import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User as UserIcon,
  Mail,
  Briefcase,
  DollarSign,
  Calendar,
  Edit3,
  Save,
  X,
  Plus,
  Tag,
  Link as LinkIcon,
  ExternalLink,
  Star,
  Award,
  ChevronRight,
  TrendingUp,
  FileText,
  Sparkles,
} from "lucide-react";
import { BusinessShell } from "@/layout/BusinessShell";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import {
  useFreelancerProfile,
  useUpdateFreelancerProfile,
  useFreelancerSkills,
  useUpdateFreelancerSkills,
  useFreelancerPortfolio,
  useAddPortfolioItem,
  useCVImport,
} from "@/hooks/use-freelancer-profile";

type Tab = "overview" | "skills" | "portfolio";

export function FreelancerProfilePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <BusinessShell active="Hồ sơ cá nhân">
      <div className="mb-3 flex items-center gap-2 text-[10px] text-slate-400">
        <span>Freelancer</span>
        <ChevronRight size={11} />
        <span className="font-semibold text-indigo-600">Hồ sơ cá nhân</span>
      </div>

      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-[25px] font-extrabold tracking-tight text-slate-900">
            Hồ sơ cá nhân
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Quản lý thông tin hiển thị công khai của bạn trên FreelanceHub.
          </p>
        </div>
      </div>

      <HeaderCard user={user} />

      <CVImportBanner onJumpTab={setTab} />

      <Tabs tab={tab} onChange={setTab} />

      <div>
        {tab === "overview" && <OverviewTab />}
        {tab === "skills" && <SkillsTab />}
        {tab === "portfolio" && <PortfolioTab />}
      </div>
    </BusinessShell>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function HeaderCard({ user }: { user: any }) {
  const { data: profile } = useFreelancerProfile();

  const completion = profile?.profile_completion ?? 0;
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Freelancer";
  const initials = displayName.slice(0, 2).toUpperCase();
  const tier = completion >= 80 ? "Xuất sắc" : completion >= 50 ? "Tốt" : "Đang xây dựng";
  const tierTone =
    completion >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : completion >= 50
      ? "bg-indigo-50 text-indigo-700 border-indigo-100"
      : "bg-amber-50 text-amber-700 border-amber-100";

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-extrabold text-white shadow-lg shadow-indigo-200/50">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[18px] font-extrabold tracking-tight text-slate-900">
              {displayName}
            </h2>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold ${tierTone}`}>
              <Star size={9} />
              {tier}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Mail size={11} /> {user?.email}
          </p>
          {profile?.headline && (
            <p className="mt-1.5 text-[12px] font-medium text-slate-700">{profile.headline}</p>
          )}
        </div>
        <div className="rounded-2xl border border-white bg-white/80 p-3 text-center shadow-sm">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Hoàn thiện</p>
          <p className="mt-0.5 text-[24px] font-extrabold leading-none text-indigo-700">
            {completion}<span className="text-[12px] text-slate-400">%</span>
          </p>
          <div className="mt-2 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CV Import Banner ────────────────────────────────────────────────────────

function CVImportBanner({ onJumpTab }: { onJumpTab: (t: Tab) => void }) {
  const { data: cv } = useCVImport();
  const { data: profile } = useFreelancerProfile();
  const updateProfile = useUpdateFreelancerProfile();
  const { data: currentSkills } = useFreelancerSkills();
  const updateSkills = useUpdateFreelancerSkills();
  const [dismissed, setDismissed] = useState(false);

  if (!cv?.has_cv || dismissed) return null;

  // Tính các skill mới chưa có trong profile
  const existing = new Set((currentSkills ?? []).map((s) => s.name.toLowerCase()));
  const newSkills = cv.skills.filter((s) => !existing.has(s.toLowerCase()));
  const missingHeadline = !profile?.headline && !!cv.headline_hint;
  const missingName = !profile?.display_name && !!cv.full_name;

  if (newSkills.length === 0 && !missingHeadline && !missingName) return null;

  const applyAll = async () => {
    const promises: Promise<unknown>[] = [];
    if (newSkills.length > 0) {
      const merged = Array.from(new Set([...(currentSkills ?? []).map((s) => s.name), ...newSkills]));
      promises.push(updateSkills.mutateAsync(merged));
    }
    const profilePayload: Record<string, unknown> = {};
    if (missingHeadline) profilePayload.headline = cv.headline_hint;
    if (missingName) profilePayload.display_name = cv.full_name;
    if (Object.keys(profilePayload).length > 0) {
      promises.push(updateProfile.mutateAsync(profilePayload as { headline?: string; display_name?: string }));
    }
    try {
      await Promise.all(promises);
      toast.success(`Đã import ${newSkills.length} kỹ năng${missingHeadline ? " + headline" : ""} từ CV`);
      setDismissed(true);
    } catch {
      toast.error("Lỗi khi import từ CV");
    }
  };

  const applySkills = async () => {
    if (newSkills.length === 0) return;
    const merged = Array.from(new Set([...(currentSkills ?? []).map((s) => s.name), ...newSkills]));
    try {
      await updateSkills.mutateAsync(merged);
      toast.success(`Đã thêm ${newSkills.length} kỹ năng từ CV`);
      setDismissed(true);
    } catch {
      toast.error("Lỗi khi thêm kỹ năng");
    }
  };

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-indigo-50/60 to-white p-4 shadow-[0_6px_20px_rgba(99,79,232,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[13px] font-extrabold text-slate-900">
                Import dữ liệu từ CV
              </h2>
              {cv.completeness_percent != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-white px-2 py-0.5 text-[9px] font-bold text-violet-700">
                  <Sparkles size={9} />
                  CV {cv.completeness_percent}% hoàn thiện
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-600">
              Hệ thống phát hiện CV của bạn có thể bổ sung cho hồ sơ:
            </p>
            <ul className="mt-1.5 space-y-0.5 text-[10px] text-slate-600">
              {newSkills.length > 0 && (
                <li>
                  • <span className="font-bold text-slate-800">{newSkills.length} kỹ năng</span> chưa có trong hồ sơ
                  {newSkills.length > 0 && newSkills.length <= 6 && (
                    <span className="text-slate-400"> ({newSkills.slice(0, 6).join(", ")})</span>
                  )}
                </li>
              )}
              {missingHeadline && cv.headline_hint && (
                <li>
                  • <span className="font-bold text-slate-800">Headline gợi ý:</span> {cv.headline_hint}
                </li>
              )}
              {missingName && cv.full_name && (
                <li>
                  • <span className="font-bold text-slate-800">Tên hiển thị:</span> {cv.full_name}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <button
            onClick={() => onJumpTab("overview")}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Để sau
          </button>
          {newSkills.length > 0 && (
            <button
              onClick={applySkills}
              disabled={updateSkills.isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
            >
              <Tag size={10} /> Chỉ kỹ năng
            </button>
          )}
          <button
            onClick={applyAll}
            disabled={updateProfile.isPending || updateSkills.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 px-3 py-1.5 text-[10px] font-extrabold text-white shadow-sm transition hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50"
          >
            <Sparkles size={10} /> Import tất cả
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
            aria-label="Đóng"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

function Tabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: typeof UserIcon }[] = [
    { id: "overview", label: "Tổng quan", icon: UserIcon },
    { id: "skills", label: "Kỹ năng", icon: Tag },
    { id: "portfolio", label: "Portfolio", icon: Briefcase },
  ];
  return (
    <div className="mb-5 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onChange(it.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition ${
              active
                ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <Icon size={12} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: profile, isLoading } = useFreelancerProfile();
  const update = useUpdateFreelancerProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    headline: "",
    bio: "",
    experience_years: 0,
    hourly_rate: 0,
    availability_status: "available",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        headline: profile.headline ?? "",
        bio: profile.bio ?? "",
        experience_years: profile.experience_years ?? 0,
        hourly_rate: profile.hourly_rate ?? 0,
        availability_status: profile.availability_status ?? "available",
      });
    }
  }, [profile]);

  const onSave = async () => {
    try {
      await update.mutateAsync({
        display_name: form.display_name,
        headline: form.headline,
        bio: form.bio,
        experience_years: form.experience_years,
        hourly_rate: form.hourly_rate,
        availability_status: form.availability_status,
      });
      toast.success("Đã lưu hồ sơ");
      setEditing(false);
    } catch {
      toast.error("Lỗi khi lưu hồ sơ");
    }
  };

  const availabilityTone = (s: string) =>
    s === "available"
      ? "bg-emerald-50 text-emerald-700"
      : s === "limited"
      ? "bg-amber-50 text-amber-700"
      : "bg-rose-50 text-rose-700";

  const availabilityLabel = (s: string) =>
    s === "available" ? "Đang rảnh" : s === "limited" ? "Bán thời gian" : "Đang bận";

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
              <UserIcon size={14} className="text-indigo-500" />
              Thông tin cơ bản
            </h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
              >
                <Edit3 size={10} /> Chỉnh sửa
              </button>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={onSave}
                  disabled={update.isPending}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save size={10} /> Lưu
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                >
                  <X size={10} /> Hủy
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên hiển thị">
              {editing ? (
                <input
                  type="text"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  maxLength={150}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <p className="text-[12px] font-semibold text-slate-900">
                  {profile?.display_name || (
                    <span className="italic text-slate-400">Chưa có tên hiển thị</span>
                  )}
                </p>
              )}
            </Field>

            <Field label="Tiêu đề chuyên môn">
              {editing ? (
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  placeholder="VD: Senior Fullstack Developer (React/Node.js)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <p className="text-[12px] font-semibold text-slate-900">
                  {profile?.headline || (
                    <span className="italic text-slate-400">Chưa có tiêu đề</span>
                  )}
                </p>
              )}
            </Field>

            <Field label="Trạng thái nhận việc">
              {editing ? (
                <select
                  value={form.availability_status}
                  onChange={(e) => setForm({ ...form, availability_status: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="available">Đang rảnh</option>
                  <option value="limited">Bán thời gian</option>
                  <option value="unavailable">Đang bận</option>
                </select>
              ) : (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${availabilityTone(profile?.availability_status ?? "available")}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {availabilityLabel(profile?.availability_status ?? "available")}
                </span>
              )}
            </Field>

            <Field label="Mức thù lao / giờ (VND)">
              {editing ? (
                <input
                  type="number"
                  value={form.hourly_rate}
                  onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <p className="flex items-center gap-1 text-[13px] font-extrabold text-indigo-700">
                  <DollarSign size={13} />
                  {profile?.hourly_rate ? Number(profile.hourly_rate).toLocaleString("vi-VN") : "—"}
                  <span className="text-[10px] font-semibold text-slate-400">/giờ</span>
                </p>
              )}
            </Field>

            <Field label="Kinh nghiệm (năm)">
              {editing ? (
                <input
                  type="number"
                  step={0.5}
                  min={0}
                  max={50}
                  value={form.experience_years}
                  onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <p className="flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                  <Calendar size={11} />
                  {profile?.experience_years ? `${profile.experience_years} năm` : "—"}
                </p>
              )}
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Giới thiệu">
              {editing ? (
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Mô tả ngắn về bản thân, thế mạnh chuyên môn, phong cách làm việc..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-600">
                  {profile?.bio || (
                    <span className="italic text-slate-400">Chưa có giới thiệu. Bổ sung để tăng điểm hoàn thiện hồ sơ.</span>
                  )}
                </p>
              )}
            </Field>
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <CompletionTips completion={profile?.profile_completion ?? 0} />
        <ProfileStats />
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function CompletionTips({ completion }: { completion: number }) {
  const tips = [
    { id: 1, text: "Thêm tiêu đề chuyên môn", done: completion >= 20 },
    { id: 2, text: "Viết giới thiệu (bio)", done: completion >= 40 },
    { id: 3, text: "Khai báo kỹ năng", done: completion >= 60 },
    { id: 4, text: "Thêm portfolio ít nhất 1 mục", done: completion >= 80 },
    { id: 5, text: "Upload CV để Admin xác minh", done: completion >= 100 },
  ];
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
      <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
        <TrendingUp size={11} className="text-indigo-500" /> Mẹo tăng điểm hoàn thiện
      </h2>
      <ul className="space-y-2">
        {tips.map((t) => (
          <li key={t.id} className="flex items-start gap-2">
            <span
              className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white ${
                t.done ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              {t.done ? "✓" : ""}
            </span>
            <span className={`text-[10px] ${t.done ? "text-slate-400 line-through" : "text-slate-600"}`}>
              {t.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProfileStats() {
  const { data: skills } = useFreelancerSkills();
  const { data: portfolio } = useFreelancerPortfolio();
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
      <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700">
        <Award size={11} className="text-amber-500" /> Thống kê nhanh
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Kỹ năng" value={skills?.length ?? 0} icon={Tag} />
        <Stat label="Portfolio" value={portfolio?.length ?? 0} icon={Briefcase} />
      </div>
    </section>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Tag }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
        <Icon size={9} />
        {label}
      </div>
      <p className="text-[18px] font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

// ─── Skills tab ──────────────────────────────────────────────────────────────

function SkillsTab() {
  const { data: skills, isLoading } = useFreelancerSkills();
  const update = useUpdateFreelancerSkills();
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<string[]>([]);

  useEffect(() => {
    if (skills) setDraft(skills.map((s) => s.name));
  }, [skills]);

  const addSkill = () => {
    const t = input.trim();
    if (!t || draft.includes(t)) return;
    setDraft([...draft, t]);
    setInput("");
  };

  const removeSkill = (name: string) => {
    setDraft(draft.filter((s) => s !== name));
  };

  const onSave = async () => {
    try {
      await update.mutateAsync(draft);
      toast.success(`Đã cập nhật ${draft.length} kỹ năng`);
    } catch {
      toast.error("Lỗi khi lưu kỹ năng");
    }
  };

  const dirty = JSON.stringify(draft.sort()) !== JSON.stringify((skills ?? []).map((s) => s.name).sort());

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
            <Tag size={14} className="text-indigo-500" />
            Kỹ năng của bạn
          </h2>
          <p className="mt-1 text-[10px] text-slate-500">
            Liệt kê các công nghệ, framework, kỹ năng mềm để tăng khả năng matching.
          </p>
        </div>
        {dirty && (
          <button
            onClick={onSave}
            disabled={update.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={10} /> Lưu
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill();
            }
          }}
          placeholder="VD: React, Python, Figma..."
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        />
        <button
          onClick={addSkill}
          disabled={!input.trim()}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus size={10} /> Thêm
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-slate-100" />
          ))}
        </div>
      ) : draft.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-8 text-center">
          <Tag size={20} className="mx-auto mb-2 text-slate-300" />
          <p className="text-[11px] font-bold text-slate-700">Chưa có kỹ năng nào</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Thêm kỹ năng để tăng cơ hội matching với dự án phù hợp.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {draft.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-bold text-indigo-700"
            >
              {s}
              <button
                onClick={() => removeSkill(s)}
                className="hover:text-rose-500"
                aria-label={`Bỏ ${s}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Portfolio tab ───────────────────────────────────────────────────────────

function PortfolioTab() {
  const { data: items, isLoading } = useFreelancerPortfolio();
  const add = useAddPortfolioItem();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", url: "" });

  const onSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Vui lòng nhập tên dự án");
      return;
    }
    try {
      await add.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        url: form.url.trim() || undefined,
      });
      toast.success("Đã thêm portfolio");
      setForm({ title: "", description: "", url: "" });
      setAdding(false);
    } catch {
      toast.error("Lỗi khi thêm portfolio");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_6px_20px_rgba(55,65,120,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-slate-900">
            <Briefcase size={14} className="text-indigo-500" />
            Portfolio
          </h2>
          <p className="mt-1 text-[10px] text-slate-500">
            Trưng bày các dự án đã làm để nhà tuyển dụng tham khảo.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700"
          >
            <Plus size={10} /> Thêm dự án
          </button>
        )}
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/40 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Tên dự án *"
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://github.com/..."
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả ngắn (không bắt buộc)"
                rows={2}
                className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:col-span-2"
              />
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <button
                onClick={() => {
                  setAdding(false);
                  setForm({ title: "", description: "", url: "" });
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-white"
              >
                <X size={10} /> Hủy
              </button>
              <button
                onClick={onSubmit}
                disabled={add.isPending}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save size={10} /> Lưu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-8 text-center">
          <Briefcase size={20} className="mx-auto mb-2 text-slate-300" />
          <p className="text-[11px] font-bold text-slate-700">Chưa có portfolio</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Thêm dự án đầu tiên để nhà tuyển dụng thấy năng lực của bạn.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <div
              key={p.id}
              className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200 hover:shadow-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="line-clamp-1 text-[12px] font-extrabold text-slate-900">{p.title}</h3>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-slate-400 hover:text-indigo-600"
                    aria-label="Mở liên kết"
                  >
                    <LinkIcon size={11} />
                  </a>
                )}
              </div>
              {p.description && (
                <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                  {p.description}
                </p>
              )}
              {p.url && (
                <p className="mt-2 flex items-center gap-1 truncate font-mono text-[9px] text-slate-400">
                  <ExternalLink size={9} />
                  {p.url}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}