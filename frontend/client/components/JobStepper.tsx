import { Check, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export type JobStepperStage = number;

const DEFAULT_STEPS: { id: JobStepperStage; label: string }[] = [
  { id: 1, label: "Nhập nhu cầu" },
  { id: 2, label: "AI tạo JD" },
  { id: 3, label: "Chỉnh sửa & đăng" },
];

type Tone = "indigo" | "violet";

type StepPalette = {
  bgCurrent: string;
  bgDone: string;
  bgPending: string;
  text: string;
  textDone: string;
  badgeCurrent: string;
  badgeDone: string;
};

const PALETTE: Record<Tone, StepPalette> = {
  indigo: {
    bgCurrent: "#c7d2fe",  // indigo-200
    bgDone: "#e0e7ff",     // indigo-100
    bgPending: "#ffffff",   // white
    text: "text-indigo-700",
    textDone: "text-indigo-700",
    badgeCurrent: "bg-indigo-600",
    badgeDone: "bg-indigo-600",
  },
  violet: {
    bgCurrent: "#ddd6fe",   // violet-200
    bgDone: "#ede9fe",      // violet-100
    bgPending: "#ffffff",   // white
    text: "text-violet-700",
    textDone: "text-violet-700",
    badgeCurrent: "bg-violet-600",
    badgeDone: "bg-violet-600",
  },
};

const ARROW_SIZE = 15; // px — chiều rộng phần nhô ra (và notch lõm vào)
const STEP_H = 48;

// clip-path polygon values (dùng calc vì flex-1 width không cố định)
const clipFirst = `polygon(0 0, calc(100% - ${ARROW_SIZE}px) 0, 100% 50%, calc(100% - ${ARROW_SIZE}px) 100%, 0 100%)`;
const clipMiddle = `polygon(0 0, calc(100% - ${ARROW_SIZE}px) 0, 100% 50%, calc(100% - ${ARROW_SIZE}px) 100%, 0 100%, ${ARROW_SIZE}px 50%)`;
const clipLast = `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${ARROW_SIZE}px 50%)`;

type StepState = "done" | "current" | "pending";

const bgColor = (palette: StepPalette, state: StepState): string => {
  switch (state) {
    case "current": return palette.bgCurrent;
    case "done":    return palette.bgDone;
    default:        return palette.bgPending;
  }
};

export function JobStepper({
  current,
  tone = "indigo",
  steps,
}: {
  current: JobStepperStage;
  tone?: Tone;
  steps?: string[];
}) {
  const palette = PALETTE[tone];
  const stepList = (steps ?? DEFAULT_STEPS.map((s) => s.label)).map((label, i) => ({
    id: (i + 1) as JobStepperStage,
    label,
  }));
  const total = stepList.length;

  const getState = (id: JobStepperStage): StepState => {
    if (id < current) return "done";
    if (id === current) return "current";
    return "pending";
  };

  const getBgClass = (state: StepState): string => {
    switch (state) {
      case "current": return palette.bgCurrent === "#c7d2fe" ? "bg-indigo-200"
                          : palette.bgCurrent === "#ddd6fe" ? "bg-violet-200"
                          : "bg-white";
      case "done":    return palette.bgDone === "#e0e7ff" ? "bg-indigo-100"
                          : palette.bgDone === "#ede9fe" ? "bg-violet-100"
                          : "bg-white";
      default:        return "bg-white";
    }
  };

  const getTextClass = (state: StepState): string => {
    if (state === "current") return palette.text;
    if (state === "done") return palette.textDone;
    return "text-slate-400";
  };

  const getBadgeClass = (state: StepState): string => {
    if (state === "current") return palette.badgeCurrent;
    if (state === "done") return palette.badgeDone;
    return "bg-slate-200 text-slate-500";
  };

  const getIcon = (id: JobStepperStage, state: StepState): ReactNode => {
    if (state === "done") return <Check size={12} className="text-white" />;
    if (state === "current" && total >= 3 && id === 2) {
      return <Sparkles size={11} className="text-white" />;
    }
    return id;
  };

  return (
    <div
      className="relative mb-5 flex w-full items-stretch rounded-xl border border-slate-200 bg-white text-[10px] font-semibold shadow-sm"
      style={{ minHeight: STEP_H }}
    >
      {stepList.map((step, idx) => {
        const state = getState(step.id);
        const isFirst = idx === 0;
        const isLast = idx === total - 1;
        const clipPath = isFirst ? clipFirst : isLast ? clipLast : clipMiddle;

        return (
          <div
            key={step.id}
            className={[
              "relative flex flex-1 items-center justify-center gap-2 py-3",
              getBgClass(state),
              getTextClass(state),
              isFirst ? "pl-6 z-10" : "pl-6 pr-6",
              step.id === 3 && state !== "done" ? "hidden sm:flex" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              clipPath,
              marginLeft: isFirst ? 0 : `-${ARROW_SIZE}px`,
            }}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${getBadgeClass(state)}`}
            >
              {getIcon(step.id, state)}
            </span>
            <span>
              {step.id}. {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
