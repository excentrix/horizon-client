"use client";

import { useMemo } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from "recharts";
import { AlertTriangle, Activity, Users, Zap } from "lucide-react";
import { useInstitutionCohort } from "../_lib/useInstitutionCohort";
import { auditApi } from "@/lib/api";
import type { AuditInstitutionOverview } from "@/types";

const RISK_COLORS: Record<"low" | "medium" | "high", string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};

export default function InstitutionOverviewPage() {
  const { user } = useAuth();
  const { cohorts, selectedCohort, setSelectedCohort, dashboard, loading } = useInstitutionCohort();
  const [veloOverview, setVeloOverview] = useState<AuditInstitutionOverview | null>(null);

  useEffect(() => {
    const loadVeloOverview = async () => {
      try {
        const data = await auditApi.getInstitutionOverview();
        setVeloOverview(data);
      } catch {
        setVeloOverview(null);
      }
    };
    void loadVeloOverview();
  }, []);

  const studentCount = dashboard?.total_students ?? 0;

  const avgProgress = useMemo(() => {
    if (!dashboard || dashboard.total_students === 0) return 0;
    const total = dashboard.students.reduce((acc, s) => acc + s.plan_progress, 0);
    return Math.round(total / dashboard.total_students);
  }, [dashboard]);

  const atRiskCount = useMemo(() => {
    if (!dashboard) return 0;
    return dashboard.students.filter((s) => s.risk_flags.length > 0).length;
  }, [dashboard]);

  const inactiveOver7 = useMemo(() => {
    if (!dashboard) return 0;
    return dashboard.students.filter((s) => (s.days_inactive ?? 0) > 7).length;
  }, [dashboard]);

  const engagementDelta = useMemo(() => {
    if (!dashboard) return 0;
    return dashboard.students.reduce((acc, s) => acc + (s.engagement_last_7 - s.engagement_prev_7), 0);
  }, [dashboard]);

  const progressBuckets = useMemo(() => {
    if (!dashboard) return [] as { range: string; count: number }[];
    const buckets = [
      { range: "0-20%", count: 0 },
      { range: "21-40%", count: 0 },
      { range: "41-60%", count: 0 },
      { range: "61-80%", count: 0 },
      { range: "81-100%", count: 0 },
    ];
    dashboard.students.forEach((s) => {
      const p = s.plan_progress;
      if (p <= 20) buckets[0].count += 1;
      else if (p <= 40) buckets[1].count += 1;
      else if (p <= 60) buckets[2].count += 1;
      else if (p <= 80) buckets[3].count += 1;
      else buckets[4].count += 1;
    });
    return buckets;
  }, [dashboard]);

  const riskDistribution = useMemo(() => {
    if (!dashboard) return [] as { name: string; value: number; color: string }[];
    let noRisk = 0;
    let atRisk = 0;
    dashboard.students.forEach((student) => {
      if (student.risk_flags.length === 0) noRisk += 1;
      else atRisk += 1;
    });
    return [
      { name: "On Track", value: noRisk, color: "#10b981" },
      { name: "At Risk", value: atRisk, color: "#ef4444" },
    ];
  }, [dashboard]);

  const riskLevelMix = useMemo(() => {
    if (!dashboard) return [] as { level: string; count: number; fill: string }[];
    const counts = dashboard.students.reduce(
      (acc, student) => {
        acc[student.risk_level] += 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0 } as Record<"low" | "medium" | "high", number>
    );
    return [
      { level: "Low", count: counts.low, fill: RISK_COLORS.low },
      { level: "Medium", count: counts.medium, fill: RISK_COLORS.medium },
      { level: "High", count: counts.high, fill: RISK_COLORS.high },
    ];
  }, [dashboard]);

  const inactivityBuckets = useMemo(() => {
    if (!dashboard) return [] as { range: string; count: number }[];
    const buckets = [
      { range: "0-2 days", count: 0 },
      { range: "3-7 days", count: 0 },
      { range: "8-14 days", count: 0 },
      { range: "15+ days", count: 0 },
    ];
    dashboard.students.forEach((s) => {
      const days = s.days_inactive ?? 0;
      if (days <= 2) buckets[0].count += 1;
      else if (days <= 7) buckets[1].count += 1;
      else if (days <= 14) buckets[2].count += 1;
      else buckets[3].count += 1;
    });
    return buckets;
  }, [dashboard]);

  const engagementTrendMix = useMemo(() => {
    if (!dashboard) return [] as { trend: string; count: number }[];
    const counts = { up: 0, down: 0, flat: 0 };
    dashboard.students.forEach((s) => {
      counts[s.engagement_trend] += 1;
    });
    return [
      { trend: "Up", count: counts.up },
      { trend: "Flat", count: counts.flat },
      { trend: "Down", count: counts.down },
    ];
  }, [dashboard]);

  const skillGapBars = useMemo(() => {
    if (!dashboard) return [] as { gap: string; count: number }[];
    const counter = new Map<string, number>();
    dashboard.students.forEach((student) => {
      if (!student.top_skill_gap) return;
      counter.set(student.top_skill_gap, (counter.get(student.top_skill_gap) || 0) + 1);
    });
    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([gap, count]) => ({ gap, count }));
  }, [dashboard]);

  const scatterLow = useMemo(() => {
    if (!dashboard) return [] as { progress: number; engagement: number; name: string }[];
    return dashboard.students
      .filter((s) => s.risk_level === "low")
      .map((s) => ({ progress: s.plan_progress, engagement: s.engagement_last_7, name: s.name }));
  }, [dashboard]);

  const scatterMedium = useMemo(() => {
    if (!dashboard) return [] as { progress: number; engagement: number; name: string }[];
    return dashboard.students
      .filter((s) => s.risk_level === "medium")
      .map((s) => ({ progress: s.plan_progress, engagement: s.engagement_last_7, name: s.name }));
  }, [dashboard]);

  const scatterHigh = useMemo(() => {
    if (!dashboard) return [] as { progress: number; engagement: number; name: string }[];
    return dashboard.students
      .filter((s) => s.risk_level === "high")
      .map((s) => ({ progress: s.plan_progress, engagement: s.engagement_last_7, name: s.name }));
  }, [dashboard]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {user?.user_type === "admin" ? "Institution Admin" : "Educator Intelligence"}
          </h1>
          <p className="text-muted-foreground mt-1">
            High fidelity cohort diagnostics, risk breakdowns, and engagement signals.
          </p>
        </div>
        <Select value={selectedCohort || ""} onValueChange={setSelectedCohort}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select a cohort" />
          </SelectTrigger>
          <SelectContent>
            {cohorts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading || !dashboard ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Enrollment</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentCount}</div>
                <p className="text-xs text-muted-foreground">Active students in cohort</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">At-Risk</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{atRiskCount}</div>
                <p className="text-xs text-muted-foreground">Students with risk flags</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgProgress}%</div>
                <p className="text-xs text-muted-foreground">Plan completion average</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Engagement Delta</CardTitle>
                <Zap className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{engagementDelta >= 0 ? `+${engagementDelta}` : engagementDelta}</div>
                <p className="text-xs text-muted-foreground">7-day vs previous 7-day</p>
              </CardContent>
            </Card>
          </div>

          {veloOverview ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Verified Profile Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round((veloOverview.verified_profile_rate || 0) * 100)}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Career-Ready Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{veloOverview.career_ready_count}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg VELO Readiness</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round((veloOverview.avg_readiness_score || 0) * 100)}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Top VELO Skill Gap</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-semibold">
                    {veloOverview.top_skill_gaps[0]?.gap || "No gap data"}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Plan Progress Distribution</CardTitle>
                <CardDescription>Shows how many learners are clustered at each completion band.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progressBuckets}>
                    <XAxis dataKey="range" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Overview</CardTitle>
                <CardDescription>Quick split between on-track and at-risk learners.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskDistribution} innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value">
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`risk-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Mix</CardTitle>
                <CardDescription>Breakdown by low, medium, and high risk.</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskLevelMix} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="level" type="category" width={60} />
                    <Tooltip />
                    <Bar dataKey="count">
                      {riskLevelMix.map((entry) => (
                        <Cell key={entry.level} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Inactivity Buckets</CardTitle>
                <CardDescription>Who needs a check-in based on last activity.</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inactivityBuckets}>
                    <XAxis dataKey="range" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Engagement Trend Mix</CardTitle>
                <CardDescription>Is cohort momentum rising or fading?</CardDescription>
              </CardHeader>
              <CardContent className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagementTrendMix}>
                    <XAxis dataKey="trend" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement vs Progress</CardTitle>
                <CardDescription>Each dot is a student. High engagement + low progress needs curriculum review.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <XAxis type="number" dataKey="progress" unit="%" name="Progress" />
                    <YAxis type="number" dataKey="engagement" name="Engagement" />
                    <ZAxis range={[60, 60]} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Legend />
                    <Scatter name="Low Risk" data={scatterLow} fill={RISK_COLORS.low} />
                    <Scatter name="Medium Risk" data={scatterMedium} fill={RISK_COLORS.medium} />
                    <Scatter name="High Risk" data={scatterHigh} fill={RISK_COLORS.high} />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Skill Gaps</CardTitle>
                <CardDescription>Most frequent gaps that need targeted remediation.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                {skillGapBars.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No skill gap data available.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={skillGapBars} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis dataKey="gap" type="category" width={120} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 4, 4]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Actionable Focus</CardTitle>
              <CardDescription>Immediate cohort priorities for next mentor cycle.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {inactiveOver7 > 0 && (
                <Badge variant="destructive">{inactiveOver7} students inactive for 7+ days</Badge>
              )}
              {atRiskCount > 0 && (
                <Badge variant="secondary">{atRiskCount} students flagged for intervention</Badge>
              )}
              <Badge variant="outline">Average completion {avgProgress}%</Badge>
              <Badge variant="outline">Cohort momentum {engagementDelta >= 0 ? "up" : "down"}</Badge>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
