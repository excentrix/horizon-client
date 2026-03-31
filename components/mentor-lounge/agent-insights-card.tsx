"use client";

import { useState } from "react";
import { Bot, ChevronDown, ChevronUp, Cpu, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GuardrailsMetadata, SafetyMetadata, ToolInvocation } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SafetyPill } from "./safety-pill";

const extractSnippet = (value: unknown): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    try {
      return extractSnippet(JSON.parse(trimmed) as unknown);
    } catch {
      return trimmed.replace(/\s+/g, " ").slice(0, 120);
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const snippet = extractSnippet(item);
      if (snippet) {
        return snippet;
      }
    }
    return "";
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of [
      "reason",
      "summary",
      "message",
      "explanation",
      "rationale",
      "fallback_reason",
      "output",
      "input",
      "query",
      "label",
      "title",
    ]) {
      const snippet = extractSnippet(record[key]);
      if (snippet) {
        return snippet;
      }
    }
  }

  return "";
};

const humanizeToolName = (tool: string) =>
  tool?.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

interface AgentInsightsCardProps {
  agentTools?: string[];
  toolInvocations?: ToolInvocation[];
  toolRuntimeInvocations?: ToolInvocation[];
  guardrails?: GuardrailsMetadata;
  safety?: SafetyMetadata;
  agentName?: string;
  reason?: string;
  className?: string;
}

export function AgentInsightsCard({
  agentTools = [],
  toolInvocations = [],
  toolRuntimeInvocations = [],
  guardrails,
  agentName = "Agent",
  reason,
  className,
}: AgentInsightsCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const runtime = toolRuntimeInvocations || [];
  const activeInvocations = runtime.length > 0 ? runtime : (toolInvocations || []);
  const summaryReason = extractSnippet(reason);
  const hasMemoryProbe = activeInvocations.some((tool) => tool.tool === "semantic_memory_probe");
  const uniqueToolsUsed = Array.from(
    new Set(activeInvocations.filter((tool) => tool && tool.tool).map((tool) => tool.tool)),
  );
  const invocationSummaries = activeInvocations
    .map((tool) => {
      const toolLabel = humanizeToolName(tool.tool);
      const explanation =
        extractSnippet(tool.output) ||
        extractSnippet(tool.input) ||
        (tool.status === "error" ? "it returned an error" : "it was the best available step");
      return `${agentName} used ${toolLabel} because ${explanation}`;
    })
    .slice(0, 3);

  if (!agentTools.length && !activeInvocations.length && !guardrails && !summaryReason) {
    return null;
  }

  return (
    <div className={cn("mt-4 w-full border-t border-border pt-2", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1 font-medium text-primary">
              <Bot className="h-3 w-3" />
              <span className="uppercase tracking-wider">{agentName}</span>
            </div>
            {uniqueToolsUsed.length > 0 ? (
              <span className="flex items-center gap-1">
                Used:
                {uniqueToolsUsed.map((tool) => (
                  <span
                    key={tool}
                    className={cn(
                      "rounded border px-1 py-0.5",
                      tool === "semantic_memory_probe" &&
                        "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
                    )}
                  >
                    {tool.replace(/_/g, " ")}
                  </span>
                ))}
              </span>
            ) : null}
          </div>

          <CollapsibleTrigger asChild>
            <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted">
              {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span className="sr-only">Toggle agent insights</span>
            </button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-2 space-y-3 rounded-md bg-muted/10 p-2 text-xs">
          <div className="flex items-start justify-between border-b pb-2">
            <div>
              <p className="font-semibold text-muted-foreground">Pedagogical Strategy</p>
              <p className="mt-0.5 text-muted-foreground/80">
                Running {agentTools.length} capabilities. {hasMemoryProbe ? "Context-aware memory active." : null}
              </p>
              {summaryReason ? (
                <p className="mt-1 text-foreground/80">
                  {agentName} chose this path because {summaryReason}
                </p>
              ) : null}
            </div>
            {guardrails ? <SafetyPill metadata={guardrails} /> : null}
          </div>

          {(invocationSummaries.length > 0 || activeInvocations.length > 0) ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1 font-semibold text-muted-foreground">
                <Terminal className="h-3 w-3" /> Mentor reasoning
              </p>
              <div className="space-y-2">
                {(invocationSummaries.length > 0
                  ? invocationSummaries
                  : [`${agentName} reviewed the available context before answering.`]
                ).map((summary, idx) => (
                  <div
                    key={`${summary}-${idx}`}
                    className={cn(
                      "rounded border bg-background px-3 py-2 text-[11px] leading-5",
                      idx === 0 && "border-primary/20 bg-primary/5",
                    )}
                  >
                    {summary}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {agentTools.length > 0 ? (
            <div className="mt-2 border-t pt-2">
              <p className="mb-1 flex items-center gap-1 font-semibold text-muted-foreground">
                <Cpu className="h-3 w-3" /> Available Capabilities
              </p>
              <div className="flex flex-wrap gap-1">
                {agentTools.map((tool) => (
                  <Badge
                    key={tool}
                    variant="outline"
                    className="text-[10px] font-mono font-normal text-muted-foreground"
                  >
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
