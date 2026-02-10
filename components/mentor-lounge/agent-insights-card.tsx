"use client";

import { useState } from "react";
import { 
  Cpu,
  Terminal,
  BrainCircuit,
  Zap,
  Bot,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolInvocation, GuardrailsMetadata, SafetyMetadata } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SafetyPill } from "./safety-pill";

interface AgentInsightsCardProps {
  agentTools?: string[];
  toolInvocations?: ToolInvocation[];
  toolRuntimeInvocations?: ToolInvocation[];
  guardrails?: GuardrailsMetadata;
  safety?: SafetyMetadata;
  agentName?: string;
  className?: string;
}

export function AgentInsightsCard({ 
  agentTools = [], 
  toolInvocations = [], 
  toolRuntimeInvocations = [],
  guardrails,

  agentName = "Agent",
}: AgentInsightsCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const runtime = toolRuntimeInvocations || [];
  const activeInvocations = runtime.length > 0 ? runtime : (toolInvocations || []);

  // Don't render if there's nothing interesting to show
  if (!agentTools.length && !activeInvocations.length && !guardrails) return null;

  const hasMemoryProbe = activeInvocations.some(t => t.tool === "semantic_memory_probe");
  const uniqueToolsUsed = Array.from(new Set(activeInvocations.filter(t => t && t.tool).map(t => t.tool)));

  return (
    <div className="mt-4 border-t border-border pt-2 w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
             <div className="flex items-center gap-1 font-medium text-primary">
               <Bot className="h-3 w-3" />
               <span className="uppercase tracking-wider">{agentName}</span>
             </div>
             
             {/* Summary Badges */}
             {uniqueToolsUsed.length > 0 && (
               <span className="flex items-center gap-1">
                 • Used: {uniqueToolsUsed.map(tool => (
                   <span key={tool} className={cn(
                     "px-1 py-0.5 rounded border bg-muted/50",
                     tool === "semantic_memory_probe" && "border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300"
                   )}>
                     {tool.replace(/_/g, " ")}
                   </span>
                 ))}
               </span>
             )}

          </div>

          <CollapsibleTrigger asChild>
            <button className="rounded hover:bg-muted p-1 text-muted-foreground transition-colors">
              {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span className="sr-only">Toggle agent insights</span>
            </button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-2 space-y-3 rounded-md bg-muted/10 p-2 text-xs">
          {/* Agent Identity & Guardrails Section */}
          <div className="flex items-start justify-between border-b pb-2">
             <div>
               <p className="font-semibold text-muted-foreground">Pedagogical Strategy</p>
               <p className="text-muted-foreground/80 mt-0.5">
                 Running {agentTools.length} capabilities. {hasMemoryProbe && "Context-aware memory active."}
               </p>
             </div>
             {guardrails && <SafetyPill metadata={guardrails} />}
          </div>

          {/* Tools Trace */}
          {activeInvocations.length > 0 && (
            <div className="space-y-2">
              <p className="font-semibold text-muted-foreground flex items-center gap-1">
                <Terminal className="h-3 w-3" /> Mentor Cited Sources
              </p>
              <div className="space-y-2">
                {activeInvocations.map((tool, idx) => (
                  <div key={idx} className={cn(
                    "rounded border p-2 bg-background font-mono",
                    tool.tool === "semantic_memory_probe" && "border-purple-200 shadow-sm"
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        {tool.tool === "semantic_memory_probe" ? (
                          <BrainCircuit className="h-3 w-3 text-purple-500" />
                        ) : (
                          <Zap className="h-3 w-3 text-amber-500" />
                        )}
                        <span className={cn(
                          tool.tool === "semantic_memory_probe" && "text-purple-700 dark:text-purple-400"
                        )}>
                          {tool.tool}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground opacity-70">
                        {new Date(tool.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                      </span>
                    </div>
                    
                    <div className="grid gap-1 pl-4 border-l-2 border-muted">
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground select-none">In: </span>
                        <span className="text-foreground/80 break-words">
                          {typeof tool.input === 'object' ? JSON.stringify(tool.input) : tool.input}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground select-none">Out: </span>
                        <span className="text-muted-foreground break-words">
                          {typeof tool.output === 'object' ? JSON.stringify(tool.output) : tool.output}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Available Tools (Optional, maybe debug only? User generic request implies simply visualizing tools access) */}
          {agentTools.length > 0 && (
             <div className="pt-2 border-t mt-2">
               <p className="font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                 <Cpu className="h-3 w-3" /> Available Capabilities
               </p>
               <div className="flex flex-wrap gap-1">
                 {agentTools.map(t => (
                   <Badge key={t} variant="outline" className="text-[10px] font-mono font-normal text-muted-foreground">
                     {t}
                   </Badge>
                 ))}
               </div>
             </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
