"use client";

import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { loadLanguage, type LanguageName } from "@uiw/codemirror-extensions-langs";
import { Button } from "@/components/ui/button";
import { playgroundApi } from "@/lib/api";
import { Loader2, MessageSquare, Play } from "lucide-react";

const LANGUAGE_OPTIONS = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript (Node)" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
  { id: "go", label: "Go" },
  { id: "rust", label: "Rust" },
  { id: "ruby", label: "Ruby" },
  { id: "php", label: "PHP" },
];

const LANGUAGE_MAP: Record<string, LanguageName> = {
  python: "py",
  javascript: "js",
  java: "java",
  cpp: "cpp",
  go: "go",
  rust: "rs",
  ruby: "rb",
  php: "php",
};

const DEFAULT_SNIPPETS: Record<string, string> = {
  python: "def main():\n    print(\"Hello, Horizon!\")\n\nif __name__ == \"__main__\":\n    main()",
  javascript: "console.log('Hello, Horizon!');",
  java: "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello, Horizon!\");\n  }\n}",
  cpp: "#include <iostream>\nint main() {\n  std::cout << \"Hello, Horizon!\" << std::endl;\n  return 0;\n}",
  go: "package main\n\nimport \"fmt\"\n\nfunc main() {\n  fmt.Println(\"Hello, Horizon!\")\n}",
  rust: "fn main() {\n  println!(\"Hello, Horizon!\");\n}",
  ruby: "puts 'Hello, Horizon!'",
  php: "<?php\necho \"Hello, Horizon!\";",
};

const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

declare global {
  interface Window {
    loadPyodide?: (config: { indexURL: string }) => Promise<{
      runPythonAsync: (code: string) => Promise<unknown>;
      runPython: (code: string) => string;
    }>;
  }
}

interface CodeRunnerProps {
  defaultLanguage?: string;
  initialCode?: string;
  onRequestMentorReview?: (content: string) => void;
  onExecutionEvent?: (payload: {
    event_type:
      | "run_started"
      | "run_completed"
      | "runtime_error"
      | "compile_error"
      | "test_passed"
      | "test_failed";
    language?: string;
    run_id?: string;
    status?: string;
    error_type?: string;
    meta?: Record<string, unknown>;
  }) => void;
}

