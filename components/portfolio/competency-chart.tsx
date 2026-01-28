"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface CompetencyData {
  name: string;
  current_level: string;
  numeric_level: number;
  evidence_count: number;
  career_impact: number;
}

interface CompetencyChartProps {
  competencies: CompetencyData[];
  className?: string;
}

const proficiencyLevels = {
  developing: 1,
  emerging: 2,
  proficient: 3,
  advanced: 4,
  expert: 5,
};

export function CompetencyChart({ competencies, className }: CompetencyChartProps) {
  // Prepare data for radar chart
  const chartData = competencies.map((comp) => ({
    competency: comp.name.length > 20 ? comp.name.substring(0, 20) + "..." : comp.name,
    fullName: comp.name,
    level: comp.numeric_level,
    maxLevel: 5,
    evidenceCount: comp.evidence_count,
  }));

  if (competencies.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Competency Progression</CardTitle>
          <CardDescription>Your skill development over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No competency data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Competency Progression</CardTitle>
        <CardDescription>
          Tracking {competencies.length} competenc{competencies.length === 1 ? "y" : "ies"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="competency"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Radar
                name="Level"
                dataKey="level"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-xl">
                        <div className="font-semibold mb-1">{data.fullName}</div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Level:</span>
                            <span className="font-medium">
                              {data.level}/5
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Evidence:</span>
                            <span className="font-medium">{data.evidenceCount} artifacts</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-6 space-y-2">
          <div className="text-sm font-medium">Proficiency Levels</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-300" />
              <span>Developing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-400" />
              <span>Emerging</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-400" />
              <span>Proficient</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-400" />
              <span>Advanced</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <span>Expert</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
