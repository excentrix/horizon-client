'use client';

import { useState } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { telemetry } from '@/lib/telemetry';

interface ReflectionPromptProps {
  prompts: string[];
  onSubmit?: (responses: Record<string, string>) => void;
}

export function ReflectionPrompt({ prompts, onSubmit }: ReflectionPromptProps) {
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentPrompt = prompts[currentIndex];
  const currentResponse = responses[currentIndex] || '';
  const canSubmit = currentResponse.trim().length >= 10;
  const isLastPrompt = currentIndex === prompts.length - 1;

  const handleResponseChange = (value: string) => {
    setResponses((prev) => ({
      ...prev,
      [currentIndex]: value,
    }));
  };

  const handleNext = async () => {
    if (!canSubmit) return;

    if (isLastPrompt) {
      // Submit all responses
      setIsSubmitting(true);

      const formattedResponses = prompts.reduce((acc, prompt, index) => {
        acc[prompt] = responses[index] || '';
        return acc;
      }, {} as Record<string, string>);

      telemetry.track('inline_content_interaction', {
        content_type: 'reflection',
        action: 'reflection_submitted',
        prompt_count: prompts.length,
        total_chars: Object.values(responses).join('').length,
      });

      // Simulate brief processing time
      await new Promise((resolve) => setTimeout(resolve, 500));

      setIsSubmitting(false);
      setCompleted(true);
      onSubmit?.(formattedResponses);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (completed) {
    return (
      <div className="rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-6 text-center dark:border-violet-800 dark:from-violet-950/20 dark:to-purple-950/20">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
          <Sparkles className="h-6 w-6 text-violet-600 dark:text-violet-400" />
        </div>
        <h3 className="mt-3 font-semibold text-violet-900 dark:text-violet-100">
          Reflection Saved
        </h3>
        <p className="mt-1 text-sm text-violet-700 dark:text-violet-300">
          Your thoughts have been recorded. Great self-reflection!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {prompts.map((_, index) => (
          <div
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index < currentIndex
                ? 'bg-violet-500'
                : index === currentIndex
                ? 'bg-violet-300'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Prompt */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          Reflection {currentIndex + 1} of {prompts.length}
        </p>
        <p className="text-base font-medium text-foreground">{currentPrompt}</p>
      </div>

      {/* Response input */}
      <Textarea
        value={currentResponse}
        onChange={(e) => handleResponseChange(e.target.value)}
        placeholder="Share your thoughts..."
        className="min-h-[100px] resize-none"
        disabled={isSubmitting}
      />

      {/* Character hint */}
      <p className="text-xs text-muted-foreground">
        {currentResponse.length < 10
          ? `Write at least ${10 - currentResponse.length} more character${10 - currentResponse.length === 1 ? '' : 's'}`
          : '✓ Ready to continue'}
      </p>

      {/* Action */}
      <div className="flex justify-end">
        <Button
          onClick={handleNext}
          disabled={!canSubmit || isSubmitting}
          size="sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isLastPrompt ? (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Reflection
            </>
          ) : (
            'Next Prompt'
          )}
        </Button>
      </div>
    </div>
  );
}
