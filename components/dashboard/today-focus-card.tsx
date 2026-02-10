"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import type { TodayTask } from "@/types";
import { Calendar, Clock, ArrowRight, MessageSquare } from "lucide-react";
import { telemetry } from "@/lib/telemetry";

interface TodayFocusCardProps {
  task: TodayTask | null | undefined;
  isLoading?: boolean;
}

export function TodayFocusCard({ task, isLoading }: TodayFocusCardProps) {
  const router = useRouter();

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
            <span className="text-2xl">🎉</span>
            No tasks scheduled for today
          </CardTitle>
          <CardDescription>You&apos;re all caught up! Ready to start something new?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Explore your learning plans to see what&apos;s coming up, or chat with a mentor to discover new learning paths.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => router.push("/plans")} size="lg">
              <Calendar className="mr-2 h-4 w-4" />
              View Learning Plans
            </Button>
            <Button onClick={() => router.push("/chat")} variant="outline" size="lg">
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat with Mentor
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
    router.push(`/plans/${task.plan_id}`);
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
      </CardContent>
    </Card>
  );
}
