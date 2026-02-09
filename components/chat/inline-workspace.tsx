'use client';

import { QuizWidget, TaskPreview, ReflectionPrompt,  } from '@/components/workspaces';
import type { QuizQuestion, TaskData } from '@/components/workspaces';

export interface InlineContent {
  content_type: 'quiz' | 'code' | 'reflection' | 'task_preview';
  data: Record<string, unknown>;
  interactions_enabled?: boolean;
}

interface InlineWorkspaceProps {
  content: InlineContent;
  onComplete?: (result: unknown) => void;
}

export function InlineWorkspace({ content, onComplete }: InlineWorkspaceProps) {
  const handleComplete = (result: unknown) => {
    onComplete?.(result);
  };

  switch (content.content_type) {
    case 'quiz':
      return (
        <QuizWidget
          questions={content.data.questions as QuizQuestion[]}
          onComplete={handleComplete}
        />
      );

    case 'task_preview':
      return (
        <TaskPreview
          task={content.data.task as TaskData}
          onStartTask={() => handleComplete({ action: 'start_task' })}
        />
      );

    case 'reflection':
      return (
        <ReflectionPrompt
          prompts={content.data.prompts as string[]}
          onSubmit={(responses: Record<string, string>) => handleComplete({ responses })}
        />
      );

    case 'code':
      // CodePlayground will be implemented in Phase 3
      return (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Code playground coming soon...
          </p>
        </div>
      );

    default:
      return null;
  }
}
