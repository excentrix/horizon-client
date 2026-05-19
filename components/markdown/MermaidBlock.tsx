"use client";

import { useEffect, useState } from "react";

interface MermaidBlockProps {
  chart: string;
}

let _initialized = false;

async function initMermaid() {
  const mod = await import("mermaid");
  const mermaid = mod.default;
  if (!_initialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "neutral",
      suppressErrorRendering: true,
    });
    _initialized = true;
  }
  return mermaid;
}

/** Clean up common LLM-generated Mermaid syntax issues */
function sanitize(chart: string): string {
  // Normalise line endings
  let out = chart.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Split multiple edges/nodes on the same line (e.g. "A-->B    B-->C")
  out = out.replace(/([^\n;])([ \t]{2,})([A-Za-z_])/g, "$1\n    $3");
  // Wrap labels containing parentheses in quotes so the parser doesn't choke:
  // G[Shared Resources (DB, Server)]  →  G["Shared Resources (DB, Server)"]
  out = out.replace(/(\[)([^\]]*\([^)]*\)[^\]]*)(\])/g, (_m, open, label, close) => {
    if (label.startsWith('"') && label.endsWith('"')) return `${open}${label}${close}`;
    return `${open}"${label}"${close}`;
  });
  return out;
}

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const mermaid = await initMermaid();
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const clean = sanitize(chart);
        const { svg: rendered } = await mermaid.render(id, clean);
        if (!cancelled) {
          setSvg(rendered);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setSvg("");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
          Diagram render failed
        </p>
        <p className="mb-2 text-xs text-rose-600">{error}</p>
        <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs text-rose-900">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        Rendering diagram…
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
      <div
        className="min-w-max [&_svg]:h-auto [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
