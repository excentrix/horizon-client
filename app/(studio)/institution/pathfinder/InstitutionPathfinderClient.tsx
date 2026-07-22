"use client";

import { useEffect, useState } from "react";
import { pathfinderApi } from "@/lib/api";
import { useInstitutionScope } from "../_lib/useInstitutionScope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Compass } from "lucide-react";

type Overview = Awaited<ReturnType<typeof pathfinderApi.institutionOverview>>;
type StudentRows = Awaited<ReturnType<typeof pathfinderApi.institutionStudents>>["students"];

const STATUS_LABEL: Record<StudentRows[number]["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  report_ready: "Report ready",
};

const STATUS_VARIANT: Record<StudentRows[number]["status"], "secondary" | "outline" | "default"> = {
  not_started: "secondary",
  in_progress: "outline",
  report_ready: "default",
};

export default function InstitutionPathfinderClient() {
  const { selectedOrgId } = useInstitutionScope();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [students, setStudents] = useState<StudentRows>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = { org: selectedOrgId || undefined };
    Promise.all([
      pathfinderApi.institutionOverview(params),
      pathfinderApi.institutionStudents(params),
    ])
      .then(([overviewData, studentsData]) => {
        setOverview(overviewData);
        setStudents(studentsData.students);
      })
      .catch(() => setError("Pathfinder isn't enabled for this organization, or the data couldn't load."))
      .finally(() => setLoading(false));
  }, [selectedOrgId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-muted-foreground">
        <Compass className="mx-auto mb-3 h-8 w-8" />
        <p>{error ?? "No Pathfinder data yet."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Students in this school</CardDescription>
            <CardTitle className="text-2xl">{overview.total_students}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Started / completed</CardDescription>
            <CardTitle className="text-2xl">{overview.started_count} / {overview.completed_count}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fit-vs-aspiration gaps flagged</CardDescription>
            <CardTitle className="text-2xl">{overview.fit_gap_flagged_count}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Portfolio-ready rate</CardDescription>
            <CardTitle className="text-2xl">{Math.round(overview.portfolio_ready_rate * 100)}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aspiration clusters</CardTitle>
          <CardDescription>What students say they want, ranked by frequency</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {overview.aspiration_clusters.length === 0 && (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          )}
          {overview.aspiration_clusters.map((c) => (
            <Badge key={c.career} variant="secondary">
              {c.career} · {c.count}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {overview.institutional_recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Institutional recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-2 text-sm">
              {overview.institutional_recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Students</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Student</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Stated aspiration</th>
                <th className="py-2 pr-4">Top match</th>
                <th className="py-2 pr-4">Score</th>
                <th className="py-2 pr-4">Evidence shared</th>
                <th className="py-2 pr-4">Generated</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.user_id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    <div>{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                  </td>
                  <td className="py-2 pr-4">{s.stated_aspiration ?? "—"}</td>
                  <td className="py-2 pr-4">{s.top_match ?? "—"}</td>
                  <td className="py-2 pr-4">{s.top_match_score ?? "—"}</td>
                  <td className="py-2 pr-4">{s.evidence_count}</td>
                  <td className="py-2 pr-4">{s.generated_at ? new Date(s.generated_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
