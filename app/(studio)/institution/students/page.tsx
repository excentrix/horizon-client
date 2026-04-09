"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useInstitutionCohort } from "../_lib/useInstitutionCohort";
import { useInstitutionScope } from "../_lib/useInstitutionScope";
import { institutionsApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export default function InstitutionStudentsPage() {
  const router = useRouter();
  const { selectedOrgId, isSuperuser } = useInstitutionScope();
  const { cohorts, selectedCohort, setSelectedCohort, dashboard, loading } = useInstitutionCohort();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStudents = useMemo(() => {
    if (!dashboard) return [];
    if (!searchQuery) return dashboard.students;
    const lowerQ = searchQuery.toLowerCase();
    return dashboard.students.filter((s) => s.name.toLowerCase().includes(lowerQ) || s.email.toLowerCase().includes(lowerQ));
  }, [dashboard, searchQuery]);

  const handleExport = async () => {
    if (!selectedCohort) return;
    try {
      const response = await institutionsApi.exportCohortCSV(selectedCohort, { org: selectedOrgId || undefined });
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {isSuperuser && !selectedOrgId ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Select an institution from the Institution Scope selector to view student intelligence.
          </CardContent>
        </Card>
      ) : null}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Intelligence</h1>
          <p className="text-muted-foreground mt-1">Deep insights, risk detection, and next-best actions per student.</p>
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

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Student Intelligence</CardTitle>
              <CardDescription>Review progress, risk status, and recommended actions.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search students..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!selectedCohort}>
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground animate-pulse">Loading students...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Student</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Progress</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Trend</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Risk</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Risk Score</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Overdue</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Last Activity</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">Insight</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-muted-foreground">
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.user_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-secondary rounded-full h-2 min-w-[60px]">
                              <div className="bg-primary h-2 rounded-full" style={{ width: `${s.plan_progress}%` }} />
                            </div>
                            <span className="text-xs">{Math.round(s.plan_progress)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {s.engagement_trend === "up" ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                              <ArrowUpRight className="h-3 w-3 mr-1" />Up
                            </Badge>
                          ) : s.engagement_trend === "down" ? (
                            <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100">
                              <ArrowDownRight className="h-3 w-3 mr-1" />Down
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Minus className="h-3 w-3 mr-1" />Flat
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {s.risk_flags.length === 0 ? (
                            <Badge variant="outline" className="text-muted-foreground">On Track</Badge>
                          ) : (
                            <Badge variant="destructive">{s.risk_flags.length} Flag(s)</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium">{s.risk_score ?? 0}</td>
                        <td className="px-4 py-3 text-xs">{s.overdue_tasks ?? 0}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {s.last_activity ? new Date(s.last_activity).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">{s.insight_summary || s.next_best_action || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(selectedOrgId ? `/institution/students/${s.user_id}?org=${selectedOrgId}` : `/institution/students/${s.user_id}`)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
