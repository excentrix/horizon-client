"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GitBranch, Loader2, X } from "lucide-react";
import { chatApi } from "@/lib/api";
import { cn } from "@/lib/utils";

type Node = { id: string; label: string; description: string };
type Edge = { source: string; target: string; relationship?: string };
type Mastery = "mastered" | "in_progress" | "gap" | undefined;

interface ConceptMapData {
  nodes: Node[];
  edges: Edge[];
  mastery: Record<string, Mastery>;
}

const MASTERY_STYLES: Record<string, string> = {
  mastered:    "border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  in_progress: "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  gap:         "border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  default:     "border-border bg-card text-foreground",
};

function nodeStyle(label: string, mastery: Record<string, Mastery>): string {
  const m = mastery[label];
  return MASTERY_STYLES[m ?? "default"] ?? MASTERY_STYLES.default;
}

interface SVGGraphProps {
  nodes: Node[];
  edges: Edge[];
  mastery: Record<string, Mastery>;
}

function SVGGraph({ nodes, edges, mastery }: SVGGraphProps) {
  const W = 480;
  const H = 260;
  const NODE_W = 110;
  const NODE_H = 36;

  // Lay out nodes in columns based on their position in edge tree (simple BFS)
  const positions = useCallback((): Record<string, { x: number; y: number }> => {
    const cols: Record<string, number> = {};
    const inDegree: Record<string, number> = {};
    nodes.forEach((n) => { inDegree[n.id] = 0; });
    edges.forEach((e) => { inDegree[e.source] = (inDegree[e.source] ?? 0) + 1; });

    const roots = nodes.filter((n) => (inDegree[n.id] ?? 0) === 0).map((n) => n.id);
    const queue = [...roots];
    const visited = new Set<string>();
    let col = 0;
    while (queue.length) {
      const next: string[] = [];
      queue.forEach((id) => {
        if (visited.has(id)) return;
        visited.add(id);
        cols[id] = col;
        edges.filter((e) => e.source === id).forEach((e) => next.push(e.target));
      });
      col++;
      queue.splice(0, queue.length, ...next);
    }
    // Assign remaining nodes
    nodes.forEach((n) => { if (!(n.id in cols)) cols[n.id] = col; });

    const colGroups: Record<number, string[]> = {};
    nodes.forEach((n) => {
      const c = cols[n.id] ?? 0;
      (colGroups[c] = colGroups[c] || []).push(n.id);
    });

    const numCols = Math.max(...Object.keys(colGroups).map(Number)) + 1;
    const colW = W / (numCols + 1);
    const result: Record<string, { x: number; y: number }> = {};
    Object.entries(colGroups).forEach(([c, ids]) => {
      const cx = colW * (Number(c) + 1);
      const rowH = H / (ids.length + 1);
      ids.forEach((id, i) => {
        result[id] = { x: cx, y: rowH * (i + 1) };
      });
    });
    return result;
  }, [nodes, edges])();

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" className="fill-muted-foreground/60" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const src = positions[e.source];
        const tgt = positions[e.target];
        if (!src || !tgt) return null;
        const x1 = src.x + NODE_W / 2;
        const y1 = src.y;
        const x2 = tgt.x - NODE_W / 2;
        const y2 = tgt.y;
        const mx = (x1 + x2) / 2;
        return (
          <g key={i}>
            <path
              d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
              fill="none"
              className="stroke-muted-foreground/40"
              strokeWidth="1.5"
              markerEnd="url(#arrow)"
            />
            {e.relationship && (
              <text x={mx} y={(y1 + y2) / 2 - 4} textAnchor="middle" className="fill-muted-foreground text-[9px]" style={{ fontSize: 9 }}>
                {e.relationship}
              </text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {nodes.map((n) => {
        const p = positions[n.id];
        if (!p) return null;
        const m = mastery[n.label];
        const fill = m === "mastered" ? "#d1fae5" : m === "in_progress" ? "#fef3c7" : m === "gap" ? "#fee2e2" : "#f3f4f6";
        const stroke = m === "mastered" ? "#34d399" : m === "in_progress" ? "#fbbf24" : m === "gap" ? "#f87171" : "#d1d5db";
        return (
          <g key={n.id}>
            <rect
              x={p.x - NODE_W / 2}
              y={p.y - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              rx={8}
              fill={fill}
              stroke={stroke}
              strokeWidth="1.5"
            />
            <text
              x={p.x}
              y={p.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: 11, fontWeight: 500 }}
            >
              {n.label.length > 14 ? n.label.slice(0, 13) + "…" : n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

interface ConceptMapWidgetProps {
  text: string;
  conversationId?: string;
  className?: string;
}

export function ConceptMapWidget({ text, conversationId, className }: ConceptMapWidgetProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConceptMapData | null>(null);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    try {
      const result = await chatApi.extractConceptMap(text, conversationId);
      if (result.nodes.length > 0) setData(result);
    } catch {
      fetchedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [text, conversationId]);

  const handleToggle = () => {
    if (!open && !data) load();
    setOpen((o) => !o);
  };

  // Only render the trigger button if the message is long enough to contain concepts
  if (text.length < 80) return null;

  return (
    <div className={cn("mt-2", className)}>
      <button
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
          open
            ? "border-[color:var(--brand-indigo)]/40 bg-[color:var(--brand-indigo)]/8 text-[color:var(--brand-indigo)]"
            : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20",
        )}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <GitBranch className="h-3 w-3" />
        )}
        {open ? "Hide concept map" : "Show concept map"}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border bg-card p-3">
          {loading && (
            <div className="flex items-center gap-2 py-4 justify-center text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Extracting concepts…
            </div>
          )}

          {!loading && !data && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              No concept relationships found in this explanation.
            </p>
          )}

          {!loading && data && data.nodes.length > 0 && (
            <>
              <SVGGraph nodes={data.nodes} edges={data.edges} mastery={data.mastery} />

              {/* Legend */}
              <div className="mt-2 flex flex-wrap gap-2">
                {(["mastered", "in_progress", "gap"] as const).some(
                  (k) => Object.values(data.mastery).includes(k)
                ) && (
                  <>
                    {(["mastered", "in_progress", "gap"] as const).map((k) => (
                      Object.values(data.mastery).includes(k) && (
                        <span
                          key={k}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                            MASTERY_STYLES[k],
                          )}
                        >
                          {k === "mastered" ? "✓ Mastered" : k === "in_progress" ? "~ In progress" : "✗ Gap"}
                        </span>
                      )
                    ))}
                  </>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">Arrows = prerequisites</span>
              </div>

              {/* Node list with descriptions */}
              <div className="mt-2 space-y-1">
                {data.nodes.map((n) => (
                  <div key={n.id} className="flex gap-2 text-xs">
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-1.5 py-0.5 font-medium",
                        nodeStyle(n.label, data.mastery),
                      )}
                    >
                      {n.label}
                    </span>
                    {n.description && (
                      <span className="text-muted-foreground leading-relaxed">{n.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
