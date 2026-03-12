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

interface CodeRunnerProps {
  defaultLanguage?: string;
  initialCode?: string;
  onRequestMentorReview?: (content: string) => void;
}

export function CodeRunner({ defaultLanguage = "python", initialCode, onRequestMentorReview }: CodeRunnerProps) {
  const language = defaultLanguage in DEFAULT_SNIPPETS ? defaultLanguage : "python";
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [code, setCode] = useState(initialCode || DEFAULT_SNIPPETS[language]);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState<{ stdout?: string; stderr?: string; compile_output?: string; message?: string } | null>(null);
  const [isRunning, setIsRunning] = useState(false);

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

  const handleRun = async () => {
    setIsRunning(true);
    setOutput(null);
    try {
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
    } catch {
      setOutput({ message: "Execution failed. Please try again." });
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
            disabled={isRunning}
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
