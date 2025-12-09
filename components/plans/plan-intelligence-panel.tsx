"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LearningPlan } from "@/types";

interface PlanIntelligencePanelProps {
  plan: LearningPlan;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  return value
    .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
    .filter(Boolean);
};

const formatPercent = (value: number, fractionDigits = 0) =>
  `${(value * 100).toFixed(fractionDigits)}%`;

export function PlanIntelligencePanel({ plan }: PlanIntelligencePanelProps) {
  const resources = asStringArray(plan.available_resources_snapshot) ?? [];
  const industryTrends = Object.entries(asRecord(plan.current_industry_trends) ?? {});
  const competencies = asStringArray(plan.target_competencies_data) ?? [];
  const dailySummary = asRecord(plan.daily_tasks_summary);
  const progressSummary = asRecord(plan.progress_summary);

  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">Plan intelligence</CardTitle>
        <CardDescription className="text-xs">
          Auto-generated context the mentor uses to personalize guidance.
        </CardDescription>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{(plan.plan_type || "Standard").replace(/_/g, " ")}</Badge>
          <Badge variant="outline">
            Confidence {formatPercent(plan.ai_confidence_score ?? 0.0, 0)}
          </Badge>
          {plan.industry_standards_validated ? (
            <Badge variant="outline">Standards aligned</Badge>
          ) : null}
          {plan.primary_domain_name ? (
            <Badge variant="outline">{plan.primary_domain_name}</Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs text-muted-foreground">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Blueprint</h3>
          <ul className="space-y-1">
            <li>
              Generation method:{" "}
              <span className="text-foreground">{plan.plan_generation_method}</span>
            </li>
            <li>
              Duration:{" "}
              <span className="text-foreground">
                {plan.estimated_duration_weeks} weeks · {plan.total_estimated_hours} hrs
              </span>
            </li>
            <li>
              Difficulty: <span className="text-foreground">{plan.difficulty_level}</span>
            </li>
          </ul>
        </section>

        {resources.length ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Resources captured</h3>
            <ul className="space-y-1">
              {resources.slice(0, 4).map((item, index) => (
                <li key={`${item}-${index}`} className="rounded border bg-muted/40 px-2 py-1">
                  {item}
                </li>
              ))}
            </ul>
            {resources.length > 4 ? (
              <p>+ {resources.length - 4} more saved for later</p>
            ) : null}
          </section>
        ) : null}

        {industryTrends.length ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Industry signals</h3>
            <ul className="space-y-1">
              {industryTrends.slice(0, 4).map(([key, value]) => (
                <li key={key} className="rounded border bg-muted/40 px-2 py-1">
                  <span className="font-medium text-foreground">{key.replace(/_/g, " ")}:</span>{" "}
                  <span>
                    {typeof value === "string" ? value : JSON.stringify(value, null, 0)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {competencies.length ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Competencies</h3>
            <ul className="space-y-1">
              {competencies.slice(0, 4).map((competency, index) => (
                <li key={`${competency}-${index}`} className="rounded border bg-muted/40 px-2 py-1">
                  {competency}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {dailySummary ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Daily cadence</h3>
            <pre className="max-h-36 overflow-y-auto rounded bg-muted/30 p-2 text-[11px] leading-tight">
              {JSON.stringify(dailySummary, null, 2)}
            </pre>
          </section>
        ) : null}

        {progressSummary ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Progress heuristics</h3>
            <pre className="max-h-36 overflow-y-auto rounded bg-muted/30 p-2 text-[11px] leading-tight">
              {JSON.stringify(progressSummary, null, 2)}
            </pre>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}
