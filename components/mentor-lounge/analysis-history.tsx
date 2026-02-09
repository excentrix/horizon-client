import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, XCircle, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface AnalysisStageMessage {
  stage: string;
  message: string;
  timestamp: string;
}

interface AnalysisRun {
  id: string;
  conversation_id: string;
  conversation_title: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  progress?: number;
  current_stage?: string;
  stage_messages?: AnalysisStageMessage[];  // Real-time backend messages
  results?: {
    domain?: string;
    career_stage?: string;
    wellness_level?: string;
    urgency_level?: string;
  };
}

interface AnalysisRunCardProps {
  analysis: AnalysisRun;
}

function AnalysisRunCard({ analysis }: AnalysisRunCardProps) {
  const borderColor = 
    analysis.status === 'running' ? 'border-l-blue-500' :
    analysis.status === 'completed' ? 'border-l-green-500' : 
    'border-l-red-500';

  return (
    <Card className={cn("h-24 border-l-4 transition-all", borderColor)}>
      <CardContent className="p-3 h-full flex flex-col">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {analysis.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-blue-500 flex-shrink-0" />}
            {analysis.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />}
            {analysis.status === 'failed' && <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />}
            <span className="text-sm font-medium truncate">{analysis.conversation_title}</span>
          </div>
          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
            {formatDistanceToNow(new Date(analysis.started_at), { addSuffix: true })}
          </span>
        </div>

        {/* Content Row */}
        <div className="flex-1 min-h-0">
          {analysis.status === 'running' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Progress value={analysis.progress || 0} className="h-1 flex-1" />
                <span className="text-xs text-muted-foreground">{analysis.progress || 0}%</span>
              </div>
              {/* Show latest stage message */}
              {analysis.stage_messages && analysis.stage_messages.length > 0 && (
                <div className="text-xs text-muted-foreground truncate">
                  {analysis.stage_messages[analysis.stage_messages.length - 1].message}
                </div>
              )}
            </div>
          )}

          {analysis.status === 'completed' && analysis.results && (
            <div className="flex gap-1.5 flex-wrap">
              {analysis.results.domain && (
                <Badge variant="outline" className="text-xs py-0 h-5">{analysis.results.domain}</Badge>
              )}
              {analysis.results.career_stage && (
                <Badge variant="outline" className="text-xs py-0 h-5">{analysis.results.career_stage}</Badge>
              )}
              {analysis.results.urgency_level && (
                <Badge variant="secondary" className="text-xs py-0 h-5">{analysis.results.urgency_level}</Badge>
              )}
            </div>
          )}

          {analysis.status === 'failed' && (
            <p className="text-xs text-red-500">Analysis failed • Retry available</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AnalysisHistoryProps {
  analyses: AnalysisRun[];
  className?: string;
}

export function AnalysisHistory({ analyses, className }: AnalysisHistoryProps) {
  if (analyses.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center space-y-2", className)}>
        <Brain className="w-8 h-8 opacity-20" />
        <p className="text-xs">No analysis runs yet.</p>
        <p className="text-[10px] opacity-70">Run intelligence analysis to see history</p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-3 p-4">
        {analyses.map((analysis) => (
          <AnalysisRunCard key={analysis.id} analysis={analysis} />
        ))}
      </div>
    </ScrollArea>
  );
}
