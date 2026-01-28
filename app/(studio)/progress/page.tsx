"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  useMultiDomainDashboard,
  useInsightsFeed,
  useWellnessMonitoring,
  useComprehensiveProgressReport,
} from "@/hooks/use-intelligence";
import { usePortfolioArtifacts } from "@/hooks/use-portfolio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { telemetry } from "@/lib/telemetry";

const formatPercent = (value?: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }
  return `${Math.round(value * 100)}%`;
};

const renderListFromObject = (data?: Record<string, unknown>, limit = 5) => {
  if (!data || !Object.keys(data).length) {
    return <p className="text-xs text-muted-foreground">No data available.</p>;
  }

  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {Object.entries(data)
        .slice(0, limit)
        .map(([key, value]) => (
          <li key={key} className="flex items-start gap-2">
            <span className="font-medium text-foreground">{key.replace(/_/g, " ")}</span>
            <span className="text-muted-foreground">
              {typeof value === "object" && value !== null
                ? JSON.stringify(value)
                : String(value)}
            </span>
          </li>
        ))}
    </ul>
  );
};

const renderListFromArray = (
  items?: Array<Record<string, unknown> | string>,
  limit = 5,
) => {
  if (!items || !items.length) {
    return <p className="text-xs text-muted-foreground">No items available.</p>;
  }

  return (
    <ul className="space-y-2 text-xs text-muted-foreground">
      {items.slice(0, limit).map((item, index) => (
        <li key={index} className="rounded-lg border bg-muted/30 p-2">
          {typeof item === "string" ? (
            <span>{item}</span>
          ) : (
            <div className="space-y-1">
              {Object.entries(item).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="font-medium text-foreground">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span>
                    {typeof value === "object" && value !== null
                      ? JSON.stringify(value)
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};

export default function ProgressPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const {
    data: dashboard,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useMultiDomainDashboard();

  const {
    data: wellness,
    isLoading: wellnessLoading,
    error: wellnessError,
  } = useWellnessMonitoring({ alert_level: "all", include_history: false, days: 30 });

  const {
    data: insightsFeed,
    isLoading: insightsLoading,
    error: insightsError,
  } = useInsightsFeed({ limit: 10 });

  const {
    data: progressReport,
    isLoading: progressReportLoading,
    error: progressReportError,
  } = useComprehensiveProgressReport({ format: "summary" });

  const {
    data: artifacts,
    isLoading: artifactsLoading,
    error: artifactsError,
  } = usePortfolioArtifacts();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (dashboardError) {
      telemetry.error("Dashboard fetch error", { dashboardError });
      toast.error("We couldn't load your dashboard data.");
    }
    if (wellnessError) {
      telemetry.error("Wellness fetch error", { wellnessError });
    }
    if (insightsError) {
      telemetry.error("Insights feed error", { insightsError });
    }
    if (progressReportError) {
      telemetry.error("Progress report error", { progressReportError });
    }
    if (artifactsError) {
      telemetry.error("Portfolio fetch error", { artifactsError });
    }
  }, [dashboardError, wellnessError, insightsError, progressReportError, artifactsError]);

  const isLoading =
    dashboardLoading ||
    wellnessLoading ||
    insightsLoading ||
    progressReportLoading ||
    artifactsLoading;

  const domainScores = useMemo(() => {
    if (!dashboard) {
      return [] as Array<{ domain: string; score: number }>;
    }

    const academicScore =
      (dashboard.academic_overview?.progress_score as number | undefined) ??
      (dashboard.academic_overview?.performance_score as number | undefined);
    const careerScore =
      (dashboard.career_overview?.progress_score as number | undefined) ??
      (dashboard.career_overview?.career_readiness_score as number | undefined);
    const wellnessScore =
      (dashboard.wellness_overview?.stability_score as number | undefined) ??
      (dashboard.wellness_overview?.wellness_score as number | undefined);

    return [
      { domain: "Academic", score: academicScore ?? 0 },
      { domain: "Career", score: careerScore ?? 0 },
      { domain: "Wellness", score: wellnessScore ?? 0 },
    ];
  }, [dashboard]);

  const insights = insightsFeed?.insights ?? [];
  const crisisAlerts = wellness?.crisis_alerts ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Progress mural</h1>
        <p className="text-sm text-muted-foreground">
          Track your academic, career, and wellness journey in one adaptive hub.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {dashboard ? (
        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Overall progress</CardTitle>
              <CardDescription>Your composite growth score</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-semibold">
                  {formatPercent(dashboard.overall_progress_score)}
                </span>
                <Badge variant="secondary">Balance {formatPercent(dashboard.domain_balance_score)}</Badge>
              </div>
              <Progress value={Math.min(dashboard.overall_progress_score * 100, 100)} />
              <p className="text-xs text-muted-foreground">
                Generated {new Date(dashboard.generated_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wellness risk</CardTitle>
              <CardDescription>Safeguard your wellbeing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge
                className="w-fit"
                variant={dashboard.wellness_risk_level === "low" ? "secondary" : "destructive"}
              >
                {dashboard.wellness_risk_level ?? "unknown"}
              </Badge>
              {renderListFromObject(dashboard.wellness_trends)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Urgent alerts</CardTitle>
              <CardDescription>Signals that need your attention</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.urgent_alerts && dashboard.urgent_alerts.length ? (
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {dashboard.urgent_alerts.slice(0, 3).map((alert, idx) => (
                    <li key={idx} className="rounded-lg border bg-muted/30 p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {(alert.title as string) ?? "Alert"}
                        </span>
                        {alert.priority ? <Badge variant="outline">{String(alert.priority)}</Badge> : null}
                      </div>
                      <p>{String(alert.message ?? "")}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No urgent alerts 🎉</p>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {dashboard ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Domain pulse</CardTitle>
              <CardDescription>Academic, career, and wellness trajectories</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {domainScores.map((item) => (
                <div key={item.domain} className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm font-semibold text-foreground">{item.domain}</p>
                  <p className="text-2xl font-semibold">
                    {typeof item.score === "number" ? formatPercent(item.score) : "—"}
                  </p>
                  <Separator className="my-2" />
                  {item.domain === "Academic"
                    ? renderListFromObject(dashboard.academic_overview)
                    : item.domain === "Career"
                    ? renderListFromObject(dashboard.career_overview)
                    : renderListFromObject(dashboard.wellness_overview)}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {progressReport ? (
          <Card>
            <CardHeader>
              <CardTitle>Executive highlights</CardTitle>
              <CardDescription>
                Summary for {progressReport.period_start} → {progressReport.period_end}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              {renderListFromObject(progressReport.executive_summary, 6)}
              <Separator className="my-3" />
              <p className="text-foreground">Strengths</p>
              {renderListFromArray(progressReport.strengths_and_achievements, 3)}
              <Separator className="my-3" />
              <p className="text-foreground">Focus areas</p>
              {renderListFromArray(progressReport.areas_for_improvement, 3)}
            </CardContent>
          </Card>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {wellness ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Wellness watch</CardTitle>
              <CardDescription>
                Crisis alerts and support recommendations tailored to you
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Alerts</h3>
                {renderListFromArray(crisisAlerts, 4)}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Support recommendations</h3>
                {renderListFromArray(wellness.support_recommendations, 4)}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {insights.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Recent insights</CardTitle>
              <CardDescription>Generated by your intelligence crew</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              {insights.slice(0, 5).map((insight) => (
                <div key={insight.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{insight.title}</span>
                    <Badge>
                      {insight.urgency_level}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{insight.description}</p>
                  {insight.recommended_actions && insight.recommended_actions.length ? (
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      {insight.recommended_actions.slice(0, 3).map((action, idx) => (
                        <li key={idx}>
                          {typeof action === "string" ? action : JSON.stringify(action)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Trophy room</CardTitle>
            <CardDescription>Verified artifacts you can showcase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            {artifacts && artifacts.length ? (
              artifacts.slice(0, 6).map((artifact) => (
                <div key={artifact.id} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {artifact.title}
                    </span>
                    <Badge variant={artifact.status === "verified" ? "default" : "secondary"}>
                      {artifact.status}
                    </Badge>
                  </div>
                  {artifact.description ? (
                    <p className="mt-1 text-muted-foreground">{artifact.description}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{artifact.artifact_type.replace(/_/g, " ")}</Badge>
                    {artifact.url ? (
                      <a
                        href={artifact.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        View artifact
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p>No artifacts yet. Proof submissions will surface here.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Portfolio cues</CardTitle>
            <CardDescription>What helps you build a strong showcase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>Save proof of work from each task you complete.</p>
            <p>Link real demos, repos, or written reflections.</p>
            <p>Verified artifacts earn higher visibility later.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
