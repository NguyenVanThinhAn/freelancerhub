import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
} from "recharts";

export interface RadarChartDatum {
  label: string;
  value: number;
  /** Tailwind-style hex used for the dot/stroke of that axis. */
  color: string;
}

export interface RadarChartProps {
  data: RadarChartDatum[];
  /** Max value for the radial scale (defaults to 100). */
  max?: number;
}

export function RadarChart({ data, max = 100 }: RadarChartProps) {
  const chartData = data.map((d) => ({ subject: d.label, value: d.value, fill: d.color }));
  const ticks = [0.25, 0.5, 0.75, 1].map((t) => Math.round(t * max));

  return (
    <div className="h-48 w-48">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#c7d2fe" strokeDasharray="2 3" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#64748b", fontSize: 9 }}
            tickLine={false}
            stroke="#cbd5f5"
          />
          <PolarRadiusAxis
            domain={[0, max]}
            tick={false}
            axisLine={false}
            tickCount={4}
            ticks={ticks}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.25}
            strokeWidth={1.5}
            dot={{ r: 3, fill: "#4f46e5", stroke: "#fff", strokeWidth: 1 }}
            isAnimationActive={false}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}