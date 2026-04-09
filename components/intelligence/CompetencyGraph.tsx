"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";

interface CompetencyPoint {
  name: string;
  competency_type: string;
  proficiency_level: string;
  numeric_level: number;   // 1–5
  evidence_count: number;
}

interface CompetencyGraphProps {
  competencies: CompetencyPoint[];
  className?: string;
}

const LEVEL_COLORS: Record<string, string> = {
  developing: "bg-slate-400",
  emerging:   "bg-blue-400",
  proficient: "bg-violet-400",
  advanced:   "bg-emerald-400",
  expert:     "bg-amber-400",
};

const TYPE_COLORS: Record<string, string> = {
  technical:       "border-blue-400 text-blue-700 bg-blue-50",
  soft:            "border-violet-400 text-violet-700 bg-violet-50",
  professional:    "border-emerald-400 text-emerald-700 bg-emerald-50",
  academic:        "border-amber-400 text-amber-700 bg-amber-50",
  career_readiness:"border-rose-400 text-rose-700 bg-rose-50",
};

export function CompetencyGraph({ competencies, className }: CompetencyGraphProps) {
  const chartData = competencies.map((c) => ({
    subject: c.name.length > 18 ? c.name.slice(0, 18) + "…" : c.name,
    fullName: c.name,
    level: c.numeric_level,
    rawLevel: c.proficiency_level,
    evidence: c.evidence_count,
    type: c.competency_type,
  }));

  if (!competencies.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-violet-600" />
            Competency Mirror
          </CardTitle>
          <CardDescription>Have a few conversations to start building your skill map.</CardDescription>
        </CardHeader>
        <CardContent className="flex h-48 items-center justify-center text-muted-foreground text-sm">
          No competency data yet
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-4 w-4 text-violet-600" />
          Competency Mirror
        </CardTitle>
        <CardDescription>
          {competencies.length} skill{competencies.length === 1 ? "" : "s"} mapped by your mentor
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Radar chart */}
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Radar
                name="Level"
                dataKey="level"
                stroke="#7c3aed"
                fill="#7c3aed"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-xl text-sm">
                      <p className="mb-1 font-semibold">{d.fullName}</p>
                      <p className="text-muted-foreground">
                        Level:{" "}
                        <span className="font-medium capitalize text-foreground">
                          {d.rawLevel} ({d.level}/5)
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Evidence:{" "}
                        <span className="font-medium text-foreground">{d.evidence} artifact{d.evidence === 1 ? "" : "s"}</span>
                      </p>
                    </div>
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Competency badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          {competencies.slice(0, 12).map((c) => (
            <span
              key={c.name}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                TYPE_COLORS[c.competency_type] ?? "border-slate-300 text-slate-600 bg-slate-50"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${LEVEL_COLORS[c.proficiency_level] ?? "bg-slate-300"}`} />
              {c.name}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-5 gap-1 text-xs text-muted-foreground">
          {Object.entries(LEVEL_COLORS).map(([level, color]) => (
            <div key={level} className="flex items-center gap-1 capitalize">
              <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
              {level}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
