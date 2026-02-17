"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import type { TodayTask } from "@/types";
import { Calendar, Clock, ArrowRight, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { telemetry } from "@/lib/telemetry";
import { useMemo, useState } from "react";
import { format } from "date-fns";

interface TodayFocusCardProps {
  task: TodayTask | null | undefined;
  additionalTasks?: TodayTask[] | null;
  isLoading?: boolean;
}

export function TodayFocusCard({ task, additionalTasks, isLoading }: TodayFocusCardProps) {
  const router = useRouter();
  const [showMore, setShowMore] = useState(true);

  const groupedTasks = useMemo(() => {
    if (!additionalTasks || additionalTasks.length === 0) {
      return [];
    }
    const map = new Map<string, TodayTask[]>();
    for (const nextTask of additionalTasks) {
      const key = nextTask.plan_title || "Other plan";
      const list = map.get(key) ?? [];
      list.push(nextTask);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([planTitle, tasks]) => ({
      planTitle,
      tasks,
    }));
  }, [additionalTasks]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-10 w-32 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!task) {
    return (
      <Card className="h-full border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            No tasks scheduled for today
          </CardTitle>
          <CardDescription>You&apos;re all caught up. Ready to start something new?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Explore your learning plans to see what&apos;s coming up, or chat with a mentor to discover new learning paths.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push("/chat")} size="lg">
              <MessageSquare className="mr-2 h-4 w-4" />
              Create a Plan
            </Button>
            <Button onClick={() => router.push("/plans")} variant="outline" size="lg">
              <Calendar className="mr-2 h-4 w-4" />
              Go to Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTimeTagColor = () => {
    if (task.is_overdue) return "destructive";
    if (task.is_today) return "default";
    return "secondary";
  };

  const handleStartTask = () => {
    telemetry.track("task_started_from_dashboard", {
      task_id: task.id,
      plan_id: task.plan_id,
      is_overdue: task.is_overdue,
      is_today: task.is_today,
    });
    router.push(`/plans/${task.plan_id}/playground?task=${task.id}`);
  };

  return (
    <Card className="h-full bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">Today&apos;s Focus</CardTitle>
            <CardDescription>Recommended task to work on now</CardDescription>
          </div>
          <Badge variant={getTimeTagColor()} className="text-xs">
            {task.time_tag}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">{task.title}</h3>
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{task.plan_title}</span>
          </div>
          {task.scheduled_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(task.scheduled_date), "EEE, MMM d")}</span>
            </div>
          )}
          {task.estimated_duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{task.estimated_duration} min</span>
            </div>
          )}
        </div>

        <Button 
          onClick={handleStartTask}
          className="w-full sm:w-auto group"
          size="lg"
        >
          Start Now
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>

        {additionalTasks && additionalTasks.length > 0 && (
          <div className="space-y-2 rounded-lg border bg-background/70 p-3">
            <button
              type="button"
              onClick={() => setShowMore((prev) => !prev)}
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <span>Also on your plate</span>
              {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showMore && (
              <div className="space-y-3">
                {groupedTasks.map((group) => (
                  <div key={group.planTitle} className="space-y-2">
                    <div className="text-xs font-semibold text-foreground/80">
                      {group.planTitle}
                    </div>
                    <div className="space-y-2">
                      {group.tasks.map((nextTask) => (
                        <button
                          key={nextTask.id}
                          type="button"
                          onClick={() => router.push(`/plans/${nextTask.plan_id}`)}
                          className="flex w-full items-center justify-between gap-3 rounded-md border border-transparent bg-muted/40 px-3 py-2 text-left text-sm transition hover:border-primary/30 hover:bg-muted/60"
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{nextTask.title}</div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>{nextTask.time_tag}</span>
                              {nextTask.scheduled_date && (
                                <span>{format(new Date(nextTask.scheduled_date), "EEE, MMM d")}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{nextTask.plan_title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
