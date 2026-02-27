"use client";

import { useEffect } from "react";
import { Tldraw, type Editor } from "tldraw";

interface TldrawClientProps {
  onEditorReady: (editor: Editor) => void;
}

export default function TldrawClient({ onEditorReady }: TldrawClientProps) {
  useEffect(() => {
    // no-op placeholder to keep client component mounted
  }, []);

  return (
    <Tldraw
      onMount={(editor) => {
        onEditorReady(editor);
      }}
    />
  );
}
