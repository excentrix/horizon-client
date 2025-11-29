import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionGoalProps {
  goal?: string | null;
  planTitle?: string | null;
  className?: string;
}

export function SessionGoal({ goal, planTitle, className }: SessionGoalProps) {
  if (!goal && !planTitle) return null;

  return (
    <Card className={cn("bg-muted/30 border-none shadow-none", className)}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <Target className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Current Focus
            </span>
            {planTitle && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                {planTitle}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium truncate">
            {goal || "Exploring new topics"}
          </p>
        </div>
        {planTitle && (
            <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
        )}
      </CardContent>
    </Card>
  );
}
