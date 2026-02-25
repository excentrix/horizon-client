"use client";

import { useEffect, useMemo, useState } from "react";
import { institutionsApi, CohortReport } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import { useInstitutionCohort } from "../_lib/useInstitutionCohort";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const RISK_COLORS = ["#10b981", "#ef4444"];

export default function InstitutionReportsPage() {
  const { cohorts, selectedCohort, setSelectedCohort } = useInstitutionCohort({ withDashboard: false });
  const [report, setReport] = useState<CohortReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedCohort) return;
    setLoading(true);
    institutionsApi
      .getCohortReport(selectedCohort)
      .then((data) => setReport(data))
      .catch((err) => telemetry.error("Failed to load cohort report", { err }))
      .finally(() => setLoading(false));
  }, [selectedCohort]);

  const riskPie = useMemo(() => {
    if (!report) return [] as { name: string; value: number }[];
    return [
      { name: "On Track", value: report.risk_distribution.on_track },
      { name: "At Risk", value: report.risk_distribution.at_risk },
    ];
  }, [report]);

  const riskLevelBars = useMemo(() => {
    if (!report) return [] as { level: string; count: number }[];
    return [
      { level: "Low", count: report.risk_levels.low },
      { level: "Medium", count: report.risk_levels.medium },
      { level: "High", count: report.risk_levels.high },
    ];
  }, [report]);

  const handleExportCohort = async () => {
    if (!selectedCohort) return;
    try {
      const response = await institutionsApi.exportCohortCSV(selectedCohort);
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cohort_${selectedCohort}_export.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      telemetry.error("Failed to export cohort", { err });
    }
  };

  const handleExportReport = () => {
    if (!report) return;
    const lines = [
      ["metric", "value"],
      ["total_students", String(report.total_students)],
      ["avg_progress", String(report.avg_progress)],
      ["engagement_delta", String(report.engagement_delta)],
      ["on_track", String(report.risk_distribution.on_track)],
      ["at_risk", String(report.risk_distribution.at_risk)],
    ];
    report.progress_buckets.forEach((b) => lines.push([`progress_${b.range}`, String(b.count)]));
    report.inactivity_buckets.forEach((b) => lines.push([`inactive_${b.range}`, String(b.count)]));
    report.top_skill_gaps.forEach((g) => lines.push([`gap_${g.gap}`, String(g.count)]));
    const csv = lines.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cohort_${report.cohort_id}_report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Exports</h1>
          <p className="text-muted-foreground mt-1">Download cohort performance reports and key risk signals.</p>
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

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleExportCohort} disabled={!selectedCohort}>Export Student CSV</Button>
        <Button variant="outline" onClick={handleExportReport} disabled={!report}>Export Cohort Report CSV</Button>
      </div>

      {loading || !report ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">Loading report...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.total_students}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Avg Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.avg_progress}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Engagement Delta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.engagement_delta >= 0 ? `+${report.engagement_delta}` : report.engagement_delta}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">At-Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{report.risk_distribution.at_risk}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Overview</CardTitle>
                <CardDescription>On-track vs at-risk students.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskPie} dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={4}>
                      {riskPie.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Risk Levels</CardTitle>
                <CardDescription>Low, medium, and high risk distribution.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskLevelBars} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="level" type="category" width={70} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f97316" radius={[4, 4, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress Distribution</CardTitle>
                <CardDescription>Where students sit in completion bands.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.progress_buckets}>
                    <XAxis dataKey="range" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inactivity Buckets</CardTitle>
                <CardDescription>Who needs immediate nudges.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.inactivity_buckets}>
                    <XAxis dataKey="range" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Skill Gaps</CardTitle>
              <CardDescription>Priority gaps to address in the next cycle.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {report.top_skill_gaps.length === 0 ? (
                <Badge variant="outline">No skill gaps detected</Badge>
              ) : (
                report.top_skill_gaps.map((gap) => (
                  <Badge key={gap.gap} variant="secondary">{gap.gap} · {gap.count}</Badge>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
