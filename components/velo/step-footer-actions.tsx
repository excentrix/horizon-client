"use client";

import { Button } from "@/components/ui/button";

interface StepFooterActionsProps {
  onBack?: () => void;
  onContinue?: () => void;
  backDisabled?: boolean;
  continueDisabled?: boolean;
  continueLabel?: string;
  isSaving?: boolean;
  savedAtLabel?: string | null;
}

export function StepFooterActions({
  onBack,
  onContinue,
  backDisabled,
  continueDisabled,
  continueLabel = "Continue",
  isSaving = false,
  savedAtLabel,
}: StepFooterActionsProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {isSaving ? "Saving draft..." : savedAtLabel ? `Saved ${savedAtLabel}` : ""}
        </div>
        <div className="flex items-center gap-2">
          {onBack ? (
            <Button variant="outline" onClick={onBack} disabled={backDisabled}>
              Back
            </Button>
          ) : null}
          {onContinue ? (
            <Button onClick={onContinue} disabled={continueDisabled}>
              {continueLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
