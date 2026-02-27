import { useEffect, useMemo, useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
} from "@codesandbox/sandpack-react";
import { Button } from "@/components/ui/button";
import { Code2, LayoutPanelLeft, RefreshCw, PenTool, Terminal, FileCode2, Copy, ExternalLink, Check, TerminalSquare, Spline } from "lucide-react";
import { telemetry } from "@/lib/telemetry";
import { RichTextCanvas } from "./RichTextCanvas";
import { CodeRunner } from "./CodeRunner";
import { DiagramWorkspace } from "./DiagramWorkspace";

interface OmniWorkspaceProps {
  initialCode?: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSaveNotes: () => void;
  taskTitle: string;
  initialEnvMode?: EnvMode;
  onDiagramExport?: (file: File) => void;
  defaultCodeLanguage?: string;
}

type EnvMode = "web" | "colab" | "local" | "canvas" | "code_runner" | "diagram";

export function OmniWorkspace({
  initialCode,
  notes,
  onNotesChange,
  onSaveNotes,
  taskTitle,
  initialEnvMode,
  onDiagramExport,
  defaultCodeLanguage
}: OmniWorkspaceProps) {
  const [envMode, setEnvMode] = useState<EnvMode>(initialEnvMode || "web");
  const [showConsole, setShowConsole] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialEnvMode) {
      setEnvMode(initialEnvMode);
    }
  }, [initialEnvMode]);

  const defaultReactCode = useMemo(() => {
    return initialCode || `// Write your code here
export default function App() {
  return (
    <div style={{ fontFamily: "sans-serif", textAlign: "center", padding: "20px" }}>
      <h1>Interactive Sandbox</h1>
      <p>Start editing to see some magic happen!</p>
    </div>
  );
}`;
  }, [initialCode]);

  const defaultPythonCode = useMemo(() => {
    return initialCode || `# Task: ${taskTitle}\n# Write your Python code below:\n\ndef main():\n    print("Hello from Horizon Colab Integration!")\n\nif __name__ == "__main__":\n    main()`;
  }, [initialCode, taskTitle]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    telemetry.toastSuccess("Copied to clipboard!");
  };

  const localCliScript = `mkdir horizon-task-${taskTitle.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}
cd horizon-task-${taskTitle.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}

# Create starter file
cat << 'EOF' > main.py
${defaultPythonCode}
EOF

# Recommended: setup virtual env
python3 -m venv venv
source venv/bin/activate
pip install requests pandas # add your required packages here

echo "Workspace ready! Open in your IDE."
code .
`;

  // Encode the python code into a data URI or gist-like parameter for Colab.
  // Colab doesn't accept raw code via URL params easily without GitHub, but we can provide the snippet to copy and a fresh blank Colab link.
  const colabBlankUrl = "https://colab.research.google.com/#create=true";

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      {/* Omni-Toolbar */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2 text-sm text-slate-700">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEnvMode("web")}
            className={`h-7 px-3 text-xs ${envMode === "web" ? "bg-white shadow-sm font-semibold text-blue-600" : "text-slate-500"}`}
          >
            <Code2 className="mr-1.5 h-3.5 w-3.5" /> Web Sandpack
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEnvMode("colab")}
            className={`h-7 px-3 text-xs ${envMode === "colab" ? "bg-white shadow-sm font-semibold text-orange-600" : "text-slate-500"}`}
          >
            <FileCode2 className="mr-1.5 h-3.5 w-3.5" /> Colab (Python)
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEnvMode("local")}
            className={`h-7 px-3 text-xs ${envMode === "local" ? "bg-white shadow-sm font-semibold text-emerald-600" : "text-slate-500"}`}
          >
            <Terminal className="mr-1.5 h-3.5 w-3.5" /> Local CLI
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEnvMode("code_runner")}
            className={`h-7 px-3 text-xs ${envMode === "code_runner" ? "bg-white shadow-sm font-semibold text-slate-900" : "text-slate-500"}`}
          >
            <TerminalSquare className="mr-1.5 h-3.5 w-3.5" /> Code Runner
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEnvMode("diagram")}
            className={`h-7 px-3 text-xs ${envMode === "diagram" ? "bg-white shadow-sm font-semibold text-indigo-600" : "text-slate-500"}`}
          >
            <Spline className="mr-1.5 h-3.5 w-3.5" /> Diagram
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setEnvMode("canvas")}
            className={`h-7 px-3 text-xs ${envMode === "canvas" ? "bg-white shadow-sm font-semibold text-amber-600" : "text-slate-500"}`}
          >
            <PenTool className="mr-1.5 h-3.5 w-3.5" /> Canvas
          </Button>
        </div>

        {envMode === "web" && (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs" 
              onClick={() => setShowConsole(!showConsole)}
            >
              <LayoutPanelLeft className="mr-1 h-3 w-3" />
              {showConsole ? "Hide Console" : "Show Console"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs border-slate-300 bg-slate-100 hover:bg-slate-200"
              onClick={() => setEditorKey(prev => prev + 1)}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Reset
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {/* Web Sandpack Mode */}
        {envMode === "web" && (
          <SandpackProvider
            key={editorKey}
            template="react"
            theme="dark"
            files={{
              "/App.js": defaultReactCode,
            }}
            options={{
              classes: {
                "sp-layout": "h-full rounded-none border-0",
                "sp-wrapper": "h-full",
              },
            }}
          >
            <SandpackLayout className="h-full border-none">
              <SandpackCodeEditor 
                showLineNumbers
                showTabs
                closableTabs={false}
                className="h-full border-r border-slate-700/50 flex-1"
              />
              <div className="flex flex-1 flex-col h-full bg-slate-50">
                <SandpackPreview 
                  showOpenInCodeSandbox={false}
                  showRefreshButton={true}
                  className="flex-1 border-none"
                />
                {showConsole && (
                  <div className="h-48 border-t border-slate-200 bg-slate-900">
                    <SandpackConsole className="h-full w-full" />
                  </div>
                )}
              </div>
            </SandpackLayout>
          </SandpackProvider>
        )}

        {/* Google Colab Mode */}
        {envMode === "colab" && (
          <div className="flex h-full flex-col bg-slate-900 p-6 text-slate-300 overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="bg-orange-500/20 text-orange-400 p-1.5 rounded-md">
                    <FileCode2 className="w-5 h-5" />
                  </span>
                  Data / Python Environment
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  For Python, Machine Learning, or Data Science tasks, we recommend using Google Colab.
                </p>
              </div>

              <div className="space-y-3 bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">1. Copy Starter Code</span>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(defaultPythonCode)} className="h-6 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-400/10">
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    Copy
                  </Button>
                </div>
                <pre className="text-xs font-mono text-slate-300 bg-black/50 p-3 rounded-md overflow-x-auto border border-slate-700/50">
                  {defaultPythonCode}
                </pre>
              </div>

              <div className="space-y-3 bg-slate-800 p-4 rounded-lg border border-slate-700">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">2. Open Notebook</span>
                <p className="text-sm">Click below to open a fresh Google Colab environment, paste your code, and start executing.</p>
                <a href={colabBlankUrl} target="_blank" rel="noreferrer" className="block w-full">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                    Open Google Colab <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Local CLI Mode */}
        {envMode === "local" && (
          <div className="flex h-full flex-col bg-slate-900 p-6 text-slate-300 overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-md">
                    <Terminal className="w-5 h-5" />
                  </span>
                  Local Environment Setup
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Prefer your own VSCode / JetBrains IDE? Run this script in your terminal to instantly scaffold the task folder.
                </p>
              </div>

              <div className="space-y-3 bg-slate-800 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Setup Script (bash/zsh)</span>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(localCliScript)} className="h-6 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10">
                    {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    Copy Script
                  </Button>
                </div>
                <pre className="text-xs font-mono text-emerald-300/80 bg-black/50 p-4 rounded-md overflow-x-auto border border-slate-700/50">
                  {localCliScript}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Code Runner Mode */}
        {envMode === "code_runner" && (
          <div className="h-full p-2">
            <CodeRunner defaultLanguage={defaultCodeLanguage} initialCode={initialCode} />
          </div>
        )}

        {/* Diagram Mode */}
        {envMode === "diagram" && (
          <div className="h-full p-2">
            <DiagramWorkspace onExport={(file) => onDiagramExport?.(file)} />
          </div>
        )}

        {/* Canvas Mode */}
        {envMode === "canvas" && (
          <div className="flex h-full flex-col p-4 bg-slate-50 dark:bg-background">
            <div className="max-w-3xl mx-auto w-full h-full flex flex-col gap-3">
              <div className="flex items-center gap-2 text-amber-600">
                <PenTool className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Reflective Canvas</h3>
              </div>
              <p className="text-sm text-slate-500">
                Use this rich text space to draft architecture documents, write marketing copy, or brainstorm non-code solutions.
              </p>
              <RichTextCanvas
                storageKey={taskTitle}
                value={notes}
                onChange={onNotesChange}
                placeholder="Start writing here…"
                className="flex-1"
              />
              <div className="flex justify-end gap-3 shrink-0">
                <Button variant="outline" className="border-slate-200 text-slate-600" onClick={() => onNotesChange("")}>
                  Clear Canvas
                </Button>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={onSaveNotes}>
                  Save Draft
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
