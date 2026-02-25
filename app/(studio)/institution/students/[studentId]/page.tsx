"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { institutionsApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, ShieldCheck, Target } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type StudentInsight = {
  user_id: string;
  email: string;
  name: string;
  plan_progress: number;
  plan_title?: string | null;
  plan_status?: string | null;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  last_task_completed_at?: string | null;
  days_inactive?: number | null;
  last_activity: string | null;
  engagement_trend: "up" | "down" | "flat";
  engagement_last_7: number;
  engagement_prev_7: number;
  risk_flags: string[];
  risk_level: "low" | "medium" | "high";
  top_skill_gap?: string | null;
  next_best_action?: string | null;
  engagement_series?: { date: string; value: number }[];
  completion_series?: { date: string; value: number }[];
};

export default function StudentInsightPage() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<StudentInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [interventions, setInterventions] = useState<
    { id: string; action_type: string; status: string; notes?: string; created_at: string; created_by_name?: string }[]
  >([]);
  const seriesData = useMemo(() => {
    const engagement = student?.engagement_series ?? [];
    const completion = student?.completion_series ?? [];
    if (!engagement.length && !completion.length) return [];
    const map = new Map<string, { date: string; engagement: number; completed: number }>();
    engagement.forEach((item) => {
      map.set(item.date, { date: item.date, engagement: item.value, completed: 0 });
    });
    completion.forEach((item) => {
      const existing = map.get(item.date) ?? { date: item.date, engagement: 0, completed: 0 };
      existing.completed = item.value;
      map.set(item.date, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [student?.completion_series, student?.engagement_series]);

  useEffect(() => {
    if (!params.studentId) return;
    setLoading(true);
    institutionsApi.studentInsight(params.studentId)
      .then((data) => setStudent(data))
      .catch((err) => telemetry.error("Failed to load student insight", { err }))
      .finally(() => setLoading(false));
  }, [params.studentId]);

  useEffect(() => {
    if (!params.studentId) return;
    institutionsApi.listStudentInterventions(params.studentId)
      .then((data) => setInterventions(data))
      .catch((err) => telemetry.error("Failed to load interventions", { err }));
  }, [params.studentId]);

  const handleIntervention = async (action: "check_in" | "schedule_1on1" | "assign_remediation") => {
    if (!params.studentId) return;
    try {
      const created = await institutionsApi.createStudentIntervention(params.studentId, {
        action_type: action,
        notes,
      });
      setInterventions((prev) => [created, ...prev]);
      setNotes("");
      telemetry.toastSuccess("Intervention queued");
    } catch (err) {
      telemetry.toastError("Failed to queue intervention");
      telemetry.error("Intervention create failed", { err });
    }
  };

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading student insight...</div>;
  }

  if (!student) {
    return <div className="p-6 text-muted-foreground">Student insight not found.</div>;
  }

  const riskLabel = (student.risk_level ?? "low").toUpperCase();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/institution/students")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Cohort
        </Button>
      </div>

      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-sm text-muted-foreground">{student.email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {student.plan_title ?? "No active plan"} · {student.plan_status ?? "—"}
          </p>
        </div>
        <Badge variant={student.risk_level === "high" ? "destructive" : student.risk_level === "medium" ? "secondary" : "outline"}>
          {riskLabel} RISK
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(student.completion_rate)}%</div>
            <p className="text-xs text-muted-foreground">
              {student.completed_tasks}/{student.total_tasks} tasks
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactivity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{student.days_inactive ?? 0} days</div>
            <p className="text-xs text-muted-foreground">
              Last active {student.last_activity ? new Date(student.last_activity).toLocaleDateString() : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{student.engagement_last_7}</div>
            <p className="text-xs text-muted-foreground">
              Last 7d vs prev: {student.engagement_prev_7}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Risk Flags</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {student.risk_flags.length ? (
              student.risk_flags.map((flag) => (
                <Badge key={flag} variant="destructive">{flag.replace("_", " ")}</Badge>
              ))
            ) : (
              <Badge variant="outline">No risk flags</Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Next Best Action</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {student.next_best_action ?? "No intervention needed."}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Skill Gap Focus</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {student.top_skill_gap ?? "No gap detected yet."}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Interventions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Add context or notes for this intervention..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleIntervention("check_in")}>
              Send Check-in
            </Button>
            <Button variant="outline" onClick={() => handleIntervention("schedule_1on1")}>
              Schedule 1:1
            </Button>
            <Button variant="outline" onClick={() => handleIntervention("assign_remediation")}>
              Assign Remediation
            </Button>
          </div>
          <div className="space-y-3">
            {interventions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No interventions yet.</p>
            ) : (
              interventions.map((intervention) => (
                <div key={intervention.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{intervention.action_type.replace("_", " ")}</span>
                    <Badge variant="outline">{intervention.status}</Badge>
                  </div>
                  {intervention.notes && (
                    <p className="text-xs text-muted-foreground mt-2">{intervention.notes}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {intervention.created_by_name ?? "Educator"} · {new Date(intervention.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Engagement & Completion Trends</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px]">
          {seriesData.length === 0 ? (
            <div className="text-sm text-muted-foreground">Not enough data for trends.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesData}>
                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="engagement" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
