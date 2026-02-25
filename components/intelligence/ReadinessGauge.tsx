"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, TrendingUp } from "lucide-react";

interface ReadinessGaugeProps {
  score: number; // 0.0 – 1.0
  careerStage?: { stage: string; completed_roadmap_levels?: number };
  className?: string;
}

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  student:  { label: "Student",   color: "bg-slate-400"  },
  junior:   { label: "Junior",    color: "bg-blue-500"   },
  mid:      { label: "Mid-level", color: "bg-violet-500" },
  senior:   { label: "Senior",    color: "bg-emerald-500"},
};

function describeScore(score: number): { label: string; color: string; tip: string } {
  if (score >= 0.85) return { label: "Job Ready",      color: "text-emerald-600", tip: "You're employer-ready. Start applying." };
  if (score >= 0.65) return { label: "Near Ready",     color: "text-violet-600",  tip: "Close! A few skills to strengthen." };
  if (score >= 0.40) return { label: "Building Up",    color: "text-amber-600",   tip: "Good progress. Keep completing levels." };
  return               { label: "Getting Started",  color: "text-slate-500",   tip: "Begin your roadmap to build verified skills." };
}

export function ReadinessGauge({ score, careerStage, className }: ReadinessGaugeProps) {
  const pct = Math.min(100, Math.round(score * 100));
  const { label, color, tip } = describeScore(score);

  // SVG semi-circle params
  const R = 80;
  const cx = 100;
  const cy = 95;
  const circumference = Math.PI * R; // half-circle arc length
  const dashOffset = circumference * (1 - score);

  const stage = careerStage?.stage ?? "student";
  const stageInfo = STAGE_LABELS[stage] ?? STAGE_LABELS.student;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-4 w-4 text-violet-600" />
          Career Readiness
        </CardTitle>
        <CardDescription>How ready you are for the job market</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {/* Gauge SVG */}
        <div className="relative">
          <svg width="200" height="110" viewBox="0 0 200 110" aria-label={`Career readiness ${pct}%`}>
            {/* Track */}
            <path
              d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Fill */}
            <path
              d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            {/* Score text */}
            <text x={cx} y={cy - 8} textAnchor="middle" className="fill-slate-900 dark:fill-white" fontSize="28" fontWeight="700">
              {pct}%
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="11">
              {label}
            </text>
          </svg>
        </div>

        {/* Labels */}
        <p className={`text-sm font-medium ${color}`}>{tip}</p>

        {/* Stage badge */}
        {careerStage && (
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Career stage:</span>
            <span className={`rounded-full px-3 py-0.5 text-xs font-semibold text-white ${stageInfo.color}`}>
              {stageInfo.label}
            </span>
            {(careerStage.completed_roadmap_levels ?? 0) > 0 && (
              <Badge variant="outline" className="text-xs">
                {careerStage.completed_roadmap_levels} level{careerStage.completed_roadmap_levels === 1 ? "" : "s"} done
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
