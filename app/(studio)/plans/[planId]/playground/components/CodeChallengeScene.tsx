"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Lightbulb, Loader2, XCircle } from "lucide-react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeRunner } from "./CodeRunner";

interface TestCase {
  input?: unknown;
  expected_output?: unknown;
  description?: unknown;
  status?: "pass" | "fail" | "pending";
}

interface CodeChallengeSceneProps {
  scene: {
    id?: string;
    title?: string;
    language?: string;
    starter_code?: string;
    test_cases?: TestCase[];
    hints?: string[];
    estimated_seconds?: number;
  };
  onRequestMentorReview?: (content: string) => void;
  onExecutionEvent?: (payload: {
    event_type: "run_started" | "run_completed" | "runtime_error" | "compile_error" | "test_passed" | "test_failed";
    language?: string;
    run_id?: string;
    status?: string;
    error_type?: string;
    meta?: Record<string, unknown>;
  }) => void;
}

const JS_LANGUAGES = new Set(["javascript", "typescript", "jsx", "tsx", "html", "react"]);
const PYTHON_LANGUAGES = new Set(["python", "py"]);

const toDisplayText = (value: unknown): string => {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
};

export function CodeChallengeScene({ scene, onRequestMentorReview, onExecutionEvent }: CodeChallengeSceneProps) {
  const language = (scene.language ?? "python").toLowerCase();
  const isJavaScript = JS_LANGUAGES.has(language);
  const isPython = PYTHON_LANGUAGES.has(language);

  const hints = (scene.hints ?? []).map((h) => toDisplayText(h));
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [testCases, setTestCases] = useState<TestCase[]>(scene.test_cases ?? []);

  const handleExecutionEvent: CodeChallengeSceneProps["onExecutionEvent"] = (payload) => {
    if (payload.event_type === "run_completed" && payload.meta?.output) {
      const output = toDisplayText(payload.meta.output);
      setTestCases((prev) =>
        prev.map((tc) => {
          const expected = toDisplayText(tc.expected_output);
          if (!expected || expected === "—") return { ...tc, status: "pending" };
          return { ...tc, status: output.includes(expected.trim()) ? "pass" : "fail" };
        }),
      );
    }
    onExecutionEvent?.(payload);
  };

  const passedCount = testCases.filter((t) => t.status === "pass").length;
  const failedCount = testCases.filter((t) => t.status === "fail").length;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4">
        <div>
          <Badge variant="secondary" className="text-[10px] uppercase tracking-wide bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            {isPython ? "Python · Pyodide" : isJavaScript ? "JS · Sandpack" : `${language} · Judge0`}
          </Badge>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{scene.title ?? "Code Challenge"}</h3>
        </div>
        {testCases.length > 0 && (
          <div className="flex items-center gap-2 text-xs shrink-0">
            {passedCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> {passedCount}/{testCases.length}
              </span>
            )}
            {failedCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="h-3.5 w-3.5" /> {failedCount} failing
              </span>
            )}
          </div>
        )}
      </div>

      {/* Test cases */}
      {testCases.length > 0 && (
        <div className="mx-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Test Cases</p>
          <div className="space-y-1.5">
            {testCases.slice(0, 5).map((tc, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                <span className="mt-0.5 shrink-0">
                  {tc.status === "pass" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : tc.status === "fail" ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-slate-300" />
                  )}
                </span>
                <span>
                  {tc.description ? toDisplayText(tc.description) : (
                    <>
                      <code className="rounded bg-slate-100 px-1 text-[10px]">{toDisplayText(tc.input)}</code>
                      {" → "}
                      <code className="rounded bg-slate-100 px-1 text-[10px]">{toDisplayText(tc.expected_output)}</code>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executor */}
      <div className="mx-4" style={{ height: 520 }}>
        {isPython ? (
          <PyodideSandbox
            starterCode={scene.starter_code}
            testCases={testCases}
            onTestResults={(results) => setTestCases(results)}
            onExecutionEvent={handleExecutionEvent}
          />
        ) : isJavaScript ? (
          <JavaScriptSandbox language={language} starterCode={scene.starter_code} />
        ) : (
          <CodeRunner
            defaultLanguage={language}
            initialCode={scene.starter_code}
            onRequestMentorReview={onRequestMentorReview}
            onExecutionEvent={handleExecutionEvent}
          />
        )}
      </div>

      {/* Progressive hints */}
      {hints.length > 0 && (
        <div className="mx-4 mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700">
              <Lightbulb className="h-3.5 w-3.5" />
              Hints ({hintsRevealed}/{hints.length})
            </p>
            {hintsRevealed < hints.length && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-[11px] text-amber-700 hover:bg-amber-100"
                onClick={() => setHintsRevealed((n) => Math.min(n + 1, hints.length))}
              >
                <ChevronRight className="h-3 w-3" />
                {hintsRevealed === 0 ? "Show hint" : "Next hint"}
              </Button>
            )}
          </div>
          {hintsRevealed > 0 && (
            <ul className="mt-2 space-y-1.5">
              {hints.slice(0, hintsRevealed).map((hint, idx) => (
                <li key={idx} className="text-xs text-amber-900">
                  <span className="font-medium">#{idx + 1}</span> {hint}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pyodide Sandbox ─────────────────────────────────────────────────────────

const PYODIDE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d1117; color: #e6edf3; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 13px; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  #header { background: #161b22; border-bottom: 1px solid #30363d; padding: 8px 12px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  #header span { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #7d8590; }
  #run-btn { margin-left: auto; background: #238636; color: #fff; border: none; border-radius: 6px; padding: 5px 14px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
  #run-btn:hover { background: #2ea043; }
  #run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  #editor-wrap { flex: 1; display: flex; min-height: 0; }
  #linenos { width: 44px; background: #161b22; color: #7d8590; font-size: 12px; line-height: 1.6; padding: 12px 8px 12px 0; text-align: right; user-select: none; border-right: 1px solid #30363d; overflow: hidden; flex-shrink: 0; }
  #code { flex: 1; background: #0d1117; color: #e6edf3; border: none; outline: none; padding: 12px 14px; font-family: inherit; font-size: 13px; line-height: 1.6; resize: none; tab-size: 4; white-space: pre; overflow: auto; caret-color: #58a6ff; }
  #output-panel { height: 160px; background: #010409; border-top: 1px solid #30363d; display: flex; flex-direction: column; flex-shrink: 0; }
  #output-label { padding: 6px 12px; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #7d8590; border-bottom: 1px solid #21262d; }
  #output { flex: 1; overflow-y: auto; padding: 8px 12px; font-size: 12px; line-height: 1.6; }
  .out-line { color: #e6edf3; }
  .err-line { color: #f85149; }
  .info-line { color: #7d8590; font-style: italic; }
  #loading { position: absolute; inset: 0; background: rgba(13,17,23,0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; z-index: 10; }
  #loading p { font-size: 13px; color: #7d8590; }
  .spinner { width: 28px; height: 28px; border: 3px solid #30363d; border-top-color: #58a6ff; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head>
<body>
<div id="loading"><div class="spinner"></div><p id="load-msg">Loading Python runtime…</p></div>
<div id="header">
  <span>Python</span>
  <button id="run-btn" disabled>▶ Run</button>
</div>
<div id="editor-wrap">
  <div id="linenos">1</div>
  <textarea id="code" spellcheck="false"></textarea>
</div>
<div id="output-panel">
  <div id="output-label">Output</div>
  <div id="output"></div>
</div>
<script src="https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js"></script>
<script>
let pyodide = null;
const runBtn = document.getElementById('run-btn');
const codeEl = document.getElementById('code');
const outputEl = document.getElementById('output');
const linenosEl = document.getElementById('linenos');
const loadingEl = document.getElementById('loading');

function appendOutput(text, cls) {
  text.split('\\n').forEach(line => {
    if (!line && line !== '') return;
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = line;
    outputEl.appendChild(d);
  });
  outputEl.scrollTop = outputEl.scrollHeight;
}

function updateLinenos() {
  const lines = codeEl.value.split('\\n').length;
  linenosEl.textContent = Array.from({length: lines}, (_, i) => i + 1).join('\\n');
}

codeEl.addEventListener('input', updateLinenos);
codeEl.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { e.preventDefault(); const s = codeEl.selectionStart; codeEl.value = codeEl.value.substring(0,s) + '    ' + codeEl.value.substring(codeEl.selectionEnd); codeEl.selectionStart = codeEl.selectionEnd = s + 4; updateLinenos(); }
});

async function runCode() {
  if (!pyodide) return;
  outputEl.innerHTML = '';
  const code = codeEl.value;
  parent.postMessage({type: 'PYODIDE_RUN_STARTED'}, '*');
  try {
    await pyodide.runPythonAsync('import sys\nimport io\nsys.stdout = io.StringIO()\nsys.stderr = io.StringIO()');
    await pyodide.runPythonAsync(code);
    const stdout = pyodide.runPython('sys.stdout.getvalue()');
    const stderr = pyodide.runPython('sys.stderr.getvalue()');
    if (stdout) appendOutput(stdout, 'out-line');
    if (stderr) appendOutput(stderr, 'err-line');
    parent.postMessage({type: 'PYODIDE_RUN_DONE', stdout, stderr, error: null}, '*');
  } catch(err) {
    const msg = String(err);
    appendOutput(msg, 'err-line');
    parent.postMessage({type: 'PYODIDE_RUN_DONE', stdout: '', stderr: msg, error: msg}, '*');
  }
}

runBtn.addEventListener('click', runCode);

window.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'SET_CODE' && typeof e.data.code === 'string') { codeEl.value = e.data.code; updateLinenos(); }
  if (e.data.type === 'RUN_CODE') runCode();
});

(async () => {
  document.getElementById('load-msg').textContent = 'Loading Python runtime…';
  pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' });
  loadingEl.style.display = 'none';
  runBtn.disabled = false;
  parent.postMessage({type: 'PYODIDE_READY'}, '*');
})();
</script>
</body>
</html>`;

function PyodideSandbox({
  starterCode,
  testCases,
  onTestResults,
  onExecutionEvent,
}: {
  starterCode?: string;
  testCases: TestCase[];
  onTestResults: (results: TestCase[]) => void;
  onExecutionEvent?: CodeChallengeSceneProps["onExecutionEvent"];
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  // Inject starter code once Pyodide is ready
  useEffect(() => {
    if (!ready || !iframeRef.current) return;
    iframeRef.current.contentWindow?.postMessage(
      { type: "SET_CODE", code: starterCode ?? "# Write your solution here\n" },
      "*",
    );
  }, [ready, starterCode]);

  // Listen for messages from the iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data) return;
      if (e.data.type === "PYODIDE_READY") {
        setReady(true);
      }
      if (e.data.type === "PYODIDE_RUN_STARTED") {
        onExecutionEvent?.({ event_type: "run_started", language: "python" });
      }
      if (e.data.type === "PYODIDE_RUN_DONE") {
        const { stdout, error } = e.data as { stdout: string; stderr: string; error: string | null };
        if (error) {
          onExecutionEvent?.({ event_type: "runtime_error", language: "python", error_type: "runtime", meta: { output: error } });
        } else {
          onExecutionEvent?.({ event_type: "run_completed", language: "python", meta: { output: stdout } });
          // Validate test cases
          const updated = testCases.map((tc) => {
            const expected = toDisplayText(tc.expected_output);
            if (!expected || expected === "—") return { ...tc, status: "pending" as const };
            return { ...tc, status: stdout.includes(expected.trim()) ? "pass" as const : "fail" as const };
          });
          onTestResults(updated);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [testCases, onTestResults, onExecutionEvent]);

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden border border-slate-800">
      {!ready && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0d1117]">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          <p className="text-xs text-slate-400 font-mono">Loading Python runtime…</p>
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={PYODIDE_HTML}
        sandbox="allow-scripts allow-same-origin"
        className="h-full w-full border-0"
        title="Python Sandbox"
      />
    </div>
  );
}

// ─── JavaScript Sandbox (Sandpack) ───────────────────────────────────────────

function JavaScriptSandbox({ language, starterCode }: { language: string; starterCode?: string }) {
  const template = language === "react" || language === "tsx" || language === "jsx" ? "react" : "vanilla";
  const fileName = template === "react" ? "/App.jsx" : "/index.js";
  return (
    <SandpackProvider
      template={template}
      files={{ [fileName]: starterCode ?? `// Write your solution here\n` }}
      theme="dark"
      style={{ height: 520 }}
    >
      <SandpackLayout>
        <SandpackCodeEditor showTabs showLineNumbers />
        <SandpackPreview showNavigator={false} />
      </SandpackLayout>
    </SandpackProvider>
  );
}
