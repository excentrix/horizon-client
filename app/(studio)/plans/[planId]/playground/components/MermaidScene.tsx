"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MermaidSceneProps {
  scene: {
    title?: string;
    description?: string;
    mermaid_syntax?: string;
    mermaid_subtype?: string;
  };
}

export function MermaidScene({ scene }: MermaidSceneProps) {
  const uid = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!scene.mermaid_syntax || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          darkMode: true,
          fontFamily: "inherit",
          fontSize: 14,
          themeVariables: {
            background: "#0E1117",
            primaryColor: "#6366f1",
            primaryTextColor: "#e2e8f0",
            primaryBorderColor: "#4f46e5",
            lineColor: "#64748b",
            secondaryColor: "#1e293b",
            tertiaryColor: "#1e293b",
            edgeLabelBackground: "#1e293b",
            clusterBkg: "#1e293b",
            titleColor: "#f1f5f9",
            nodeTextColor: "#e2e8f0",
          },
        });
        const { svg } = await mermaid.render(`mermaid-${uid}`, scene.mermaid_syntax!);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          // Make the SVG responsive
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
            svgEl.removeAttribute("width");
          }
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Diagram render failed");
          setStatus("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [scene.mermaid_syntax, uid]);

  const subtypeLabel: Record<string, string> = {
    flowchart: "Flow", sequenceDiagram: "Sequence", classDiagram: "Class",
    erDiagram: "ER", timeline: "Timeline", mindmap: "Mind Map",
    "stateDiagram-v2": "State Machine", stateDiagram: "State Machine",
  };
  const label = subtypeLabel[scene.mermaid_subtype ?? ""] ?? "Diagram";

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0E1117] shadow-xl min-h-[420px]">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-500/70 to-cyan-500/70 px-6 py-5 shrink-0">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-white/8" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/20 text-xl">
            🗺️
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
              {label}
            </p>
            <h2 className="text-base font-bold text-white leading-tight">
              {scene.title ?? "Visual Overview"}
            </h2>
          </div>
        </div>
      </div>

      {/* Diagram */}
      <div className="flex-1 overflow-auto px-6 py-6 flex items-center justify-center">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-teal-500" />
            <span className="text-xs">Rendering diagram…</span>
          </div>
        )}
        {status === "error" && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-xs text-red-400">
            <p className="font-semibold mb-1">Diagram render failed</p>
            <p className="text-red-500/80 font-mono text-[10px] break-all">{errorMsg}</p>
          </div>
        )}
        <div
          ref={containerRef}
          className={cn(
            "w-full transition-opacity duration-300",
            status === "ready" ? "opacity-100" : "opacity-0 absolute",
          )}
        />
      </div>

      {/* Description */}
      {scene.description ? (
        <div className="border-t border-slate-800 px-6 py-3">
          <p className="text-xs text-slate-500">{scene.description}</p>
        </div>
      ) : null}
    </article>
  );
}
