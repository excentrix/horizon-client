"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Sparkles, X } from "lucide-react";
import type { MentorAction } from "@/types";
import { Button } from "@/components/ui/button";
import { telemetry } from "@/lib/telemetry";
import { planningApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface MentorActionShelfProps {
  actions: MentorAction[];
  onSendQuickReply: (message: string) => Promise<void> | void;
  disabled?: boolean;
  onDismissAction?: (action: MentorAction) => void;
}

export function MentorActionShelf({
  actions,
  onSendQuickReply,
  disabled,
  onDismissAction,
}: MentorActionShelfProps) {
  const router = useRouter();
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

  const handleAction = useCallback(
    async (action: MentorAction, index: number) => {
      if (disabled || loadingIndex !== null) {
        return;
      }

      switch (action.type) {
        case "confirm_plan_intent": {
          const template =
            action.message_template ??
            "Yes, let's go ahead with the plan we discussed.";
          void onSendQuickReply(template);
          break;
        }
        case "trigger_plan_generation": {
          const data = action.data ?? {};
          const intent = (data.intent as string) || (data.topic as string) || "";
          const plan_type = (data.plan_type as "academic" | "exploration" | "project_based") || "exploration";
          if (!intent) {
            telemetry.info("trigger_plan_generation action missing intent", { action });
            break;
          }
          setLoadingIndex(index);
          try {
            await planningApi.createStandalonePlan({ intent, plan_type });
            toast.success("Learning plan is being built — we'll notify you when it's ready.");
            router.push("/plans");
          } catch {
            toast.error("Could not start plan generation. Please try again.");
          } finally {
            setLoadingIndex(null);
          }
          break;
        }
        case "view_plan": {
          if (action.plan_id) {
            router.push(`/plans?plan=${action.plan_id}`);
          } else if (action.href) {
            router.push(action.href);
          }
          break;
        }
        case "open_plan_task": {
          if (action.plan_id) {
            const search = action.task_id
              ? `?plan=${action.plan_id}&task=${action.task_id}`
              : `?plan=${action.plan_id}`;
            router.push(`/plans${search}`);
          } else if (action.href) {
            router.push(action.href);
          } else {
            telemetry.info("Plan task action missing plan id", { action });
          }
          break;
        }
        case "open_link": {
          if (action.href) {
            window.open(action.href, "_blank");
          }
          break;
        }
        default: {
          telemetry.info("Unhandled mentor action", { action });
        }
      }
    },
    [disabled, loadingIndex, onSendQuickReply, router],
  );

  if (!actions?.length) {
    return null;
  }

  return (
    <div className="mb-2 space-y-2">
      {actions.map((action, index) => {
        const isPlanAction =
          action.type === "view_plan" || action.type === "open_plan_task";

        const buttonLabel =
          loadingIndex === index
            ? "Starting…"
            : action.type === "confirm_plan_intent"
              ? "Confirm"
              : action.type === "trigger_plan_generation"
                ? "Build Plan"
                : action.type === "open_plan_task"
                  ? "Start"
                  : "Open";

        return (
          <div
            key={`${action.type}-${index}-${action.plan_id ?? action.href ?? ""}`}
            className={cn(
              "group flex items-center gap-3 rounded-xl border px-3 py-2.5 shadow-sm",
              isPlanAction
                ? "border-primary/20 bg-gradient-to-r from-primary/5 via-background to-background"
                : "border-border/80 bg-background",
            )}
          >
            {isPlanAction && onDismissAction ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg  text-red-400 hover:text-red-600 hover:shadow-red-200/50 focus-visible:ring-red-400/50"
                disabled={disabled || loadingIndex !== null}
                onClick={() => onDismissAction(action)}
                aria-label="Dismiss action"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
            {isPlanAction ? (
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight">
                {action.label}
              </p>
              {action.description ? (
                <p className="truncate text-xs text-muted-foreground">
                  {action.description}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={
                  action.type === "trigger_plan_generation"
                    ? "default"
                    : "secondary"
                }
                className={cn(isPlanAction ? "rounded-lg px-3.5 cursor-pointer" : "")}
                disabled={disabled || loadingIndex !== null}
                onClick={() => void handleAction(action, index)}
              >
                {buttonLabel}
                {isPlanAction ? (
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                ) : null}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
