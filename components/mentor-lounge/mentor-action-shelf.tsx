"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { MentorAction } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { telemetry } from "@/lib/telemetry";
import { planningApi } from "@/lib/api";

interface MentorActionShelfProps {
  actions: MentorAction[];
  onSendQuickReply: (message: string) => Promise<void> | void;
  disabled?: boolean;
}

export function MentorActionShelf({
  actions,
  onSendQuickReply,
  disabled,
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
    <Card className="mb-3 border-dashed bg-card/40">
      <CardContent className="flex flex-wrap gap-3 p-3">
        {actions.map((action, index) => (
          <div
            key={`${action.type}-${index}-${action.plan_id ?? action.href ?? ""}`}
            className="flex flex-1 items-center justify-between gap-3 rounded-lg border border-muted bg-background/70 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{action.label}</p>
              {action.description ? (
                <p className="truncate text-xs text-muted-foreground">
                  {action.description}
                </p>
              ) : null}
            </div>
            <Button
              size="sm"
              variant={action.type === "trigger_plan_generation" ? "default" : "secondary"}
              disabled={disabled || loadingIndex !== null}
              onClick={() => void handleAction(action, index)}
            >
              {loadingIndex === index
                ? "Starting…"
                : action.type === "confirm_plan_intent"
                  ? "Confirm"
                  : action.type === "trigger_plan_generation"
                    ? "Build Plan"
                    : action.type === "open_plan_task"
                      ? "Start"
                      : "Open"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
