"use client";

import { useEffect, useRef, useState } from "react";
import { codeToHtml, type ShikiTransformer } from "shiki";
import { cn } from "@/lib/utils";

// Shiki grammars we load for the inspector — mirrors the backend's
// _SOURCE_EXTS / _EXT_TO_LANG map. Anything else renders as plain text.
const KNOWN_LANGS = new Set([
  "python", "javascript", "jsx", "typescript", "tsx", "go", "java", "ruby",
  "rust", "php", "c", "cpp", "csharp", "kotlin", "swift", "scala", "vue",
  "svelte", "sql", "bash", "json", "toml", "xml", "groovy", "dockerfile",
  "yaml", "markdown", "html", "css",
]);

function lineNumberTransformer(): ShikiTransformer {
  return {
    name: "velo-line-numbers",
    line(node, line) {
      node.properties = node.properties || {};
      node.properties["data-line"] = String(line);
      node.children.unshift({
        type: "element",
        tagName: "span",
        properties: {
          className: [
            "inline-block", "w-10", "mr-4", "shrink-0", "text-right",
            "select-none", "text-muted-foreground/50",
          ],
        },
        children: [{ type: "text", value: String(line) }],
      });
    },
  };
}

function lineHighlightTransformer(range: [number, number] | null): ShikiTransformer {
  return {
    name: "velo-line-highlight",
    line(node, line) {
      if (!range) return;
      if (line >= range[0] && line <= range[1]) {
        node.properties = node.properties || {};
        const existing = (node.properties.class as string) || "";
        node.properties.class = `${existing} velo-cite-line`.trim();
      }
    },
  };
}

export function SourceFileViewer({
  content,
  lang,
  highlightRange,
  className,
}: {
  content: string;
  lang: string;
  highlightRange?: [number, number] | null;
  className?: string;
}) {
  const [light, setLight] = useState("");
  const [dark, setDark] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const range = highlightRange ?? null;

  useEffect(() => {
    let cancelled = false;
    const shikiLang = KNOWN_LANGS.has(lang) ? lang : "text";
    const transformers = [lineNumberTransformer(), lineHighlightTransformer(range)];
    Promise.all([
      codeToHtml(content, { lang: shikiLang, theme: "one-light", transformers }),
      codeToHtml(content, { lang: shikiLang, theme: "one-dark-pro", transformers }),
    ])
      .then(([l, d]) => {
        if (cancelled) return;
        setLight(l);
        setDark(d);
      })
      .catch(() => {
        if (cancelled) return;
        const escaped = content.replace(/[&<>]/g, (c) =>
          c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;",
        );
        const fallback = `<pre><code>${escaped}</code></pre>`;
        setLight(fallback);
        setDark(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [content, lang, range]);

  // Scroll the first highlighted line into view once it renders.
  useEffect(() => {
    if (!range || (!light && !dark)) return;
    const t = window.setTimeout(() => {
      containerRef.current
        ?.querySelector(`[data-line="${range[0]}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);
    return () => window.clearTimeout(t);
  }, [range, light, dark]);

  return (
    <div ref={containerRef} className={cn("min-h-0 flex-1 overflow-auto", className)}>
      <div
        className="dark:hidden [&>pre]:min-h-full [&>pre]:bg-transparent! [&>pre]:p-4 [&_code]:font-mono [&_code]:text-xs [&_code]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: light }}
      />
      <div
        className="hidden dark:block [&>pre]:min-h-full [&>pre]:bg-transparent! [&>pre]:p-4 [&_code]:font-mono [&_code]:text-xs [&_code]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: dark }}
      />
    </div>
  );
}