export function CodeRunner({
  defaultLanguage = "python",
  initialCode,
  onRequestMentorReview,
  onExecutionEvent,
}: CodeRunnerProps) {
  const language = defaultLanguage in DEFAULT_SNIPPETS ? defaultLanguage : "python";
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [code, setCode] = useState(initialCode || DEFAULT_SNIPPETS[language]);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState<{ stdout?: string; stderr?: string; compile_output?: string; message?: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const [pyodideError, setPyodideError] = useState<string | null>(null);
  const [pyodideRuntime, setPyodideRuntime] = useState<{
    runPythonAsync: (code: string) => Promise<unknown>;
    runPython: (code: string) => string;
  } | null>(null);

  const extension = useMemo(() => {
    const langKey = LANGUAGE_MAP[selectedLanguage];
    const lang = langKey ? loadLanguage(langKey) : null;
    return lang ? [lang] : [];
  }, [selectedLanguage]);

  useEffect(() => {
    const nextLang = defaultLanguage in DEFAULT_SNIPPETS ? defaultLanguage : "python";
    setSelectedLanguage(nextLang);
    if (!initialCode) {
      setCode(DEFAULT_SNIPPETS[nextLang] || "");
    }
  }, [defaultLanguage, initialCode]);

  useEffect(() => {
    if (selectedLanguage !== "python") return;
    if (pyodideRuntime || pyodideLoading) return;

    let cancelled = false;
    const load = async () => {
      setPyodideLoading(true);
      setPyodideError(null);
      try {
        if (!window.loadPyodide) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = `${PYODIDE_INDEX_URL}pyodide.js`;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Pyodide script."));
            document.head.appendChild(script);
          });
        }
        if (!window.loadPyodide) {
          throw new Error("Pyodide loader unavailable.");
        }
        const runtime = await window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
        if (!cancelled) {
          setPyodideRuntime(runtime);
        }
      } catch (error) {
        if (!cancelled) {
          setPyodideError(error instanceof Error ? error.message : "Failed to load Python runtime.");
        }
      } finally {
        if (!cancelled) setPyodideLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedLanguage, pyodideRuntime, pyodideLoading]);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput(null);
    const runId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    onExecutionEvent?.({
      event_type: "run_started",
      language: selectedLanguage,
      run_id: runId,
    });
    try {
      if (selectedLanguage === "python") {
        if (!pyodideRuntime) {
          throw new Error(pyodideError || "Python runtime is still loading.");
        }
        const escapedStdin = JSON.stringify(stdin ?? "");
        const bootstrap = [
          "import sys",
          "import io",
          "import builtins",
          `__horizon_stdin = io.StringIO(${escapedStdin})`,
          "sys.stdin = __horizon_stdin",
          "builtins.input = lambda prompt='': __horizon_stdin.readline().rstrip('\\n')",
          "sys.stdout = io.StringIO()",
          "sys.stderr = io.StringIO()",
        ].join("\n");
        await pyodideRuntime.runPythonAsync(bootstrap);
        await pyodideRuntime.runPythonAsync(code);
        const stdout = pyodideRuntime.runPython("sys.stdout.getvalue()");
        const stderr = pyodideRuntime.runPython("sys.stderr.getvalue()");
        setOutput({
          stdout: stdout ?? "",
          stderr: stderr ?? "",
        });

        const runtimeError = Boolean(stderr);
        onExecutionEvent?.({
          event_type: runtimeError ? "runtime_error" : "run_completed",
          language: selectedLanguage,
          run_id: runId,
          status: runtimeError ? "runtime_error" : "success",
          error_type: runtimeError ? "runtime" : undefined,
          meta: {
            has_stdout: Boolean(stdout),
            has_stderr: Boolean(stderr),
          },
        });
        onExecutionEvent?.({
          event_type: runtimeError ? "test_failed" : "test_passed",
          language: selectedLanguage,
          run_id: runId,
          status: runtimeError ? "runtime_error" : "success",
          error_type: runtimeError ? "runtime" : undefined,
          meta: { scope: "visible", source: "code_runner_pyodide" },
        });
        return;
      }

      const result = await playgroundApi.executeCode({
        language: selectedLanguage,
        source_code: code,
        stdin,
      });
      setOutput({
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
        compile_output: result.compile_output ?? "",
        message: result.message,
      });
      const statusDescription = (result.status_description || "").toLowerCase();
      const stderrText = `${result.stderr ?? ""} ${result.compile_output ?? ""} ${result.message ?? ""}`.toLowerCase();
      const compileError =
        statusDescription.includes("compilation error") || stderrText.includes("syntax");
      const runtimeError = statusDescription.includes("runtime error");
      let errorType: string | undefined;
      if (compileError) errorType = "syntax";
      else if (runtimeError) errorType = "runtime";
      else if (statusDescription.includes("time limit")) errorType = "timeout";

      onExecutionEvent?.({
        event_type: compileError ? "compile_error" : runtimeError ? "runtime_error" : "run_completed",
        language: selectedLanguage,
        run_id: runId,
        status: result.status_description ?? result.status,
        error_type: errorType,
        meta: {
          has_stdout: Boolean(result.stdout),
          has_stderr: Boolean(result.stderr || result.compile_output || result.message),
          exit_code: result.exit_code,
        },
      });
      onExecutionEvent?.({
        event_type: compileError || runtimeError ? "test_failed" : "test_passed",
        language: selectedLanguage,
        run_id: runId,
        status: result.status_description ?? result.status,
        error_type: errorType ?? (compileError || runtimeError ? "runtime" : undefined),
        meta: { scope: "visible", source: "code_runner" },
      });
    } catch {
      const message = selectedLanguage === "python"
        ? `Execution failed${pyodideError ? `: ${pyodideError}` : "."}`
        : "Execution failed. Please try again.";
      setOutput({ message });
      onExecutionEvent?.({
        event_type: "runtime_error",
        language: selectedLanguage,
        run_id: runId,
        status: "request_failed",
        error_type: "runtime",
      });
      onExecutionEvent?.({
        event_type: "test_failed",
        language: selectedLanguage,
        run_id: runId,
        status: "request_failed",
        error_type: "runtime",
        meta: { scope: "visible", source: "code_runner" },
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    if (!initialCode) {
      setCode(DEFAULT_SNIPPETS[value] || "");
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2 text-sm text-slate-700">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Language</label>
          <select
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {selectedLanguage === "python" && (
            <span className="text-[11px] text-slate-500">
              {pyodideLoading
                ? "Loading Pyodide runtime..."
                : pyodideError
                  ? "Pyodide unavailable"
                  : "Running in-browser via Pyodide"}
            </span>
          )}
          {onRequestMentorReview && (
            <Button
              onClick={() => onRequestMentorReview(code)}
              size="sm"
              variant="outline"
              className="h-8 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <MessageSquare className="mr-2 h-3.5 w-3.5" />
              Review My Code
            </Button>
          )}
          <Button
            onClick={handleRun}
            size="sm"
            disabled={isRunning || (selectedLanguage === "python" && (pyodideLoading || !pyodideRuntime))}
            className="h-8 bg-slate-900 text-white hover:bg-slate-800"
          >
            {isRunning ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-2 h-3.5 w-3.5" />}
            Run
          </Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden p-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2 overflow-hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Code</span>
          <div className="flex-1 overflow-hidden rounded-lg border border-slate-200">
            <CodeMirror
              value={code}
              height="100%"
              extensions={extension}
              onChange={(value) => setCode(value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 overflow-hidden">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Input (stdin)</span>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              className="min-h-[90px] rounded-lg border border-slate-200 bg-white p-2 text-xs font-mono"
              placeholder="Optional input..."
            />
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Output</span>
            <div className="flex-1 overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs text-slate-200">
              {output?.message ? <p className="text-rose-300">{output.message}</p> : null}
              {output?.compile_output ? (
                <pre className="mb-3 whitespace-pre-wrap text-amber-200">{output.compile_output}</pre>
              ) : null}
              {output?.stderr ? (
                <pre className="mb-3 whitespace-pre-wrap text-rose-300">{output.stderr}</pre>
              ) : null}
              {output?.stdout ? (
                <pre className="whitespace-pre-wrap text-emerald-200">{output.stdout}</pre>
              ) : null}
              {!output && <p className="text-slate-500">Run your code to see results.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
