"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  CheckCircle2,
  Award,
  Flame,
  Star,
  Lightbulb,
  Trophy,
  Target,
} from "lucide-react";
import { format, isValid } from "date-fns";

interface Milestone {
  id: string;
  milestone_type:
    | "competency_level_up"
    | "plan_completed"
    | "task_streak"
    | "first_artifact"
    | "reflection_insight"
    | "external_validation"
    | "breakthrough_moment"
    | "skill_endorsed";
  title: string;
  description: string;
  achieved_at: string;
  icon: string;
  color: string;
  is_featured: boolean;
  related_artifact_title?: string;
  related_competency_name?: string;
}

interface GrowthTimelineProps {
  milestones: Milestone[];
  className?: string;
}

const milestoneIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  competency_level_up: TrendingUp,
  plan_completed: CheckCircle2,
  task_streak: Flame,
  first_artifact: Star,
  reflection_insight: Lightbulb,
  external_validation: Award,
  breakthrough_moment: Trophy,
  skill_endorsed: Target,
};

const milestoneColors: Record<string, string> = {
  competency_level_up: "bg-green-500",
  plan_completed: "bg-blue-500",
  task_streak: "bg-orange-500",
  first_artifact: "bg-amber-500",
  reflection_insight: "bg-purple-500",
  external_validation: "bg-pink-500",
  breakthrough_moment: "bg-red-500",
  skill_endorsed: "bg-cyan-500",
};

export function GrowthTimeline({ milestones, className }: GrowthTimelineProps) {
  if (milestones.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Growth Timeline</CardTitle>
          <CardDescription>Track your learning milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No milestones yet. Keep working to unlock achievements!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Growth Timeline</CardTitle>
        <CardDescription>
          {milestones.length} milestone{milestones.length === 1 ? "" : "s"} achieved
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

          {milestones.map((milestone, index) => {
            const Icon = milestoneIcons[milestone.milestone_type] || Trophy;
            const colorClass = milestoneColors[milestone.milestone_type] || "bg-gray-500";
            const achievedDate = new Date(milestone.achieved_at);
            const achievedLabel = isValid(achievedDate)
              ? format(achievedDate, "MMM d, yyyy 'at' h:mm a")
              : "Date pending";

            return (
              <div
                key={milestone.id ? `milestone-${milestone.id}` : `milestone-${milestone.milestone_type}-${index}`}
                className="relative flex gap-4 group"
              >
                {/* Icon circle */}
                <div className="relative flex-shrink-0">
                  <div
                    className={cn(
                      "rounded-full p-2 ring-4 ring-background z-10 relative",
                      colorClass,
                      milestone.is_featured && "ring-primary/20 shadow-lg"
                    )}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  {milestone.is_featured && (
                    <div className="absolute -inset-1 rounded-full bg-primary/20 animate-ping" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold leading-none">{milestone.title}</h4>
                        {milestone.is_featured && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          >
                            ⭐ Featured
                          </Badge>
                        )}
                      </div>
                      <time className="text-xs text-muted-foreground">
                        {achievedLabel}
                      </time>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>

                  {/* Related entities */}
                  {(milestone.related_artifact_title || milestone.related_competency_name) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {milestone.related_artifact_title && (
                        <Badge variant="outline" className="text-xs">
                          📄 {milestone.related_artifact_title}
                        </Badge>
                      )}
                      {milestone.related_competency_name && (
                        <Badge variant="outline" className="text-xs">
                          🎯 {milestone.related_competency_name}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
