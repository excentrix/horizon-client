"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  ZapOff,
  Clock,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanMutations } from "@/hooks/use-plans";
import { planningApi } from "@/lib/api";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { LearningPlan, DailyTask } from "@/types";

interface PlanScheduleViewProps {
  plan: LearningPlan;
  tasks: DailyTask[];
}

function TaskItem({ task, isOverlay = false }: { task: DailyTask, isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: task
  });

  const statusColors = {
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    in_progress: "bg-blue-50 text-blue-700 border-blue-200/50",
    scheduled: "bg-slate-50 text-slate-700 border-slate-200",
    skipped: "bg-slate-50 text-slate-400 border-slate-100",
    rescheduled: "bg-violet-50 text-violet-700 border-violet-200/50",
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative flex cursor-grab flex-col gap-1 rounded-lg border p-2 text-[10px] leading-tight transition-all active:cursor-grabbing",
        statusColors[task.status as keyof typeof statusColors] || "bg-secondary",
        isDragging && !isOverlay && "opacity-20",
        isOverlay && "shadow-xl scale-105 rotate-2 z-50 ring-2 ring-primary/20",
        task.task_type === "review" && "border-orange-200 bg-orange-50/50"
      )}
    >
      <div className="flex items-center justify-between font-bold">
        <span className="truncate pr-1">{task.title}</span>
        {task.task_type === "review" && <Zap className="h-2.5 w-2.5 shrink-0 text-orange-500 fill-orange-500" />}
      </div>
      {task.environment_requirements?.user_competency_level ? (
        <span className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-700">
          Tailored
        </span>
      ) : null}
      <div className="flex items-center gap-1 opacity-60 font-medium">
        <Clock className="h-2.5 w-2.5" />
        <span>{task.estimated_duration_minutes}m</span>
      </div>
    </div>
  );
}

function DayCell({ date, tasks, isCurrentMonth }: { date: Date, tasks: DailyTask[], isCurrentMonth: boolean }) {
  const dateStr = format(date, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    data: { date }
  });

  const isToday = isSameDay(date, new Date());

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[140px] border-r border-b p-2 transition-colors flex flex-col gap-1.5",
        !isCurrentMonth && "bg-slate-50/30 text-slate-400",
        isOver && "bg-primary/5",
        isToday && "bg-primary/[0.02]"
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span className={cn(
            "text-[11px] font-bold tracking-tight",
            isToday && "text-primary",
            !isCurrentMonth && "opacity-50"
        )}>
          {format(date, "d")}
        </span>
        {isToday && <div className="h-1 w-1 rounded-full bg-primary" />}
      </div>
      <div className="flex flex-col gap-1.5">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

