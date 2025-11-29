"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useInsightsFeed, useWellnessMonitoring } from "@/hooks/use-intelligence";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { telemetry } from "@/lib/telemetry";

const statusColors: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700",
  connecting: "bg-amber-100 text-amber-700",
  closed: "bg-muted text-muted-foreground",
  error: "bg-rose-100 text-rose-700",
  idle: "bg-muted text-muted-foreground",
};

export default function SignalsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

const { status, error, notifications, unreadCount, markNotificationRead } = useNotifications();

  const {
    data: insightsFeed,
    isLoading: insightsLoading,
    error: insightsError,
  } = useInsightsFeed({ limit: 20 });

  const {
    data: wellness,
    isLoading: wellnessLoading,
    error: wellnessError,
  } = useWellnessMonitoring({ alert_level: "all", include_history: true, days: 30 });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (insightsError) {
      telemetry.error("Signals insights error", { insightsError });
    }
    if (wellnessError) {
      telemetry.error("Signals wellness error", { wellnessError });
    }
  }, [insightsError, wellnessError]);

  const crisisAlerts = wellness?.crisis_alerts ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Signals & alerts</h1>
        <p className="text-sm text-muted-foreground">
          Real-time notifications, intelligence insights, and wellbeing pulse checks.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="flex min-h-0 flex-col">
          <CardHeader>
            <CardTitle>Notification stream</CardTitle>
            <CardDescription>
              Connection status: <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[status] ?? "bg-muted"}`}>{status}</span>
            </CardDescription>
            {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          </CardHeader>
          <CardContent className="flex min-h-0 flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{unreadCount} unread</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!notifications.length}
                onClick={() => notifications.forEach((notification) => markNotificationRead(notification.id))}
              >
                Mark all read
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {notifications.length ? (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-xl border bg-muted/30 p-3 text-sm shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markNotificationRead(notification.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                    {notification.action ? (
                      <p className="mt-2 text-xs text-primary">
                        {notification.action.text} → {notification.action.url}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No new notifications yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid min-h-0 gap-4">
          {wellnessLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : null}

          {wellness ? (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Wellness alerts</CardTitle>
                <CardDescription>Keep tabs on stress, mood, and crisis indicators</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Crisis alerts</h3>
                  {crisisAlerts.length ? (
                    <div className="space-y-2 text-xs text-muted-foreground">
                      {crisisAlerts.map((alert, index) => (
                        <div key={index} className="rounded-lg border bg-muted/30 p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{String(alert.title ?? "Alert")}</span>
                            {alert.priority ? <Badge variant="outline">{String(alert.priority)}</Badge> : null}
                          </div>
                          <p className="mt-1">{String(alert.message ?? "")}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No crisis alerts detected.</p>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Actionable support</h3>
                  {wellness.support_recommendations?.length ? (
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {wellness.support_recommendations.slice(0, 4).map((item, idx) => (
                        <li key={idx} className="rounded-lg border bg-muted/20 p-3">
                          <p className="font-semibold text-foreground">{String(item.title ?? "Recommendation")}</p>
                          <p>{String(item.description ?? "")}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No support recommendations at this time.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="min-h-0 flex flex-col">
            <CardHeader>
              <CardTitle>Latest insights</CardTitle>
              <CardDescription>Auto-generated recommendations from your intelligence layer</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto pr-1">
              {insightsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : null}
              {!insightsLoading && insightsFeed?.insights?.length ? (
                <div className="space-y-3 text-xs text-muted-foreground">
                  {insightsFeed.insights.map((insight) => (
                    <div key={insight.id} className="rounded-xl border bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{insight.title}</span>
                        <Badge variant="outline">{insight.urgency_level}</Badge>
                      </div>
                      <p className="mt-1">{insight.description}</p>
                      {insight.recommended_actions?.length ? (
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
                </div>
              ) : null}
              {!insightsLoading && !insightsFeed?.insights?.length ? (
                <p className="text-xs text-muted-foreground">
                  No new insights. Keep engaging with your mentor to generate fresh intelligence.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Domain distribution</CardTitle>
            <CardDescription>Insights by domain</CardDescription>
          </CardHeader>
          <CardContent>
            {insightsFeed?.domain_breakdown ? (
              <div className="space-y-2 text-xs text-muted-foreground">
                {Object.entries(insightsFeed.domain_breakdown).map(([domain, value]) => (
                  <div key={domain} className="flex justify-between">
                    <span className="font-medium text-foreground">{domain}</span>
                    <span>{typeof value === "number" ? value : JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No domain insights available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Urgency distribution</CardTitle>
            <CardDescription>Where to focus first</CardDescription>
          </CardHeader>
          <CardContent>
            {insightsFeed?.urgency_distribution ? (
              <div className="space-y-2 text-xs text-muted-foreground">
                {Object.entries(insightsFeed.urgency_distribution).map(([level, count]) => (
                  <div key={level} className="flex justify-between">
                    <span className="font-medium text-foreground">{level}</span>
                    <span>{String(count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No urgency data available.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
