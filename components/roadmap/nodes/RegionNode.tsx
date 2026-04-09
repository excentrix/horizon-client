"use client";

import { memo } from "react";
import { Node, NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

type RegionNodeData = {
  title: string;
  subtitle?: string;
  progress?: number;
  index?: number;
} & Record<string, unknown>;

const RegionNode = ({ data }: NodeProps<Node<RegionNodeData>>) => {
  const progress = typeof data.progress === "number" ? data.progress : 0;

  return (
    <div className="pointer-events-none h-full w-full rounded-2xl border border-sky-200/70 bg-white/65 p-4 shadow-[0_12px_30px_rgba(56,189,248,0.08)] backdrop-blur-[1px]">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">
          Stage {data.index}
        </span>
        <span className="text-xs font-medium text-slate-500">{progress}%</span>
      </div>
      <p className="line-clamp-1 text-sm font-semibold text-slate-800">{data.title}</p>
      <p className={cn("mt-0.5 line-clamp-1 text-xs text-slate-500", !data.subtitle && "hidden")}>{data.subtitle}</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default memo(RegionNode);

