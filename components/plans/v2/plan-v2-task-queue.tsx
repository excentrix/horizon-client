"use client";

import { useMemo, useState } from "react";
import { CircleCheckBig, Milestone, Play, Search, SkipForward } from "lucide-react";
import Link from "next/link";
import { addDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import type { DailyTask, LearningPlan } from "@/types";
import { formatTaskDate, statusLabel, statusTone } from "./utils";

interface PlanV2TaskQueueProps {
  planId: string;
  tasks: DailyTask[];
  milestones?: LearningPlan["milestones"];
  isUpdating?: boolean;
  onStartTask: (taskId: string) => void;
  onSetStatus: (taskId: string, status: DailyTask["status"]) => void;
  onQuickReschedule: (taskId: string, date: string) => void;
  className?: string;
}

type QueueSort = "date" | "duration" | "status";

interface MilestoneGroup {
  id: string;
  title: string;
  tasks: DailyTask[];
}

const INITIAL_LIMIT = 5;

function getMilestoneKey(task: DailyTask) {
  return task.milestone_id || task.milestone_title || "general";
}

function getMilestoneTitle(task: DailyTask) {
  return task.milestone_title || (task.milestone_id ? `Milestone ${task.milestone_id}` : "General tasks");
}

export function PlanV2TaskQueue({
  planId,
  tasks,
  milestones,
  isUpdating,
  onStartTask,
  onSetStatus,
  onQuickReschedule,
  className,
}: PlanV2TaskQueueProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<QueueSort>("date");
  const [limits, setLimits] = useState<Record<string, number>>({});

  const openTasks = useMemo(
    () => tasks.filter((task) => task.status !== "completed"),
    [tasks],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const bySearch = normalizedQuery
      ? openTasks.filter(
          (task) =>
            task.title.toLowerCase().includes(normalizedQuery) ||
            task.description.toLowerCase().includes(normalizedQuery) ||
            (task.milestone_title ?? "").toLowerCase().includes(normalizedQuery),
        )
      : openTasks;

    return [...bySearch].sort((a, b) => {
      if (sortBy === "duration") {
        return b.estimated_duration_minutes - a.estimated_duration_minutes;
      }
      if (sortBy === "status") {
        return a.status.localeCompare(b.status);
      }
      return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
    });
  }, [openTasks, query, sortBy]);

  const milestoneGroups = useMemo<MilestoneGroup[]>(() => {
    const groupMap = new Map<string, MilestoneGroup>();

    filtered.forEach((task) => {
      const key = getMilestoneKey(task);
      const existing = groupMap.get(key);
      if (existing) {
        existing.tasks.push(task);
        return;
      }
      groupMap.set(key, {
        id: key,
        title: getMilestoneTitle(task),
        tasks: [task],
      });
    });

    const ordered = Array.from(groupMap.values());
    const milestoneOrder = new Map<string, number>();
    (milestones ?? []).forEach((milestone, index) => {
      if (milestone.milestone_id) {
        milestoneOrder.set(milestone.milestone_id, index);
      }
      if (milestone.title) {
        milestoneOrder.set(milestone.title, index);
      }
    });

    return ordered.sort((a, b) => {
      if (a.id === "general") return 1;
      if (b.id === "general") return -1;

      const aOrder = milestoneOrder.get(a.id) ?? milestoneOrder.get(a.title);
      const bOrder = milestoneOrder.get(b.id) ?? milestoneOrder.get(b.title);

      if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;

      const aEarliest = Math.min(
        ...a.tasks.map((task) => new Date(task.scheduled_date).getTime()),
      );
      const bEarliest = Math.min(
        ...b.tasks.map((task) => new Date(task.scheduled_date).getTime()),
      );
      return aEarliest - bEarliest;
    });
  }, [filtered, milestones]);

  return (
    <section className={`rounded-3xl border border-black/10 bg-white/80 p-4 shadow-[var(--shadow-1)] ${className ?? ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#414141]">Task Queue</h3>
        <Badge variant="outline" className="rounded-full border-black/15 bg-white text-[10px] uppercase tracking-[0.12em]">
          {filtered.length} open
        </Badge>
      </div>

      <div className="mb-3 grid gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#414141]/50" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks or milestones..."
            className="h-9 rounded-full border-black/15 bg-white pl-8 text-sm"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-[#414141]/60">Sort</span>
          {(["date", "duration", "status"] as const).map((sortKey) => (
            <Button
              key={sortKey}
              type="button"
              size="sm"
              variant={sortBy === sortKey ? "default" : "outline"}
              className={
                sortBy === sortKey
                  ? "h-7 rounded-full bg-[#EC5B13] px-2.5 text-xs text-white hover:bg-[#d45110]"
                  : "h-7 rounded-full border-black/15 px-2.5 text-xs"
              }
              onClick={() => setSortBy(sortKey)}
            >
              {sortKey}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {milestoneGroups.length ? (
          milestoneGroups.map((group) => {
            const limit = limits[group.id] ?? INITIAL_LIMIT;
            const visibleTasks = group.tasks.slice(0, limit);

            return (
              <Collapsible key={group.id} defaultOpen className="rounded-2xl border border-black/10 bg-[#FAEDCD]/35">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left">
                  <div className="flex items-center gap-2 text-[#414141]">
                    <Milestone className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">{group.title}</span>
                  </div>
                  <Badge className="rounded-full border border-black/15 bg-white text-[10px] text-[#414141]">
                    {group.tasks.length}
                  </Badge>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="space-y-2 px-3 pb-3">
                    {visibleTasks.map((task) => {
                      const quickDate = format(addDays(new Date(task.scheduled_date), 1), "yyyy-MM-dd");
                      return (
                        <article key={task.id} className="rounded-xl border border-black/10 bg-white/85 p-3">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div>
                              <p className="line-clamp-1 text-sm font-medium text-[#414141]">{task.title}</p>
                              <p className="text-xs text-[#414141]/70">
                                {formatTaskDate(task)} · {task.estimated_duration_minutes}m
                              </p>
                            </div>
                            <Badge className={`rounded-full border text-[10px] ${statusTone(task.status)}`}>
                              {statusLabel(task.status)}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 rounded-full bg-[#5858CC] px-3 text-xs text-white hover:bg-[#4d4db3]"
                              onClick={() => onStartTask(task.id)}
                              disabled={isUpdating}
                            >
                              <Play className="mr-1 h-3.5 w-3.5" />
                              Start
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-full border-black/15 px-2.5 text-xs"
                              onClick={() => onSetStatus(task.id, "completed")}
                              disabled={isUpdating}
                            >
                              <CircleCheckBig className="mr-1 h-3.5 w-3.5" />
                              Done
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-full border-black/15 px-2.5 text-xs"
                              onClick={() => onQuickReschedule(task.id, quickDate)}
                              disabled={isUpdating}
                            >
                              <SkipForward className="mr-1 h-3.5 w-3.5" />
                              Tomorrow
                            </Button>
                            <Button asChild size="sm" variant="ghost" className="h-7 rounded-full px-2 text-xs text-[#414141]/80 hover:bg-black/5">
                              <Link href={`/plans/${planId}/playground?task=${task.id}`}>Open</Link>
                            </Button>
                          </div>
                        </article>
                      );
                    })}

                    {group.tasks.length > limit ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-full border-black/15 px-3 text-xs"
                        onClick={() =>
                          setLimits((prev) => ({
                            ...prev,
                            [group.id]: limit + INITIAL_LIMIT,
                          }))
                        }
                      >
                        Load more
                      </Button>
                    ) : null}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed border-black/15 bg-white/70 px-3 py-2 text-xs text-[#414141]/70">
            No open tasks in this plan.
          </p>
        )}
      </div>
    </section>
  );
}
