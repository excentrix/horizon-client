import { useState, useMemo } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
} from "@codesandbox/sandpack-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Code2, LayoutPanelLeft, RefreshCw, PenTool } from "lucide-react";

interface InteractiveWorkspaceProps {
  mode: "code" | "scratch";
  initialCode?: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSaveNotes: () => void;
}

export function InteractiveWorkspace({
  mode,
  initialCode,
  notes,
  onNotesChange,
  onSaveNotes,
}: InteractiveWorkspaceProps) {
  const [showConsole, setShowConsole] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const defaultCode = useMemo(() => {
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

  if (mode === "scratch") {
    return (
      <div className="flex h-full flex-col gap-4 rounded-xl border bg-amber-50/50 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-amber-700">
          <PenTool className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Reflective Canvas</h3>
        </div>
        <p className="text-sm text-amber-600/80">
          Use this space to map out algorithms, derive formulas, or brainstorm.
        </p>
        <Textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Draft your thoughts here..."
          className="min-h-[300px] flex-1 resize-none border-amber-200 bg-white p-4 font-mono text-sm leading-relaxed shadow-inner focus-visible:ring-amber-400"
        />
        <div className="flex justify-end gap-3">
          <Button variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-100" onClick={() => onNotesChange("")}>
            Clear Canvas
          </Button>
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={onSaveNotes}>
            Commit Notes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between border-b bg-white px-4 py-2 text-sm text-slate-700">
        <div className="flex items-center gap-2 font-medium">
          <Code2 className="h-4 w-4 text-blue-500" />
          Live Code Execution
        </div>
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
      </div>

      <div className="flex-1 overflow-hidden">
        <SandpackProvider
          key={editorKey}
          template="react"
          theme="dark"
          files={{
            "/App.js": defaultCode,
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
      </div>
    </div>
  );
}
