'use client';

import { Clock, BookOpen, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface TaskData {
  id: string;
  title: string;
  description: string;
  estimated_duration_minutes: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  task_type: string;
  resources?: { title: string; url: string }[];
}

interface TaskPreviewProps {
  task: TaskData;
  onStartTask?: () => void;
}

const difficultyConfig = {
  beginner: {
    label: 'Beginner',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  intermediate: {
    label: 'Intermediate',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  advanced: {
    label: 'Advanced',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
};

const taskTypeIcons: Record<string, string> = {
  practice: '💻',
  reading: '📖',
  video: '🎬',
  application: '🔧',
  review: '🔄',
  assessment: '📝',
  project: '🚀',
  discussion: '💬',
  research: '🔍',
  hands_on: '🛠️',
};

export function TaskPreview({ task, onStartTask }: TaskPreviewProps) {
  const difficulty = difficultyConfig[task.difficulty_level];
  const typeIcon = taskTypeIcons[task.task_type] || '📌';

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeIcon}</span>
          <h4 className="font-semibold text-foreground">{task.title}</h4>
        </div>
        <Badge variant="secondary" className={cn('shrink-0', difficulty.color)}>
          {difficulty.label}
        </Badge>
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
        {task.description}
      </p>

      {/* Meta */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{task.estimated_duration_minutes} min</span>
        </div>
        <div className="flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" />
          <span className="capitalize">{task.task_type.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Resources */}
      {task.resources && task.resources.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Resources:</p>
          <div className="flex flex-wrap gap-2">
            {task.resources.slice(0, 3).map((resource, index) => (
              <a
                key={index}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                {resource.title}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      <div className="mt-4">
        <Button onClick={onStartTask} size="sm" className="w-full sm:w-auto">
          Start Task
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
