"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ImageDown } from "lucide-react";

interface DiagramWorkspaceProps {
  onExport: (file: File) => void;
}

const TldrawCanvas = dynamic(() => import("./TldrawClient"), { ssr: false });

export function DiagramWorkspace({ onExport }: DiagramWorkspaceProps) {
  const [editor, setEditor] = useState<import("tldraw").Editor | null>(null);

  const handleExport = useCallback(async () => {
    if (!editor) return;
    const shapeIds = editor.getCurrentPageShapeIds();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageInfo = (await editor.toImage(Array.from(shapeIds) as any, {
      format: "png",
      background: true,
      scale: 2,
    })) as { blob: Blob | null } | null;

    if (!imageInfo || !imageInfo.blob) return;

    const file = new File([imageInfo.blob], `diagram-${Date.now()}.png`, {
      type: "image/png",
    });
    onExport(file);
  }, [editor, onExport]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2 text-sm text-slate-700">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Diagram Canvas</div>
        <Button size="sm" className="h-8 bg-slate-900 text-white" onClick={handleExport} disabled={!editor}>
          <ImageDown className="mr-2 h-3.5 w-3.5" />
          Use in Verification
        </Button>
      </div>
      <div className="flex-1">
        <TldrawCanvas onEditorReady={setEditor} />
      </div>
    </div>
  );
}
