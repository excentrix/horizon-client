"use client";

import { ExcalidrawWorkspace } from "./ExcalidrawWorkspace";

interface DiagramWorkspaceProps {
  taskId: string;
  taskTitle: string;
  onExport: (file: File) => void;
  onRequestMentorReview?: (content: string) => void;
}

export function DiagramWorkspace({
  taskId,
  taskTitle,
  onExport,
  onRequestMentorReview,
}: DiagramWorkspaceProps) {
  return (
    <ExcalidrawWorkspace
      taskId={taskId}
      taskTitle={taskTitle}
      surfaceType="diagram_workspace"
      variant="diagram"
      onExport={onExport}
      onRequestMentorReview={onRequestMentorReview}
    />
  );
}
