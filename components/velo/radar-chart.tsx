"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface RadarAxis {
  key: string;
  label: string;
  /** 0..1, or null when not yet assessed. */
  score: number | null;
}

function statusForScore(score: number | null): "strong" | "solid" | "developing" | "none" {
  if (score == null) return "none";
  if (score >= 0.75) return "strong";
  if (score >= 0.45) return "solid";
  if (score > 0) return "developing";
  return "none";
}

const STATUS_VAR: Record<ReturnType<typeof statusForScore>, string> = {
  strong: "var(--status-strong)",
  solid: "var(--status-solid)",
  developing: "var(--status-developing)",
  none: "var(--status-none)",
};

/**
 * The capability fingerprint — a six-axis radar over the interrogation
 * dimensions. One entity, one series: a single indigo evidence fill (never a
 * traffic-light gradient); per-vertex dots speak the strong/solid/developing
 * status language, and hovering an axis reads out its exact score. Identity
 * is never color-alone: the dimension meters beside it are the table view.
 */
export function RadarChart({ axes, size = 280 }: { axes: RadarAxis[]; size?: number }) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const n = axes.length;
  // Side labels ("Consistency", "Technical depth") render outside the hexagon
  // with start/end anchors — the viewBox carries explicit gutters for them so
  // nothing clips at the edges.
  const padX = 84;
  const padY = 18;
  const width = size + padX * 2;
  const height = size + padY * 2;
  const cx = width / 2;
  const cy = height / 2;
  const radius = size * 0.38;
  const labelRadius = radius + size * 0.1;
  const rings = [0.25, 0.5, 0.75, 1];

  const pointAt = (index: number, fraction: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius * fraction,
      y: cy + Math.sin(angle) * radius * fraction,
    };
  };

  const dataPoints = axes.map((axis, i) => pointAt(i, Math.max(axis.score ?? 0, 0.04)));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label={`Capability radar: ${axes
        .map((a) => `${a.label} ${a.score != null ? Math.round(a.score * 100) : "not assessed"}`)
        .join(", ")}`}
    >
      <defs>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor="var(--brand-indigo)" stopOpacity="0.26" />
          <stop offset="100%" stopColor="var(--brand-indigo)" stopOpacity="0.07" />
        </radialGradient>
      </defs>

      {/* recessive grid */}
      {rings.map((fraction) => (
        <polygon
          key={fraction}
          points={axes.map((_, i) => `${pointAt(i, fraction).x},${pointAt(i, fraction).y}`).join(" ")}
          fill="none"
          stroke="var(--border)"
          strokeWidth={1}
        />
      ))}
      {axes.map((axis, i) => {
        const p = pointAt(i, 1);
        return (
          <line key={axis.key} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={1} />
        );
      })}

      {/* single evidence fill */}
      <polygon
        points={dataPath}
        fill={`url(#${gradientId})`}
        stroke="var(--brand-indigo)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* vertices — status dots with a surface ring so they read over the fill */}
      {axes.map((axis, i) => {
        const p = dataPoints[i];
        return (
          <circle
            key={axis.key}
            cx={p.x}
            cy={p.y}
            r={hovered === i ? 5 : 4}
            fill={STATUS_VAR[statusForScore(axis.score)]}
            stroke="var(--card)"
            strokeWidth={2}
          />
        );
      })}

      {/* axis labels + hover hit areas (larger than the mark) */}
      {axes.map((axis, i) => {
        const p = pointAt(i, 1 + (labelRadius - radius) / radius);
        const anchor = Math.abs(p.x - cx) < 6 ? "middle" : p.x > cx ? "start" : "end";
        const pct = axis.score != null ? Math.round(axis.score * 100) : null;
        return (
          <g
            key={axis.key}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-default"
          >
            <circle cx={dataPoints[i].x} cy={dataPoints[i].y} r={14} fill="transparent">
              <title>{`${axis.label}: ${pct != null ? `${pct}/100` : "not assessed"}`}</title>
            </circle>
            <text
              x={p.x}
              y={hovered === i ? p.y - 6 : p.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className={cn("font-mono-ui transition-all", hovered === i && "font-semibold")}
              fontSize={10.5}
              fill={hovered === i ? "var(--foreground)" : "var(--muted-foreground)"}
              letterSpacing="0.03em"
            >
              {axis.label}
            </text>
            {hovered === i && (
              <text
                x={p.x}
                y={p.y + 8}
                textAnchor={anchor}
                dominantBaseline="middle"
                className="font-mono-ui"
                fontSize={10.5}
                fill="var(--foreground)"
              >
                {pct != null ? `${pct}/100` : "—"}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
