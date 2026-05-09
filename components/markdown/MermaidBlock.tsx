"use client";

import { useEffect, useState } from "react";

interface MermaidBlockProps {
  chart: string;
}

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let isCancelled = false;

    const render = async () => {
      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "neutral",
        });
        const id = `horizon-mermaid-${Math.random().toString(36).slice(2)}`;
        const result = await mermaid.render(id, chart);
        if (!isCancelled) {
          setSvg(result.svg);
          setError("");
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to render Mermaid diagram");
          setSvg("");
        }
      }
    };

    void render();

    return () => {
      isCancelled = true;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
          Mermaid render failed
        </p>
        <pre className="max-h-52 overflow-auto whitespace-pre-wrap text-xs text-rose-900">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        Rendering diagram...
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

