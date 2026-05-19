"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bug, FileCode2, Maximize2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SimScene {
  title?: string;
  description?: string;
  html_content?: string;
  sim_subtype?: "simulation" | "code_lab" | "game" | "explorer";
  estimated_seconds?: number;
}

interface InteractiveSimSceneProps {
  scene: SimScene;
  /** Optional: allow parent (MentorDock) to send messages into the iframe */
  onMountBridge?: (send: (msg: object) => void) => void;
}

const SUBTYPE_HEIGHT: Record<string, number> = {
  code_lab: 600,
  game: 500,
  simulation: 540,
  explorer: 480,
};

const MIN_FRAME_HEIGHT = 420;
const MAX_FRAME_HEIGHT = 920;

export function InteractiveSimScene({ scene, onMountBridge }: InteractiveSimSceneProps) {
  const html = (scene.html_content ?? "").trim();
  const subtype = scene.sim_subtype ?? "simulation";
  const height = SUBTYPE_HEIGHT[subtype] ?? 520;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [key, setKey] = useState(0);
  const [frameHeight, setFrameHeight] = useState(height);

  const srcDoc = useMemo(() => {
    if (!html) return "";
    const hasHtmlTag = /<html[\s>]/i.test(html);
    const normalizeHead = `
    <style id="horizon-sim-normalize">
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        min-height: 100%;
      }
      *, *::before, *::after { box-sizing: border-box; }
      img, canvas, svg, video { max-width: 100%; height: auto; }
    </style>`;
    const bridgeScript = `
    <script id="horizon-widget-bridge">
      (() => {
        const clear = (id) => {
          const el = document.getElementById(id);
          if (el) el.remove();
        };
        const pulseOn = (selector, color = '#EC5B13') => {
          const target = selector ? document.querySelector(selector) : null;
          if (!target) return;
          target.animate(
            [
              { boxShadow: '0 0 0 0 rgba(236,91,19,0.0)' },
              { boxShadow: '0 0 0 6px rgba(236,91,19,0.22)' },
              { boxShadow: '0 0 0 0 rgba(236,91,19,0.0)' }
            ],
            { duration: 900, easing: 'ease-out' }
          );
          if (target instanceof HTMLElement) {
            target.style.outline = '2px solid ' + color;
            target.style.outlineOffset = '2px';
            setTimeout(() => { target.style.outline = ''; target.style.outlineOffset = ''; }, 1100);
          }
        };
        const showAnnotation = (text, x = 24, y = 24) => {
          clear('__h_annotation');
          const card = document.createElement('div');
          card.id = '__h_annotation';
          card.textContent = String(text || '');
          card.style.position = 'fixed';
          card.style.left = x + 'px';
          card.style.top = y + 'px';
          card.style.zIndex = '2147483647';
          card.style.maxWidth = 'min(360px, 80vw)';
          card.style.padding = '8px 10px';
          card.style.borderRadius = '10px';
          card.style.border = '1px solid rgba(236,91,19,0.45)';
          card.style.background = 'rgba(15,23,42,0.92)';
          card.style.color = '#fff';
          card.style.font = '600 13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
          card.style.boxShadow = '0 10px 30px rgba(2,6,23,0.35)';
          document.body.appendChild(card);
          setTimeout(() => clear('__h_annotation'), 2400);
        };
        window.addEventListener('message', (event) => {
          const data = event.data || {};
          if (!data || typeof data !== 'object') return;
          const type = String(data.type || '');
          try {
            if (type === 'widget_setState' || type === 'widget_set_state') {
              window.dispatchEvent(new CustomEvent('horizon:widget:setState', { detail: data }));
            } else if (type === 'widget_highlight') {
              window.dispatchEvent(new CustomEvent('horizon:widget:highlight', { detail: data }));
              if (data.selector) pulseOn(String(data.selector), '#EC5B13');
            } else if (type === 'widget_reveal') {
              window.dispatchEvent(new CustomEvent('horizon:widget:reveal', { detail: data }));
              if (data.target) pulseOn(String(data.target), '#22c55e');
            } else if (type === 'widget_annotation') {
              window.dispatchEvent(new CustomEvent('horizon:widget:annotation', { detail: data }));
              showAnnotation(data.text, Number(data.x || 24), Number(data.y || 24));
            }
          } catch (_) {}
        });
      })();
    </script>`;
    if (hasHtmlTag) {
      if (/<\/head>/i.test(html)) {
        return html.replace(/<\/head>/i, `${normalizeHead}${bridgeScript}</head>`);
      }
      return html.replace(/<html[^>]*>/i, (match) => `${match}<head>${normalizeHead}${bridgeScript}</head>`);
    }
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html,body{margin:0;padding:0;font-family:Inter,system-ui,sans-serif;width:100%;min-height:100%;}
      *,*::before,*::after{box-sizing:border-box;}
      img,canvas,svg,video{max-width:100%;height:auto;}
    </style>
    ${bridgeScript}
  </head>
  <body>${html}</body>
</html>`;
  }, [html]);

  const sendToSim = useCallback((msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(msg, "*");
  }, []);

  useEffect(() => {
    onMountBridge?.(sendToSim);
  }, [onMountBridge, sendToSim]);

  const reload = useCallback(() => {
    setLoaded(false);
    setFrameHeight(height);
    setKey((k) => k + 1);
  }, [height]);

  useEffect(() => {
    setFrameHeight(height);
  }, [height, key]);

  const syncFrameHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    const body = doc.body;
    const root = doc.documentElement;
    if (!body || !root) return;

    const contentHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      root.scrollHeight,
      root.offsetHeight,
      root.clientHeight
    );

    const viewportCap = typeof window !== "undefined" ? Math.max(MIN_FRAME_HEIGHT, window.innerHeight - 280) : MAX_FRAME_HEIGHT;
    const nextHeight = Math.max(
      MIN_FRAME_HEIGHT,
      Math.min(contentHeight + 2, Math.min(MAX_FRAME_HEIGHT, viewportCap))
    );

    setFrameHeight((prev) => (Math.abs(prev - nextHeight) > 6 ? nextHeight : prev));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    syncFrameHeight();

    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const body = doc?.body;
    const root = doc?.documentElement;
    if (!doc || !body || !root) return;

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => syncFrameHeight());
      observer.observe(body);
      observer.observe(root);
    }

    const timer = window.setInterval(syncFrameHeight, 800);
    window.addEventListener("resize", syncFrameHeight);
    return () => {
      observer?.disconnect();
      window.clearInterval(timer);
      window.removeEventListener("resize", syncFrameHeight);
    };
  }, [loaded, syncFrameHeight, key]);

  if (!srcDoc) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-700">
        No simulation HTML was generated for this scene.
      </div>
    );
  }

  const subtypeLabel: Record<string, string> = {
    simulation: "Live Simulation",
    code_lab: "Coding Lab",
    game: "Learning Game",
    explorer: "Architecture Explorer",
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between px-4 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
              {subtypeLabel[subtype] ?? "Interactive"}
            </span>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{scene.title ?? "Interactive Simulation"}</h3>
          {scene.description ? <p className="text-xs text-slate-500 mt-0.5">{scene.description}</p> : null}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reload} title="Reload">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Open fullscreen"
            onClick={() => {
              const w = window.open("", "_blank");
              if (w) { w.document.write(srcDoc); w.document.close(); }
            }}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="relative mx-4" style={{ height: frameHeight }}>
        {!loaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            <p className="text-xs text-slate-500">
              {subtype === "code_lab" ? "Initializing Python environment…" : "Loading simulation…"}
            </p>
          </div>
        )}
        {/* allow-same-origin is required for Pyodide (WASM) and CDN library loading */}
        <iframe
          key={key}
          ref={iframeRef}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-same-origin allow-forms"
          className="h-full w-full rounded-lg border border-slate-200 bg-white"
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.2s" }}
          title={scene.title ?? "Interactive simulation"}
          onLoad={() => {
            setLoaded(true);
            syncFrameHeight();
          }}
        />
      </div>

      <div className="flex items-center justify-between px-4 pb-3">
        <p className="text-[11px] text-slate-400">
          {loaded ? "Ready" : "Loading"} · {(srcDoc.length / 1024).toFixed(1)} KB
          {scene.estimated_seconds ? ` · ~${Math.round(scene.estimated_seconds / 60)} min` : ""}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowSource((p) => !p)}>
            <FileCode2 className="mr-1.5 h-3.5 w-3.5" />
            {showSource ? "Hide source" : "View source"}
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs text-amber-700 border-amber-200 hover:bg-amber-50">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
            Report issue
          </Button>
        </div>
      </div>

      {showSource && (
        <div className="mx-4 mb-4 rounded-lg border border-slate-200 bg-slate-950 p-3">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Bug className="h-3.5 w-3.5" />
            Generated HTML · {srcDoc.length} chars
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-[11px] text-slate-300 leading-relaxed">
            {srcDoc}
          </pre>
        </div>
      )}
    </div>
  );
}
