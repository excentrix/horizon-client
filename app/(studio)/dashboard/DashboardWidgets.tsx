"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, Github, Linkedin, 
  CheckCircle2, Circle, Flame, 
  Target, Zap, ChevronDown, ChevronUp,
  BrainCircuit, FileText, Loader2, AlertTriangle,
  Sparkles, CheckCheck, Battery, Smile, Coffee
} from "lucide-react";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import type { StageStreamEvent } from "@/lib/analysis-stage";

const SHELL = "rounded-2xl border border-border bg-[color:var(--surface)] shadow-[var(--shadow-1)]";

export function VeloTracker() {
  const [selected, setSelected] = useState<number | null>(null);
  
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono-ui text-muted-foreground uppercase tracking-wider hidden sm:inline-block">Velo Check</span>
      <div className="flex items-center gap-1.5 rounded-full border border-border bg-background p-1 shadow-sm">
        <button 
          onClick={() => setSelected(1)} 
          className={`rounded-full p-1.5 transition-colors ${selected === 1 ? 'bg-orange-500/20 text-orange-500' : 'text-muted-foreground hover:bg-muted'}`}
          title="Burned Out"
        ><Flame className="h-3.5 w-3.5" /></button>
        <button 
          onClick={() => setSelected(2)} 
          className={`rounded-full p-1.5 transition-colors ${selected === 2 ? 'bg-blue-500/20 text-blue-500' : 'text-muted-foreground hover:bg-muted'}`}
          title="Steady Focus"
        ><Target className="h-3.5 w-3.5" /></button>
        <button 
          onClick={() => setSelected(3)} 
          className={`rounded-full p-1.5 transition-colors ${selected === 3 ? 'bg-purple-500/20 text-purple-500' : 'text-muted-foreground hover:bg-muted'}`}
          title="Flow State"
        ><Zap className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

export function XPQuests() {
  const [quests, setQuests] = useState([
    { id: 1, title: "Connect GitHub", xp: 100, icon: <Github className="h-4 w-4" />, done: false },
    { id: 2, title: "Connect LinkedIn", xp: 100, icon: <Linkedin className="h-4 w-4" />, done: false },
    { id: 3, title: "Initial Skill Scan", xp: 250, icon: <Activity className="h-4 w-4" />, done: true },
  ]);

  const toggleQuest = (id: number) => {
    setQuests(quests.map(q => q.id === id ? { ...q, done: !q.done } : q));
  }

  return (
    <div className={`${SHELL} p-3`}>
      <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground mb-3 px-1">Daily Quests <span className="text-[color:var(--brand-indigo)] ml-1">Earn XP</span></p>
      <div className="space-y-2">
        {quests.map(q => (
          <div 
            key={q.id} 
            onClick={() => toggleQuest(q.id)}
            className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${q.done ? 'bg-muted/20 border-border/50 opacity-60' : 'bg-background border-border hover:border-border/80 hover:bg-muted/10 cursor-pointer'}`}
          >
            <div className={`shrink-0 ${q.done ? 'text-green-500' : 'text-muted-foreground'}`}>
              {q.done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            </div>
            <div className="flex-1 flex justify-between items-center min-w-0">
              <div className="flex items-center gap-2 truncate text-sm">
                <span className={`shrink-0 ${q.done ? 'text-green-500/80' : 'text-muted-foreground'}`}>{q.icon}</span>
                <span className={`truncate font-medium ${q.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{q.title}</span>
              </div>
              <Badge variant="outline" className={`shrink-0 ml-2 font-mono-ui text-[10px] ${q.done ? 'text-muted-foreground border-border bg-transparent' : 'text-orange-500 border-orange-500/20 bg-orange-500/10'}`}>+{q.xp} XP</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TheCircleTeaser() {
  return (
    <div className={`${SHELL} p-4 bg-gradient-to-br from-purple-500/5 via-background to-background relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Activity className="w-24 h-24" />
      </div>
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <Activity className="h-4 w-4" />
          <p className="font-display font-semibold text-base">The Circle</p>
        </div>
        <Badge className="font-mono-ui text-[9px] uppercase tracking-wider bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 shadow-none border border-purple-500/20">Beta</Badge>
      </div>
      <p className="text-sm text-muted-foreground tracking-tight leading-relaxed relative z-10">
        You&apos;ve been assigned to <span className="font-semibold text-foreground">Cohort Alpha-Tango</span> along with 4 peers navigating the Python Ecosystem.
      </p>
      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-[10px] uppercase text-muted-foreground font-mono-ui font-semibold relative z-10">
        <span>Cohorts Unlocks</span>
        <span className="text-[color:var(--brand-indigo)] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Level 5</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Background Task Monitor
// Taps into the real-time WS store (mentor-lounge-store) for live process data.
// Also listens for analysis events via a shared prop from the notifications hook.
// ─────────────────────────────────────────────────────────────────────────────

interface BackgroundProcess {
  id: string;
  label: string;
  detail: string;
  status: "running" | "queued" | "done" | "failed" | "warning";
  icon: React.ReactNode;
  ts: number;
}

interface BackgroundTaskMonitorProps {
  analysisEvents?: StageStreamEvent[];
}

const STATUS_CONFIG = {
  running: {
    dot: "bg-blue-500 animate-pulse",
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    label: "Running",
  },
  queued: {
    dot: "bg-amber-400 animate-pulse",
    badge: "bg-amber-400/10 text-amber-500 border-amber-400/20",
    label: "Queued",
  },
  done: {
    dot: "bg-green-500",
    badge: "bg-green-500/10 text-green-600 border-green-500/20",
    label: "Done",
  },
  failed: {
    dot: "bg-red-500",
    badge: "bg-red-500/10 text-red-500 border-red-500/20",
    label: "Failed",
  },
  warning: {
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    label: "Needs Input",
  },
};

export function BackgroundTaskMonitor({ analysisEvents = [] }: BackgroundTaskMonitorProps) {
  const { planBuildStatus, planBuildMessage, planBuildTitle, agentRuntime } = useMentorLoungeStore();
  const [expanded, setExpanded] = useState(false);
  const [tick, setTick] = useState(0);

  // Gentle clock tick to keep timestamps fresh
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);
  void tick; // consumed to re-render

  // Build process list from live store data
  const processes: BackgroundProcess[] = [];

  // 1. Plan / Roadmap build job
  if (planBuildStatus !== "idle") {
    const statusMap: Record<string, BackgroundProcess["status"]> = {
      queued: "queued",
      in_progress: "running",
      warning: "warning",
      completed: "done",
      failed: "failed",
    };
    processes.push({
      id: "plan-build",
      label: planBuildTitle ?? "Learning Plan",
      detail: planBuildMessage ?? "Building your personalised roadmap…",
      status: statusMap[planBuildStatus] ?? "running",
      icon: <FileText className="h-3.5 w-3.5 shrink-0" />,
      ts: Date.now(),
    });
  }

  // 2. Active analysis session (most recent event that hasn't completed)
  if (analysisEvents.length > 0) {
    const latest = analysisEvents[0];
    const eventType = typeof latest.event === "string" ? latest.event : "";
    const isComplete =
      eventType === "analysis_complete" ||
      eventType === "analysis_completed" ||
      eventType === "analysis_error";
    const stage = typeof latest.stage === "string" ? latest.stage : eventType;
    const stageLabel = stage.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    processes.push({
      id: "analysis",
      label: "Intelligence Analysis",
      detail: stageLabel || "Processing…",
      status: isComplete
        ? eventType === "analysis_error" ? "failed" : "done"
        : "running",
      icon: <BrainCircuit className="h-3.5 w-3.5 shrink-0" />,
      ts: Date.now(),
    });
  }

  // 3. Most-recent agent runtime step (non-completed)
  const latestRuntime = agentRuntime[0];
  if (
    latestRuntime &&
    latestRuntime.status !== "completed" &&
    latestRuntime.status !== "failed"
  ) {
    processes.push({
      id: `runtime-${latestRuntime.id}`,
      label: latestRuntime.agent ?? "Mentor Agent",
      detail: latestRuntime.step ?? "Thinking…",
      status: latestRuntime.status === "waiting_for_input" ? "warning" : "running",
      icon: <Sparkles className="h-3.5 w-3.5 shrink-0" />,
      ts: Date.now(),
    });
  }

  const activeCount = processes.filter(p => p.status === "running" || p.status === "queued").length;
  const hasAny = processes.length > 0;

  // ── Idle / Empty State ────────────────────────────────────────────────────
  if (!hasAny) {
    return (
      <div className={`${SHELL} px-4 py-3 flex items-center gap-3`}>
        <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-muted/60 shrink-0">
          <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">System Monitor</p>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">All clear — no background processes running.</p>
        </div>
      </div>
    );
  }

  // ── Active State ──────────────────────────────────────────────────────────
  const visibleProcesses = expanded ? processes : processes.slice(0, 1);

  return (
    <div className={`${SHELL} overflow-hidden transition-all duration-300`}>
      {/* Header row ─ always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors group"
      >
        {/* Animated "active" indicator */}
        <div className="relative shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10">
          <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            System Monitor
            {activeCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-500 text-white text-[9px] font-bold w-4 h-4">
                {activeCount}
              </span>
            )}
          </p>
          <p className="text-[11px] text-foreground/80 truncate mt-0.5 font-medium">
            {processes[0].detail}
          </p>
        </div>

        <div className="shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* Process list — expanded */}
      {expanded && (
        <div className="border-t border-border/60 divide-y divide-border/40">
          {visibleProcesses.map((proc) => {
            const cfg = STATUS_CONFIG[proc.status];
            return (
              <div key={proc.id} className="flex items-start gap-3 px-4 py-2.5">
                {/* Status dot */}
                <div className="mt-0.5 shrink-0">
                  <span className={`block h-2 w-2 rounded-full ${cfg.dot}`} />
                </div>

                {/* Icon + text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-muted-foreground shrink-0">{proc.icon}</span>
                    <p className="text-[12px] font-semibold truncate">{proc.label}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-snug">
                    {proc.detail}
                  </p>
                </div>

                {/* Status badge */}
                <Badge
                  variant="outline"
                  className={`shrink-0 font-mono-ui text-[9px] uppercase tracking-wider mt-0.5 border ${cfg.badge}`}
                >
                  {proc.status === "failed" ? (
                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                  ) : null}
                  {cfg.label}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MoodSensor — animated mood check-in strip for the dashboard bottom
// ─────────────────────────────────────────────────────────────────────────────

const MOODS = [
  {
    id: 1, label: "Drained", emoji: "🪫",
    color: "text-slate-400", glow: "shadow-slate-400/30",
    bg: "bg-slate-400/10 border-slate-400/30",
    activeBg: "bg-slate-400/20 border-slate-400/60",
    icon: <Battery className="h-3.5 w-3.5" />,
  },
  {
    id: 2, label: "Distracted", emoji: "😤",
    color: "text-amber-400", glow: "shadow-amber-400/30",
    bg: "bg-amber-400/10 border-amber-400/30",
    activeBg: "bg-amber-400/20 border-amber-400/60",
    icon: <Flame className="h-3.5 w-3.5" />,
  },
  {
    id: 3, label: "Neutral", emoji: "😐",
    color: "text-blue-400", glow: "shadow-blue-400/30",
    bg: "bg-blue-400/10 border-blue-400/30",
    activeBg: "bg-blue-400/20 border-blue-400/60",
    icon: <Coffee className="h-3.5 w-3.5" />,
  },
  {
    id: 4, label: "Focused", emoji: "🎯",
    color: "text-green-400", glow: "shadow-green-400/30",
    bg: "bg-green-400/10 border-green-400/30",
    activeBg: "bg-green-400/20 border-green-400/60",
    icon: <Target className="h-3.5 w-3.5" />,
  },
  {
    id: 5, label: "Flow ⚡", emoji: "⚡",
    color: "text-purple-400", glow: "shadow-purple-400/40",
    bg: "bg-purple-400/10 border-purple-400/30",
    activeBg: "bg-purple-400/25 border-purple-400/70",
    icon: <Zap className="h-3.5 w-3.5" />,
  },
] as const;

export function MoodSensor() {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  const pick = (id: number) => {
    if (confirmed) return;
    setSelected(id);
    setTimeout(() => setConfirmed(true), 400);
  };

  return (
    <div className={`${SHELL} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
            How are you feeling?
          </p>
          {confirmed ? (
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Smile className="h-3 w-3 text-green-500" />
              <span className="text-green-500 font-medium">Noted — Mentor will adapt to your state.</span>
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground mt-0.5">Mentor adapts to your energy level</p>
          )}
        </div>
        {confirmed && (
          <button
            onClick={() => { setSelected(null); setConfirmed(false); }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Change
          </button>
        )}
      </div>

      <div className="flex items-stretch gap-2">
        {MOODS.map((mood) => {
          const isSelected = selected === mood.id;
          const isHovered = hovered === mood.id;
          const isDimmed = confirmed && !isSelected;

          return (
            <button
              key={mood.id}
              onClick={() => pick(mood.id)}
              onMouseEnter={() => setHovered(mood.id)}
              onMouseLeave={() => setHovered(null)}
              disabled={confirmed}
              className={`
                flex-1 flex flex-col items-center gap-1.5 rounded-xl border py-3 px-1
                transition-all duration-200 group
                ${isDimmed ? "opacity-30 scale-95 cursor-default" : "cursor-pointer"}
                ${isSelected
                  ? `${mood.activeBg} ${mood.color} shadow-lg ${mood.glow} scale-105`
                  : `${mood.bg} ${mood.color} ${!confirmed ? "hover:scale-105 hover:shadow-md" : ""}`
                }
              `}
              style={{
                transform: isSelected && confirmed
                  ? "scale(1.08)"
                  : isSelected
                    ? "scale(1.05)"
                    : isHovered && !confirmed
                      ? "scale(1.04)"
                      : undefined,
              }}
            >
              {/* Emoji */}
              <span
                className={`text-xl transition-transform duration-200 ${
                  isSelected ? "animate-bounce" : isHovered && !confirmed ? "scale-110" : ""
                }`}
                style={{ display: "inline-block" }}
              >
                {mood.emoji}
              </span>
              {/* Label */}
              <span className={`text-[9px] font-bold uppercase tracking-wider leading-none text-center ${mood.color}`}>
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ambient glow line when confirmed */}
      {confirmed && selected && (() => {
        const m = MOODS.find(m => m.id === selected)!;
        return (
          <div className={`mt-3 h-0.5 rounded-full ${m.activeBg.split(" ")[0]} opacity-60 transition-all duration-500`} />
        );
      })()}
    </div>
  );
}
