/**
 * Flow Starter Card - Contextual next-action suggestion on the dashboard.
 */
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Flame,
  Target,
  Trophy,
  Zap,
  Compass,
  X,
  ArrowRight,
} from 'lucide-react';
import type { FlowSuggestion } from '@/hooks/use-flow-suggestion';
import { useAcceptSuggestion, useDismissSuggestion } from '@/hooks/use-flow-suggestion';
import { InlineWorkspace, type InlineContent } from '@/components/chat/inline-workspace';
import { toast } from 'sonner';

interface FlowStarterProps {
  suggestion: FlowSuggestion;
  shownAt: Date;
}

const SUGGESTION_ICONS = {
  continue: Target,
  quick_win: Flame,
  celebrate: Trophy,
  stretch: Zap,
  explore: Compass,
  personalize: Sparkles,
  alternate: Target,
  nudge: Sparkles,
  showcase: Trophy,
  apply: Zap,
};

const ACCENT_COLORS: Record<string, { bg: string; icon: string; button: string }> = {
  continue:    { bg: 'bg-blue-50 dark:bg-blue-950/20',    icon: 'text-blue-600 dark:text-blue-400',    button: 'bg-blue-600 hover:bg-blue-700 text-white' },
  quick_win:   { bg: 'bg-orange-50 dark:bg-orange-950/20', icon: 'text-orange-600 dark:text-orange-400', button: 'bg-orange-500 hover:bg-orange-600 text-white' },
  celebrate:   { bg: 'bg-amber-50 dark:bg-amber-950/20',  icon: 'text-amber-600 dark:text-amber-400',  button: 'bg-amber-500 hover:bg-amber-600 text-white' },
  stretch:     { bg: 'bg-purple-50 dark:bg-purple-950/20', icon: 'text-purple-600 dark:text-purple-400', button: 'bg-purple-600 hover:bg-purple-700 text-white' },
  explore:     { bg: 'bg-emerald-50 dark:bg-emerald-950/20', icon: 'text-emerald-600 dark:text-emerald-400', button: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  apply:       { bg: 'bg-cyan-50 dark:bg-cyan-950/20',    icon: 'text-cyan-600 dark:text-cyan-400',    button: 'bg-cyan-600 hover:bg-cyan-700 text-white' },
  personalize: { bg: 'bg-violet-50 dark:bg-violet-950/20', icon: 'text-violet-600 dark:text-violet-400', button: 'bg-violet-600 hover:bg-violet-700 text-white' },
  alternate:   { bg: 'bg-indigo-50 dark:bg-indigo-950/20', icon: 'text-indigo-600 dark:text-indigo-400', button: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  nudge:       { bg: 'bg-pink-50 dark:bg-pink-950/20',    icon: 'text-pink-600 dark:text-pink-400',    button: 'bg-pink-600 hover:bg-pink-700 text-white' },
  showcase:    { bg: 'bg-amber-50 dark:bg-amber-950/20',  icon: 'text-amber-600 dark:text-amber-400',  button: 'bg-amber-500 hover:bg-amber-600 text-white' },
};

const DEFAULT_ACCENT = { bg: 'bg-muted', icon: 'text-muted-foreground', button: 'bg-primary hover:bg-primary/90 text-primary-foreground' };

export function FlowStarter({ suggestion, shownAt }: FlowStarterProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const acceptMutation = useAcceptSuggestion();
  const dismissMutation = useDismissSuggestion();

  const accent = ACCENT_COLORS[suggestion.type] ?? DEFAULT_ACCENT;
  const Icon = SUGGESTION_ICONS[suggestion.type] ?? Sparkles;

  const handleAccept = () => {
    if (suggestion.log_id) {
      acceptMutation.mutate({ logId: suggestion.log_id, suggestionType: suggestion.type, shownAt });
    }

    if (suggestion.type === 'continue' && suggestion.metadata?.plan_id) {
      router.push(`/plans/${suggestion.metadata.plan_id}`);
    } else if (suggestion.type === 'explore') {
      router.push('/plans');
    } else if (suggestion.type === 'celebrate') {
      router.push('/profile');
    } else if (suggestion.type === 'apply' && suggestion.metadata?.plan_id) {
      router.push(`/plans/${suggestion.metadata.plan_id}`);
    }

    toast.success("Let's go!");
  };

  const handleDismiss = () => {
    if (suggestion.log_id) {
      dismissMutation.mutate({ logId: suggestion.log_id, suggestionType: suggestion.type, shownAt });
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className={`col-span-full rounded-2xl border border-border/60 ${accent.bg} relative overflow-hidden`}>
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-full p-1.5 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss suggestion"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="px-5 pt-5 pb-4">
        {/* Header */}
        <div className="flex items-start gap-3 pr-8">
          <div className={`mt-0.5 shrink-0 rounded-xl p-2 ${accent.bg}`}>
            <Icon className={`h-5 w-5 ${accent.icon}`} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground leading-snug">{suggestion.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{suggestion.message}</p>
          </div>
        </div>

        {/* Inline content — quiz, reflection, task preview */}
        {suggestion.inline_content && (
          <div className="mt-4 rounded-xl border border-border/50 bg-background/80 p-4">
            <InlineWorkspace
              content={suggestion.inline_content as InlineContent}
              onComplete={() => {
                if (suggestion.log_id) {
                  acceptMutation.mutate({ logId: suggestion.log_id, suggestionType: suggestion.type, shownAt });
                }
                toast.success('Great work!');
              }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            onClick={handleAccept}
            size="sm"
            className={`gap-1.5 ${accent.button}`}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? 'Loading...' : suggestion.action_label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={dismissMutation.isPending}
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
