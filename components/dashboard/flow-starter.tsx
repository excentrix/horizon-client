/**
 * Flow Starter Card - Hero CTA on dashboard showing contextual next action.
 */
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Flame, 
  Target, 
  Trophy, 
  Zap, 
  Compass,
  X 
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
};

const SUGGESTION_COLORS = {
  continue: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
  quick_win: 'from-orange-500/10 to-red-500/10 border-orange-500/20',
  celebrate: 'from-yellow-500/10 to-amber-500/10 border-yellow-500/20',
  stretch: 'from-purple-500/10 to-violet-500/10 border-purple-500/20',
  explore: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
  personalize: 'from-violet-500/10 to-fuchsia-500/10 border-violet-500/20',
  alternate: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/20',
  nudge: 'from-pink-500/10 to-rose-500/10 border-pink-500/20',
  showcase: 'from-amber-500/10 to-orange-500/10 border-amber-500/20',
};

function getPriorityBadge(priority: number) {
  if (priority >= 8) {
    return <Badge className="bg-red-500/10 text-red-700 dark:text-red-300">Urgent</Badge>;
  } else if (priority >= 6) {
    return <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-300">High</Badge>;
  } else if (priority >= 4) {
    return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300">Medium</Badge>;
  }
  return <Badge variant="outline">Low</Badge>;
}

export function FlowStarter({ suggestion, shownAt }: FlowStarterProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const acceptMutation = useAcceptSuggestion();
  const dismissMutation = useDismissSuggestion();

  const Icon = SUGGESTION_ICONS[suggestion.type] || Sparkles;
  const colorClass = SUGGESTION_COLORS[suggestion.type] || SUGGESTION_COLORS.explore;

  const handleAccept = () => {
    if (suggestion.log_id) {
      acceptMutation.mutate({
        logId: suggestion.log_id,
        suggestionType: suggestion.type,
        shownAt,
      });
    }

    // Navigate based on suggestion type
    if (suggestion.type === 'continue' && suggestion.metadata?.plan_id) {
      router.push(`/learning-plans/${suggestion.metadata.plan_id}`);
    } else if (suggestion.type === 'explore') {
      router.push('/learning-plans');
    } else if (suggestion.type === 'celebrate') {
      router.push('/profile');
    }

    toast.success('Let\'s go! 🚀');
  };

  const handleDismiss = () => {
    if (suggestion.log_id) {
      dismissMutation.mutate({
        logId: suggestion.log_id,
        suggestionType: suggestion.type,
        shownAt,
      });
    }

    setDismissed(true);
  };

  if (dismissed) {
    return null;
  }

  return (
    <Card className={`col-span-full border-2 bg-gradient-to-br ${colorClass} relative overflow-hidden`}>
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        aria-label="Dismiss suggestion"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <CardHeader>
        <div className="flex items-start justify-between pr-8">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 p-3">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">{suggestion.title}</CardTitle>
              <CardDescription className="mt-2 text-base">
                {suggestion.message}
              </CardDescription>
            </div>
          </div>
          {getPriorityBadge(suggestion.priority)}
        </div>
      </CardHeader>

      {/* Inline content - Quiz, TaskPreview, Reflection */}
      {suggestion.inline_content && (
        <CardContent>
          <div className="rounded-lg border bg-background/80 p-4">
            <InlineWorkspace 
              content={suggestion.inline_content as InlineContent}
              onComplete={(result) => {
                // Handle inline content completion
                if (suggestion.log_id) {
                  acceptMutation.mutate({
                    logId: suggestion.log_id,
                    suggestionType: suggestion.type,
                    shownAt,
                  });
                }
                toast.success('Great work! 🎉');
              }}
            />
          </div>
        </CardContent>
      )}

      <CardFooter className="gap-3">
        <Button
          onClick={handleAccept}
          size="lg"
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700"
          disabled={acceptMutation.isPending}
        >
          {acceptMutation.isPending ? 'Loading...' : suggestion.action_label}
        </Button>
        <Button
          onClick={handleDismiss}
          variant="ghost"
          size="lg"
          disabled={dismissMutation.isPending}
        >
          Not now
        </Button>
      </CardFooter>
    </Card>
  );
}
