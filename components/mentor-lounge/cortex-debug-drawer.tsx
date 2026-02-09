"use client";

import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Cpu } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function CortexDebugDrawer() {
  const history = useMentorLoungeStore((state) => state.cortexRoutingHistory);
  const [isOpen, setIsOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    setShowDebug(process.env.NEXT_PUBLIC_SHOW_CORTEX_DEBUG === "true");
  }, []);

  if (!showDebug) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="rounded-lg border bg-background shadow-lg"
      >
        <div className="flex items-center justify-between p-2 bg-muted/50 rounded-t-lg">
           <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8 p-1 px-2">
              <span className="flex items-center gap-2 text-xs font-semibold">
                <Cpu className="h-4 w-4" />
                 Cortex Routing Debug ({history.length})
              </span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </div>
       
        <CollapsibleContent>
          <ScrollArea className="h-64 p-3">
            {history.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                No routing decisions yet.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((decision, i) => (
                  <div
                    key={i}
                    className="rounded border p-2 text-xs space-y-1 bg-card"
                  >
                    <div className="flex justify-between font-medium">
                      <span className="text-primary">{decision.agent}</span>
                      <span
                        className={cn(
                          decision.confidence > 0.8
                            ? "text-emerald-600"
                            : decision.confidence > 0.5
                              ? "text-amber-600"
                              : "text-rose-600"
                        )}
                      >
                        {(decision.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-muted-foreground">{decision.reason}</p>
                    <p className="text-[10px] text-muted-foreground/50">
                      {new Date(decision.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
