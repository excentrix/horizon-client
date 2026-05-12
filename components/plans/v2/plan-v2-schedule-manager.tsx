"use client";

import { useMemo, useState } from "react";
import { addDays, eachDayOfInterval, endOfWeek, format, isSameDay, parseISO, startOfDay, startOfWeek } from "date-fns";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DailyTask } from "@/types";

interface PlanV2ScheduleManagerProps {
  planId: string;
  tasks: DailyTask[];
  isUpdating?: boolean;
  onQuickReschedule: (taskId: string, date: string) => void;
  className?: string;
}

type ViewMode = "day" | "week";

export function PlanV2ScheduleManager({
  planId,
  tasks,
  isUpdating,
  onQuickReschedule,
  className,
}: PlanV2ScheduleManagerProps) {
  const [mode, setMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const selected = useMemo(() => parseISO(selectedDate), [selectedDate]);
  const selectedStart = startOfDay(selected);

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((task) => isSameDay(parseISO(task.scheduled_date), selectedStart))
        .sort((a, b) => (a.scheduled_time ?? "23:59").localeCompare(b.scheduled_time ?? "23:59")),
    [selectedStart, tasks],
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedStart, { weekStartsOn: 1 });
    const end = endOfWeek(selectedStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedStart]);

  const weekly = useMemo(() => {
    return weekDays.map((day) => {
      const dayTasks = tasks.filter((task) => isSameDay(parseISO(task.scheduled_date), day));
      return {
        day,
        tasks: dayTasks,
      };
    });
  }, [tasks, weekDays]);

  return (
    <section className={`rounded-3xl border border-black/10 bg-white/80 p-4 shadow-[var(--shadow-1)] ${className ?? ""}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-[#5858CC]" />
          <h3 className="text-sm font-semibold text-[#414141]">Schedule Manager</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={mode === "day" ? "default" : "outline"}
            className={
              mode === "day"
                ? "h-7 rounded-full bg-[#5858CC] px-2.5 text-xs text-white hover:bg-[#4d4db3]"
                : "h-7 rounded-full border-black/15 px-2.5 text-xs"
            }
            onClick={() => setMode("day")}
          >
            Day
          </Button>
          <Button
            size="sm"
            variant={mode === "week" ? "default" : "outline"}
            className={
              mode === "week"
                ? "h-7 rounded-full bg-[#5858CC] px-2.5 text-xs text-white hover:bg-[#4d4db3]"
                : "h-7 rounded-full border-black/15 px-2.5 text-xs"
            }
            onClick={() => setMode("week")}
          >
            Week
          </Button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-2xl border border-black/10 bg-[#FAEDCD]/45 p-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-7 w-7 rounded-full border-black/15"
          onClick={() => setSelectedDate(format(addDays(selectedStart, -1), "yyyy-MM-dd"))}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="h-8 border-black/15 bg-white text-xs"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-7 w-7 rounded-full border-black/15"
          onClick={() => setSelectedDate(format(addDays(selectedStart, 1), "yyyy-MM-dd"))}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div>
        {mode === "day" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white/80 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#414141]/75">
                {format(selectedStart, "EEEE, MMM d")}
              </p>
              <Badge className="rounded-full border border-black/15 bg-white text-[10px] text-[#414141]">
                {todayTasks.length} tasks
              </Badge>
            </div>

            {todayTasks.length ? (
              todayTasks.map((task) => {
                const tomorrow = format(addDays(selectedStart, 1), "yyyy-MM-dd");
                return (
                  <article key={task.id} className="rounded-xl border border-black/10 bg-white/85 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium text-[#414141]">{task.title}</p>
                      <Badge className="rounded-full border border-black/15 bg-[#FAEDCD] text-[10px] text-[#414141]">
                        {task.scheduled_time ?? "Anytime"}
                      </Badge>
                    </div>
                    <p className="mb-2 text-xs text-[#414141]/70">{task.description}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button asChild size="sm" className="h-7 rounded-full bg-[#5858CC] px-3 text-xs text-white hover:bg-[#4d4db3]">
                        <Link href={`/plans/${planId}/playground?task=${task.id}`}>
                          <PlayCircle className="mr-1 h-3.5 w-3.5" />
                          Open
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-full border-black/15 px-2.5 text-xs"
                        onClick={() => onQuickReschedule(task.id, tomorrow)}
                        disabled={isUpdating}
                      >
                        Move to tomorrow
                      </Button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded-xl border border-dashed border-black/15 bg-white/70 px-3 py-2 text-xs text-[#414141]/70">
                No tasks for this day.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#414141]/70">
              <CalendarRange className="h-3.5 w-3.5" />
              Week snapshot
            </div>
            {weekly.map(({ day, tasks: dayTasks }) => (
              <div key={day.toISOString()} className="rounded-xl border border-black/10 bg-white/85 p-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#414141]">{format(day, "EEE, MMM d")}</p>
                  <Badge className="rounded-full border border-black/15 bg-white text-[10px] text-[#414141]">
                    {dayTasks.length}
                  </Badge>
                </div>
                {dayTasks.length ? (
                  <ul className="space-y-1">
                    {dayTasks.slice(0, 2).map((task) => (
                      <li key={task.id} className="truncate text-xs text-[#414141]/75">
                        • {task.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#414141]/55">No scheduled tasks</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
