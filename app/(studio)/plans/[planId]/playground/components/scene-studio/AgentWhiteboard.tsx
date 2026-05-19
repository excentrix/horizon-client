"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { WbElement } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const VIEWBOX_W = 400;
const VIEWBOX_H = 300;
const DEFAULT_COLOR = "#6366f1";
const DEFAULT_FILL = "#ede9fe";

// ── SVG element renderers ─────────────────────────────────────────────────────

function RenderCircle({
  el,
  highlight,
  entering,
}: {
  el: Extract<WbElement, { kind: "circle" }>;
  highlight?: string;
  entering?: boolean;
}) {
  const labelColor = highlight ?? el.color ?? DEFAULT_COLOR;
  // Inner box for text: inscribed square of the circle * 0.85 for padding
  const boxSize = Math.max(1, el.r * 1.2);
  return (
    <g style={entering ? { animation: "wb-enter 0.35s cubic-bezier(0.22,1,0.36,1) forwards" } : undefined}>
      <circle
        cx={el.x}
        cy={el.y}
        r={el.r}
        fill={highlight ? `${highlight}22` : (el.fill ?? DEFAULT_FILL)}
        stroke={labelColor}
        strokeWidth={highlight ? 2.5 : 1.5}
        className="transition-all duration-300"
      />
      {el.label && (
        <foreignObject
          x={el.x - boxSize / 2}
          y={el.y - boxSize / 2}
          width={boxSize}
          height={boxSize}
        >
          <div
            // @ts-expect-error xmlns required in foreignObject
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 500,
              color: labelColor,
              lineHeight: 1.2,
              textAlign: "center",
              wordBreak: "break-word",
              overflow: "hidden",
            }}
          >
            {el.label}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function RenderRect({
  el,
  highlight,
  entering,
}: {
  el: Extract<WbElement, { kind: "rect" }>;
  highlight?: string;
  entering?: boolean;
}) {
  const labelColor = highlight ?? el.color ?? DEFAULT_COLOR;
  const pad = 6;
  return (
    <g style={entering ? { animation: "wb-enter 0.35s cubic-bezier(0.22,1,0.36,1) forwards" } : undefined}>
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        rx={6}
        fill={highlight ? `${highlight}22` : (el.fill ?? DEFAULT_FILL)}
        stroke={labelColor}
        strokeWidth={highlight ? 2.5 : 1.5}
        className="transition-all duration-300"
      />
      {el.label && (
        <foreignObject
          x={el.x + pad}
          y={el.y + pad}
          width={Math.max(1, el.w - pad * 2)}
          height={Math.max(1, el.h - pad * 2)}
        >
          <div
            // @ts-expect-error xmlns required in foreignObject
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 500,
              color: labelColor,
              lineHeight: 1.3,
              textAlign: "center",
              wordBreak: "break-word",
              overflow: "hidden",
            }}
          >
            {el.label}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

function RenderArrow({
  el,
  highlight,
}: {
  el: Extract<WbElement, { kind: "arrow" }>;
  highlight?: string;
}) {
  const color = highlight ?? el.color ?? "#64748b";
  const markerId = `arrow-${el.id}`;
  const dx = el.x2 - el.x1;
  const dy = el.y2 - el.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  const tipX = el.x2 - ux * 8;
  const tipY = el.y2 - uy * 8;

  return (
    <g>
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L0,4 L8,2 z" fill={color} />
        </marker>
      </defs>
      <line
        x1={el.x1}
        y1={el.y1}
        x2={tipX}
        y2={tipY}
        stroke={color}
        strokeWidth={highlight ? 2.5 : 1.5}
        strokeDasharray={el.dashed ? "5,3" : undefined}
        markerEnd={`url(#${markerId})`}
        className="transition-all duration-300"
      />
      {el.label && (
        <text
          x={(el.x1 + el.x2) / 2}
          y={(el.y1 + el.y2) / 2 - 6}
          textAnchor="middle"
          fontSize={10}
          fill={color}
          className="select-none"
        >
          {el.label}
        </text>
      )}
    </g>
  );
}

function RenderLine({
  el,
  highlight,
}: {
  el: Extract<WbElement, { kind: "line" }>;
  highlight?: string;
}) {
  return (
    <line
      x1={el.x1}
      y1={el.y1}
      x2={el.x2}
      y2={el.y2}
      stroke={highlight ?? el.color ?? "#64748b"}
      strokeWidth={highlight ? 2.5 : 1.5}
      strokeDasharray={el.dashed ? "5,3" : undefined}
      className="transition-all duration-300"
    />
  );
}

function RenderText({
  el,
  highlight,
  entering,
}: {
  el: Extract<WbElement, { kind: "text" }>;
  highlight?: string;
  entering?: boolean;
}) {
  // Use foreignObject so text wraps properly within the viewBox instead of bleeding out
  const maxW = Math.min(VIEWBOX_W - el.x - 10, (el as { w?: number }).w ?? 200);
  return (
    <g style={entering ? { animation: "wb-enter 0.35s cubic-bezier(0.22,1,0.36,1) forwards" } : undefined}>
      <foreignObject x={el.x} y={el.y - (el.size ?? 13)} width={maxW} height={80}>
        <p
          // @ts-expect-error xmlns required in foreignObject
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            margin: 0,
            fontSize: el.size ?? 13,
            fontWeight: el.bold ? 700 : 400,
            color: highlight ?? el.color ?? "#1e293b",
            lineHeight: 1.35,
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {el.text}
        </p>
      </foreignObject>
    </g>
  );
}

function RenderFormula({
  el,
  highlight,
}: {
  el: Extract<WbElement, { kind: "formula" }>;
  highlight?: string;
}) {
  const [rendered, setRendered] = useState<string>("");

  useEffect(() => {
    import("katex")
      .then((katex) => {
        try {
          setRendered(
            katex.default.renderToString(el.latex, {
              throwOnError: false,
              displayMode: false,
            })
          );
        } catch {
          setRendered(el.latex);
        }
      })
      .catch(() => setRendered(el.latex));
  }, [el.latex]);

  return (
    <foreignObject x={el.x} y={el.y - 14} width={220} height={32}>
      <div
        // @ts-expect-error xmlns needed for foreignObject
        xmlns="http://www.w3.org/1999/xhtml"
        style={{ fontSize: 13, color: highlight ?? el.color ?? "#7c3aed", lineHeight: 1 }}
        dangerouslySetInnerHTML={{ __html: rendered || el.latex }}
      />
    </foreignObject>
  );
}

function RenderCallout({
  el,
  highlight,
  entering,
}: {
  el: Extract<WbElement, { kind: "callout" }>;
  highlight?: string;
  entering?: boolean;
}) {
  const borderColor = highlight ?? el.color ?? "#f59e0b";
  return (
    <g style={entering ? { animation: "wb-enter 0.35s cubic-bezier(0.22,1,0.36,1) forwards" } : undefined}>
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        rx={8}
        fill={`${borderColor}18`}
        stroke={borderColor}
        strokeWidth={1.5}
        className="transition-all duration-300"
      />
      <foreignObject x={el.x + 8} y={el.y + 6} width={el.w - 16} height={el.h - 12}>
        <p
          // @ts-expect-error xmlns needed for foreignObject
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: borderColor,
            lineHeight: 1.4,
            margin: 0,
            wordBreak: "break-word",
          }}
        >
          {el.text}
        </p>
      </foreignObject>
    </g>
  );
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

function RenderElement({
  el,
  highlight,
  entering,
}: {
  el: WbElement;
  highlight?: string;
  entering?: boolean;
}) {
  switch (el.kind) {
    case "circle":
      return <RenderCircle el={el} highlight={highlight} entering={entering} />;
    case "rect":
      return <RenderRect el={el} highlight={highlight} entering={entering} />;
    case "arrow":
      return <RenderArrow el={el} highlight={highlight} />;
    case "line":
      return <RenderLine el={el} highlight={highlight} />;
    case "text":
      return <RenderText el={el} highlight={highlight} entering={entering} />;
    case "formula":
      return <RenderFormula el={el} highlight={highlight} />;
    case "callout":
      return <RenderCallout el={el} highlight={highlight} entering={entering} />;
    default:
      return null;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AgentWhiteboardProps {
  elements: WbElement[];
  highlighted: Record<string, string>; // id → color
  enteringIds?: Set<string>;
  spotlight?: { x: number; y: number; r: number } | null;
  pointer?: { x: number; y: number; color?: string; mode?: "spotlight" | "laser" } | null;
  className?: string;
  empty?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AgentWhiteboard({
  elements,
  highlighted,
  enteringIds,
  spotlight,
  pointer,
  className,
  empty,
}: AgentWhiteboardProps) {
  const prevCountRef = useRef(0);

  useEffect(() => {
    prevCountRef.current = elements.length;
  }, [elements.length]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-100 bg-white/90 shadow-inner",
        className
      )}
    >
      {/* Keyframe injection */}
      <style>{`
        @keyframes wb-enter {
          from { opacity: 0; transform: scale(0.82) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>

      {/* Grid background */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
        aria-hidden
      >
        <defs>
          <pattern id="wb-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#6366f1" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wb-grid)" />
      </svg>

      {/* Title zone stripe — top 15% gives the title node a "header" feel */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{ height: "15%", background: "linear-gradient(180deg, #f8fafc 0%, transparent 100%)" }}
        aria-hidden
      />

      {/* Main canvas */}
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        className="relative h-full w-full"
        style={{ aspectRatio: `${VIEWBOX_W}/${VIEWBOX_H}` }}
        aria-label="Agent whiteboard"
      >
        {elements.map((el) => (
          <RenderElement
            key={el.id}
            el={el}
            highlight={highlighted[el.id]}
            entering={enteringIds?.has(el.id)}
          />
        ))}

        {/* Spotlight overlay */}
        {spotlight && (
          <g>
            <defs>
              <mask id="wb-spotlight-mask">
                <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="white" />
                <circle cx={spotlight.x} cy={spotlight.y} r={spotlight.r} fill="black" />
              </mask>
            </defs>
            <rect
              width={VIEWBOX_W}
              height={VIEWBOX_H}
              fill="rgba(0,0,0,0.45)"
              mask="url(#wb-spotlight-mask)"
            />
            <circle
              cx={spotlight.x}
              cy={spotlight.y}
              r={spotlight.r + 2}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="6,3"
            />
          </g>
        )}

        {pointer && (
          <g style={{ transition: "all 200ms ease-out" }}>
            <circle
              cx={pointer.x}
              cy={pointer.y}
              r={pointer.mode === "laser" ? 4 : 6}
              fill={pointer.color ?? "#EC5B13"}
              opacity={0.92}
            />
            <circle
              cx={pointer.x}
              cy={pointer.y}
              r={pointer.mode === "laser" ? 14 : 18}
              fill="none"
              stroke={pointer.color ?? "#EC5B13"}
              strokeOpacity={0.45}
              strokeWidth={pointer.mode === "laser" ? 2 : 1.6}
              strokeDasharray={pointer.mode === "laser" ? "2 3" : undefined}
            />
          </g>
        )}
      </svg>

      {/* Empty state */}
      {empty && elements.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-slate-300 select-none">Whiteboard</p>
        </div>
      )}
    </div>
  );
}
