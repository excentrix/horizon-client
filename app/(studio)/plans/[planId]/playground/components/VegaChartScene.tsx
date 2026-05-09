"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VegaChartSceneProps {
  scene: {
    title?: string;
    description?: string;
    vega_spec?: Record<string, unknown>;
  };
}

export function VegaChartScene({ scene }: VegaChartSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!scene.vega_spec || !containerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const { default: embed } = await import("vega-embed");

        // Patch the spec for dark theme before rendering
        const spec = {
          ...(scene.vega_spec ?? {}),
          background: "transparent",
          config: {
            ...(scene.vega_spec?.config as object | undefined),
            axis: {
              gridColor: "#1e293b",
              labelColor: "#94a3b8",
              titleColor: "#cbd5e1",
              domainColor: "#334155",
              tickColor: "#334155",
            },
            legend: { labelColor: "#94a3b8", titleColor: "#cbd5e1" },
            title: { color: "#f1f5f9" },
            view: { stroke: "transparent" },
          },
        };

        if (!cancelled && containerRef.current) {
          await embed(containerRef.current, spec as never, {
            actions: false,
            renderer: "svg",
            theme: "dark",
          });
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Chart render failed");
          setStatus("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [scene.vega_spec]);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#0E1117] shadow-xl min-h-[420px]">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-rose-500/70 to-orange-500/70 px-6 py-5 shrink-0">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
        <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-white/8" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/20 text-xl">
            📊
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
              Data Visualization
            </p>
            <h2 className="text-base font-bold text-white leading-tight">
              {scene.title ?? "Chart"}
            </h2>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 overflow-auto px-6 py-6 flex items-center justify-center">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-rose-500" />
            <span className="text-xs">Rendering chart…</span>
          </div>
        )}
        {status === "error" && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-xs text-red-400">
            <p className="font-semibold mb-1">Chart render failed</p>
            <p className="text-red-500/80 font-mono text-[10px] break-all">{errorMsg}</p>
          </div>
        )}
        <div
          ref={containerRef}
          className={cn(
            "w-full transition-opacity duration-300 [&_svg]:max-w-full",
            status === "ready" ? "opacity-100" : "opacity-0 h-0 overflow-hidden",
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
