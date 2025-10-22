"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LearningPlan } from "@/types";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface PlanListProps {
  plans: LearningPlan[];
  selectedPlanId?: string | null;
  onSelect: (planId: string) => void;
}

export function PlanList({ plans, selectedPlanId, onSelect }: PlanListProps) {
  if (!plans.length) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        No plans yet. Ask your mentor to create one when you’re ready.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map((plan) => {
        const isSelected = plan.id === selectedPlanId;
        return (
          <Card
            key={plan.id}
            className={cn(
              "cursor-pointer transition",
              isSelected
                ? "border-primary ring-2 ring-primary/20"
                : "hover:border-primary/50",
            )}
            onClick={() => onSelect(plan.id)}
          >
            <CardHeader className="space-y-2">
              <CardTitle className="flex items-start justify-between text-base">
                <span>{plan.title}</span>
                <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                  {plan.status}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {plan.plan_type} · {plan.estimated_duration_weeks} weeks · {plan.difficulty_level}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <p className="line-clamp-2 text-muted-foreground">{plan.description}</p>
              <Progress value={plan.progress_percentage} />
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Progress</span>
                <span>{plan.progress_percentage}%</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
