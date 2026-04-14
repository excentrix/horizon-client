"use client";

import { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const DUMMY_SKILLS = [
  { subject: "Architecture", A: 85, fullMark: 100 },
  { subject: "Syntax", A: 95, fullMark: 100 },
  { subject: "Debugging", A: 90, fullMark: 100 },
  { subject: "Testing", A: 60, fullMark: 100 },
  { subject: "Deployment", A: 70, fullMark: 100 },
  { subject: "Algorithms", A: 75, fullMark: 100 },
];

interface SkillRadarChartProps {
  className?: string;
}

export function SkillRadarChart({ className = "" }: SkillRadarChartProps) {
  // Use a stable ID for gradient to avoid hydration issues if multiple instances
  const gradientId = useMemo(() => "radar-gradient", []);

  return (
    <div
      className={`relative rounded-2xl border border-border/80 bg-[color:var(--surface)] p-4 shadow-sm flex flex-col ${className}`}
    >
      <div className="mb-2 shrink-0">
        <p className="font-display text-base">Skill Diagnostics</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Baseline capability distribution
        </p>
      </div>

      <div className="min-h-[240px] flex-1 -mx-4 -mb-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={DUMMY_SKILLS}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--brand-indigo)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--brand-indigo)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <PolarGrid className="stroke-border/50 text-border" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{
                fill: "hsl(var(--foreground))",
                fontSize: 10,
                fontFamily: "var(--font-mono-ui)",
                opacity: 0.8,
              }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "var(--font-mono-ui)",
              }}
              itemStyle={{ color: "var(--brand-indigo)" }}
            />
            <Radar
              name="Proficiency"
              dataKey="A"
              stroke="var(--brand-indigo)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              fillOpacity={0.6}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
