
import React, { memo } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Lock, CheckCircle2, Sparkles, PlayCircle } from 'lucide-react';

type LevelNodeData = {
  title: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  isLocked: boolean;
  levelIndex: number;
  description?: string;
  stageId?: string;
} & Record<string, unknown>;

const LevelNode = ({ data, selected }: NodeProps<Node<LevelNodeData>>) => {
  const { title, status, isLocked, levelIndex } = data;

  // Visual variants based on status
  const variants = {
    locked: "border-slate-300 bg-slate-100/80 text-slate-500 shadow-sm",
    available: "border-sky-300 bg-white text-slate-800 shadow-[0_8px_30px_rgb(56,189,248,0.15)]",
    in_progress: "border-indigo-400 bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-[0_12px_36px_rgb(99,102,241,0.45)] scale-[1.02]",
    completed: "border-emerald-400 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_10px_28px_rgb(16,185,129,0.45)]",
  };

  const Icon = status === 'locked'
    ? Lock
    : status === 'completed'
      ? CheckCircle2
      : status === 'in_progress'
        ? PlayCircle
        : Sparkles;

  const chipLabel = status === "locked"
    ? "Locked"
    : status === "in_progress"
      ? "Current Quest"
      : status === "completed"
        ? "Completed"
        : "Available";

  return (
    <div className={cn(
      "relative w-[220px] h-[128px] rounded-2xl border-2 p-4 transition-all duration-300 cursor-pointer",
      variants[status],
      selected && "ring-2 ring-ring ring-offset-2",
      isLocked && "grayscale opacity-80"
    )}>
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-slate-400 border-none" />

      <div className="flex items-start justify-between gap-3">
        <div className="rounded-xl bg-white/20 p-2 backdrop-blur-[1px]">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full border border-white/30 bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]">
          {chipLabel}
        </span>
      </div>

      <div className="mt-3 line-clamp-2 text-left text-[15px] font-semibold leading-tight">
        {title}
      </div>

      <div className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-xs font-bold text-white shadow-md">
        {levelIndex}
      </div>

      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-slate-400 border-none" />
    </div>
  );
};

export default memo(LevelNode);
