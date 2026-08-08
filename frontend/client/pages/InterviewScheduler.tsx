import { useState } from "react";
import { BriefcaseBusiness, CalendarDays, Check, ChevronLeft, ChevronRight, FileText, Mail, MapPin, Plus, UsersRound, Video, X, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BusinessShell } from "@/layout/BusinessShell";
import { useProposal } from "@/hooks/use-proposals";
import { useCreateInterview, useInterviews } from "@/hooks/use-interviews";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// Helper để render các ngày tiếp theo
const getNextDays = (count: number) => {
  const days = [];
  const date = new Date();
  const dayNames = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  for (let i = 0; i < count; i++) {
    days.push({
      label: `${dayNames[date.getDay()]}\n${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`,
      dateStr: date.toISOString().split("T")[0]
    });
    date.setDate(date.getDate() + 1);
  }
  return days;
};
const upcomingDays = getNextDays(14);
const times = ["09:00", "10:30", "14:00", "15:30", "16:30", "17:30"];

export default function InterviewScheduler() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const { data: proposal, isLoading } = useProposal(id);
  const { data: existingInterviews } = useInterviews(id);
  const createInterview = useCreateInterview();

  const [time, setTime] = useState("14:00");
  const [interviewType, setInterviewType] = useState(0);
  const [dayIndex, setDayIndex] = useState(1);
  const [platformIndex, setPlatformIndex] = useState(0);
  const [note, setNote] = useState("");

  if (isLoading || !proposal) {
    return (
      <BusinessShell active="Phỏng vấn">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </BusinessShell>
    );
  }

  const freelancer = proposal.freelancer;
  const types = ["Video call", "Phỏng vấn trực tiếp", "Vòng HR", "Vòng chuyên môn"];
  const platforms = ["Google Meet", "Zoom", "Offline"];

  const sendInvite = () => {
    const dateObj = new Date(`${upcomingDays[dayIndex].dateStr}T${time}:00`);
    createInterview.mutate({
      proposal_id: proposal.id,
      interview_type: types[interviewType],
      start_time: dateObj.toISOString(),
      duration_minutes: 60,
      platform: platforms[platformIndex],
      meet_link: platforms[platformIndex] !== "Offline" ? "https://meet.google.com/abc-xyz" : undefined,
      note: note || `Xin chào ${freelancer?.display_name},\n\nCảm ơn bạn đã dành thời gian giúp quá trình ứng tuyển vị trí. Chúng tôi rất mong muốn có cơ hội trao đổi thêm.`
    }, {
      onSuccess: () => {
        navigate(`/candidate-detail/${proposal.id}`);
      }
    });
  };

  return (
    <BusinessShell active="Phỏng vấn">
      <div className="mb-4 flex items-center gap-2 text-[10px] text-slate-400">
        <button onClick={() => navigate(`/candidate-detail/${proposal.id}`)} className="hover:text-indigo-600">Hồ sơ ứng viên</button>
        <ChevronRight size={12} />
        {freelancer?.display_name}
        <ChevronRight size={12} />
        <span className="font-semibold text-indigo-600">Mời phỏng vấn</span>
      </div>
      
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight">Mời phỏng vấn {freelancer?.display_name}</h1>
          <p className="mt-1 text-xs text-slate-500">{freelancer?.headline}</p>
        </div>
        <button onClick={() => navigate(`/candidate-detail/${proposal.id}`)} className="text-[10px] font-bold text-indigo-600">Quay lại hồ sơ</button>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-xs font-extrabold">1. Chọn loại phỏng vấn</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              {[
                { label: types[0], Icon: Video },
                { label: types[1], Icon: BriefcaseBusiness },
                { label: types[2], Icon: UsersRound },
                { label: types[3], Icon: FileText }
              ].map(({ label, Icon }, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setInterviewType(i)}
                  className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-[10px] font-semibold ${
                    i === interviewType ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">2. Chọn ngày phỏng vấn</h2>
              <CalendarDays size={15} className="text-slate-500" />
            </div>
            <div className="mt-3 flex items-center gap-1 overflow-x-auto">
              <button className="rounded-lg p-2 text-slate-400" type="button" onClick={() => setDayIndex((d) => Math.max(0, d - 1))}>
                <ChevronLeft size={14} />
              </button>
              {upcomingDays.slice(0, 7).map((day, i) => (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setDayIndex(i)}
                  className={`min-w-[72px] rounded-lg border px-2 py-2 text-center text-[9px] font-semibold whitespace-pre-line ${
                    i === dayIndex ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  {day.label}
                </button>
              ))}
              <button className="rounded-lg p-2 text-slate-400" type="button" onClick={() => setDayIndex((d) => Math.min(upcomingDays.length - 1, d + 1))}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-xs font-extrabold">3. Chọn khung giờ</h2>
            <p className="mt-1 text-[9px] text-slate-400">Múi giờ: Asia/Ho Chi Minh (GMT+7)</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {times.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setTime(slot)}
                  className={`h-9 rounded-lg border text-[10px] font-bold ${
                    slot === time ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-xs font-extrabold">4. Chọn nền tảng họp</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {[
                { label: platforms[0], Icon: Video },
                { label: platforms[1], Icon: Video },
                { label: platforms[2], Icon: MapPin }
              ].map(({ label, Icon }, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPlatformIndex(i)}
                  className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-[10px] font-semibold ${
                    i === platformIndex ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold">5. Nội dung lời mời <span className="font-normal text-slate-400">(có thể chỉnh sửa)</span></h2>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Xin chào ${freelancer?.display_name},\n\nCảm ơn bạn đã tham gia ứng tuyển...`}
              className="mt-3 h-36 w-full resize-none rounded-lg border border-slate-200 p-3 text-[10px] leading-5 outline-none focus:border-indigo-300"
            />
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-extrabold">Tóm tắt lịch mời</h2>
            <div className="mt-4 space-y-3 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Ứng viên</span>
                <b>{freelancer?.display_name}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Vòng phỏng vấn</span>
                <b>{types[interviewType]}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ngày phỏng vấn</span>
                <b className="whitespace-pre-line text-right">{upcomingDays[dayIndex].label.replace('\n', ' ')}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thời gian</span>
                <b>{time}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nền tảng</span>
                <b className="text-indigo-600">{platforms[platformIndex]}</b>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-extrabold">Checklist trước khi gửi</h2>
            <div className="mt-3 space-y-2 text-[10px] text-slate-600">
              {["Đã chọn đúng ngày giờ", "Nội dung đầy đủ", "Đúng loại phỏng vấn"].map((item) => (
                <p key={item}><Check size={13} className="mr-1 inline text-emerald-500" />{item}</p>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={sendInvite}
            disabled={createInterview.isPending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-xs font-bold text-white shadow-lg shadow-indigo-200 disabled:opacity-70"
          >
            {createInterview.isPending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
            {createInterview.isPending ? "Đang xử lý..." : "Gửi lời mời phỏng vấn"}
          </button>
        </aside>
      </div>
    </BusinessShell>
  );
}