export function PlanScheduleView({ plan, tasks }: PlanScheduleViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTask, setActiveTask] = useState<DailyTask | null>(null);
  const { rescheduleTask, activateExamMode, deactivateExamMode } = usePlanMutations(plan.id);
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // --- Google Calendar connection status ---
  const { data: gcalStatus } = useQuery({
    queryKey: ["gcal-status"],
    queryFn: () => planningApi.getGoogleCalendarStatus(),
    staleTime: 60_000, // cache for 60s
  });
  const isGcalConnected = gcalStatus?.connected ?? false;

  // Sync mutation — calls backend which either syncs or returns auth_url
  const syncGcal = useMutation({
    mutationFn: () => planningApi.syncGoogleCalendar(plan.id),
    onSuccess: (data) => {
      if (!data.connected) {
        // Not connected — trigger Supabase OAuth to get Calendar scopes
        toast.info("Connecting Google Calendar", {
          description: "Redirecting to Google to grant calendar access...",
        });
        
        import("@/lib/supabase/client").then(({ supabase }) => {
            supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback?gcal=connected`,
                    scopes: 'https://www.googleapis.com/auth/calendar',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });
        });
      } else if (data.success) {
        toast.success("Synced to Google Calendar!", {
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: ["gcal-status"] });
      } else if (data.error) {
        toast.error("Sync failed", { description: data.error });
      }
    },
    onError: (e) => toast.error("Could not reach the server. Is the backend running?", { description: e.message }),
  });

  // Auto-sync after returning from OAuth redirect
  useEffect(() => {
    if (!isMounted) return;
    if (searchParams.get("gcal") === "connected") {
      queryClient.invalidateQueries({ queryKey: ["gcal-status"] });
      syncGcal.mutate();
    }
  }, [isMounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const tasksByDate = useMemo(() => {
    const map = tasks.reduce((acc, task) => {
      try {
        const dateKey = format(parseISO(task.scheduled_date as unknown as string), "yyyy-MM-dd");
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(task);
      } catch {
        console.error("Failed to parse date", task.scheduled_date);
      }
      return acc;
    }, {} as Record<string, DailyTask[]>);
    // Sort each day's tasks by curriculum sequence_order
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
    }
    return map;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(event.active.data.current as DailyTask);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { over, active } = event;

    if (over && active.id) {
      const taskId = active.id as string;
      const newDate = over.id as string;
      const taskData = active.data.current as DailyTask;
      const oldDate = format(parseISO(taskData.scheduled_date as unknown as string), "yyyy-MM-dd");

      if (newDate === oldDate) return;

      // Enforce curriculum sequence: prevent dragging a task before the preceding
      // task or after the following task in sequence_order.
      const sorted = [...tasks].sort(
        (a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0)
      );
      const idx = sorted.findIndex((t) => t.id === taskId);
      const prev = idx > 0 ? sorted[idx - 1] : null;
      const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;

      if (prev && newDate < prev.scheduled_date) {
        toast.error(
          `"${taskData.title}" must stay after "${prev.title}" — tasks follow the learning sequence.`
        );
        return;
      }
      if (next && newDate > next.scheduled_date) {
        toast.error(
          `"${taskData.title}" must stay before "${next.title}" — tasks follow the learning sequence.`
        );
        return;
      }

      rescheduleTask.mutate({ taskId, scheduled_date: newDate });
      toast.info(`Moving "${taskData.title}" to ${format(parseISO(newDate), "MMM do")}`);
    }
  };

  // Construct absolute iCal subscription URL.
  // NEXT_PUBLIC_API_URL already includes "/api", so we strip that suffix.
  const rawApiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
  const serverBase = rawApiBase.replace(/\/api\/?$/, "");
  const icalLink = `${serverBase}/api/planning/plans/${plan.id}/calendar/`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(icalLink);
    toast.success("Calendar feed URL copied!", {
      description: "Paste this link into Google Calendar or Apple Calendar subscription settings."
    });
  };

  // Google Calendar button label / icon
  const gcalButton = isGcalConnected ? (
    <Button
      variant="outline"
      size="sm"
      className="h-9 rounded-full border-green-200 bg-green-50 text-[11px] font-bold text-green-700 hover:bg-green-100"
      onClick={() => syncGcal.mutate()}
      disabled={syncGcal.isPending}
    >
      {syncGcal.isPending
        ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
        : <CheckCircle2 className="mr-2 h-3.5 w-3.5" />}
      Sync to Google Calendar
    </Button>
  ) : (
    <Button
      variant="outline"
      size="sm"
      className="h-9 rounded-full border-blue-200 bg-blue-50 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
      onClick={() => syncGcal.mutate()}
      disabled={syncGcal.isPending}
    >
      {syncGcal.isPending
        ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
        : <CalendarDays className="mr-2 h-3.5 w-3.5" />}
      Connect Google Calendar
    </Button>
  );

  const handleActivateExam = () => {
    const date = prompt("When is your exam? (YYYY-MM-DD)", format(new Date(), "yyyy-MM-dd"));
    if (!date) return;
    const topic = prompt("What is the main exam topic?", plan.title);
    if (!topic) return;

    activateExamMode.mutate({ exam_date: date, exam_topic: topic });
  };

  if (!isMounted) {
    return (
      <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed bg-white/50 p-12 text-sm text-muted-foreground backdrop-blur">
        Loading schedule hub...
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Header / Controls */}
      <div className="flex flex-col justify-between gap-4 rounded-[28px] border border-white/80 bg-white/60 p-4 shadow-[var(--shadow-1)] backdrop-blur sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-slate-100/50 p-1">
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="min-w-[120px] text-center text-xs font-bold uppercase tracking-wider">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 rounded-full px-4 text-xs font-semibold"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            {plan.is_exam_mode ? (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 rounded-full border-orange-200 bg-orange-50 text-[11px] font-bold text-orange-700 hover:bg-orange-100"
                    onClick={() => deactivateExamMode.mutate()}
                    disabled={deactivateExamMode.isPending}
                >
                    <ZapOff className="mr-2 h-3.5 w-3.5" />
                    Disable Exam Mode
                </Button>
            ) : (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 rounded-full border-primary/20 bg-white text-[11px] font-bold text-primary hover:bg-primary/5"
                    onClick={handleActivateExam}
                    disabled={activateExamMode.isPending}
                >
                    <Zap className="mr-2 h-3.5 w-3.5" />
                    Activate Exam Mode
                </Button>
            )}
            
            {/* iCal subscription link */}
            <Button 
                variant="secondary" 
                size="sm" 
                className="h-9 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
                onClick={handleCopyLink}
            >
                <CalendarDays className="mr-2 h-3.5 w-3.5" />
                Copy iCal Link
            </Button>

            {/* Google Calendar sync */}
            {gcalButton}
        </div>
      </div>

      {/* Calendar Grid */}
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[var(--shadow-2)] backdrop-blur flex flex-col">
          <div className="grid grid-cols-7 border-b bg-slate-50/50">
            {dayLabels.map(label => (
              <div key={label} className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-7 overflow-y-auto overscroll-contain">
            {calendarDays.map(day => {
              const dateStr = format(day, "yyyy-MM-dd");
              return (
                <DayCell 
                  key={dateStr} 
                  date={day} 
                  isCurrentMonth={isSameMonth(day, monthStart)} 
                  tasks={tasksByDate[dateStr] || []} 
                />
              );
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
                styles: {
                    active: {
                        opacity: "0.5",
                    },
                },
            }),
        }}>
          {activeTask ? <TaskItem task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
      
      {/* Footer Info */}
      <div className="flex items-center gap-4 px-4 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-orange-200" />
            <span>Review tasks</span>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-100" />
            <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-100" />
            <span>In progress</span>
        </div>
        <div className="ml-auto italic">
            Tip: Drag tasks to reschedule them instantly.
        </div>
      </div>
    </div>
  );
}
