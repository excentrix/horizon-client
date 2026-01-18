import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Activity, BookOpen, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntelligenceStatusProps {
  analysisSummary: Record<string, unknown> | null;
  className?: string;
  onViewReport?: () => void;
  agentRuntime?: Array<{
    id: string; 
    agent: string; 
    step: string;  // Matches AgentRuntimeStep.step
    status: string; 
    confidence?: number;
    details?: string;
  }>;
}

type StageHistoryEntry = {
  stage: string;
  message: string;
  timestamp: string;
};

export function IntelligenceStatus({ analysisSummary, className, onViewReport, agentRuntime = [] }: IntelligenceStatusProps) {
  const summaryRecord: Record<string, unknown> =
    analysisSummary ?? { message: "Run an analysis to unlock deeper insights." };

  const asRecord = (value: unknown): Record<string, unknown> | null =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;

  const analysisResult = asRecord(summaryRecord["analysis_result"]) ?? asRecord(summaryRecord["analysis_results"]) ?? {};
  const analysisCore = asRecord(analysisResult["analysis_results"]) ?? analysisResult;
  
  const domainAnalysis = asRecord(analysisCore["domain_analysis"]) ?? {};
  const wellnessAnalysis = asRecord(analysisCore["wellness_analysis"]) ?? {};
  const crisisAnalysis = asRecord(analysisCore["crisis_analysis"]) ?? {};
  
  const progressUpdate = asRecord(summaryRecord["progress_update"]);
  const message = typeof summaryRecord["message"] === "string" ? summaryRecord["message"] : "";
  const stageHistory = Array.isArray(summaryRecord["stage_history"])
    ? (summaryRecord["stage_history"] as StageHistoryEntry[])
    : [];
  
  const insights = Array.isArray(summaryRecord["insights"]) 
    ? (summaryRecord["insights"] as Array<Record<string, unknown>>)
    : [];

  const isAnalyzing = message.toLowerCase().includes("analysis in progress") || 
                      message.toLowerCase().includes("started") ||
                      (progressUpdate && progressUpdate.status !== "completed");

  // Enhanced progress mapping with better stage detection
  const getProgressValue = (status: string, message: string) => {
    const statusLower = status.toLowerCase();
    const messageLower = message.toLowerCase();
    
    // Map status to progress
    if (statusLower.includes("started") || statusLower.includes("pending")) return 10;
    if (statusLower.includes("analyzing") || messageLower.includes("analyzing context")) return 25;
    if (statusLower.includes("extracting") || messageLower.includes("extracting priorities")) return 50;
    if (statusLower.includes("assessing") || messageLower.includes("assessing wellness")) return 75;
    if (statusLower.includes("finalizing") || messageLower.includes("finalizing")) return 90;
    
    // Standard progress stages
    switch (statusLower) {
      case "analysis_started": return 10;
      case "core_analysis_completed": return 60;
      case "context_extraction_completed": return 85;
      case "analysis_saved":
      case "analysis_successful":
      case "analysis_complete":
      case "analysis_completed":
      case "comprehensive_analysis_completed": return 100;
      default: return isAnalyzing ? 30 : 100;
    }
  };

  const progressValue = progressUpdate?.status 
    ? getProgressValue(progressUpdate.status as string, message) 
    : (isAnalyzing ? 30 : 100);
  
  // Estimate remaining time based on progress
  const getEstimatedTime = (progress: number) => {
    if (progress >= 90) return "Almost done...";
    if (progress >= 75) return "~15-30 seconds remaining";
    if (progress >= 50) return "~30-60 seconds remaining";
    if (progress >= 25) return "~60-90 seconds remaining";
    return "Usually takes 60-120 seconds";
  };

  return (
    <Card className={cn("w-full transition-all duration-300 border-l-4", 
      isAnalyzing ? "border-l-primary shadow-md" : "border-l-transparent",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("relative flex h-5 w-5 items-center justify-center rounded-full", isAnalyzing ? "bg-primary/10" : "")}>
              <Brain className={cn("h-4 w-4 transition-colors", isAnalyzing ? "text-primary animate-pulse" : "text-muted-foreground")} />
              {isAnalyzing && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              )}
            </div>
            <div className="flex flex-col">
                <CardTitle className="text-sm font-medium leading-none">
                    {isAnalyzing ? "Brain Active" : "Brain Idle"}
                </CardTitle>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
                    {isAnalyzing ? "Analyzing Context" : "Monitoring"}
                </span>
            </div>
          </div>
          {isAnalyzing ? (
            <Badge variant="secondary" className="gap-1.5 text-xs font-normal">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              Processing
            </Badge>
          ) : onViewReport && Object.keys(analysisCore).length > 0 ? (
            <button 
              onClick={onViewReport}
              className="text-[10px] font-medium text-primary hover:underline"
            >
              View Report
            </button>
          ) : null}
        </div>
        <CardDescription className="flex flex-col gap-2 pt-2">
          <div className="flex items-center gap-2 text-xs">
            <Activity className="h-3 w-3" />
            <span>{message || "Waiting for session activity..."}</span>
          </div>
          {isAnalyzing && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{getEstimatedTime(progressValue)}</span>
                <span className="font-medium">{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-1.5" />
            </div>
          )}
        </CardDescription>

        {stageHistory.length > 0 && (
          <div className="mt-3 rounded-lg border bg-muted/30 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Analysis timeline
            </p>
            <div className="mt-1 space-y-1.5">
              {stageHistory.slice(-4).reverse().map((entry) => {
                const parsedTime = new Date(entry.timestamp);
                const timeDisplay = Number.isNaN(parsedTime.getTime())
                  ? entry.timestamp
                  : parsedTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                return (
                  <div
                    key={`${entry.stage}-${entry.timestamp}`}
                    className="flex items-center justify-between text-[11px] text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">{entry.message}</span>
                    <span>{timeDisplay}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardHeader>
      
      {!isAnalyzing && Object.keys(analysisCore).length > 0 && (
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className={cn("grid w-full mb-4", agentRuntime.length > 0 ? "grid-cols-5" : "grid-cols-4")}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="wellness">Wellness</TabsTrigger>
              <TabsTrigger value="domain">Domain</TabsTrigger>
              {agentRuntime.length > 0 && <TabsTrigger value="runtime">Runtime</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Primary Domain</span>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium capitalize">
                      {String(domainAnalysis["primary_domain"] || "General")}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Urgency Level</span>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn("h-4 w-4", 
                      crisisAnalysis["overall_urgency"] === "critical" ? "text-destructive" : "text-muted-foreground"
                    )} />
                    <Badge variant={crisisAnalysis["overall_urgency"] === "critical" ? "destructive" : "outline"}>
                      {String(crisisAnalysis["overall_urgency"] || "Routine")}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {typeof analysisCore["engagement_score"] === 'number' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Engagement Score</span>
                    <span>{Number(analysisCore["engagement_score"]) * 100}%</span>
                  </div>
                  <Progress value={Number(analysisCore["engagement_score"]) * 100} className="h-2" />
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <ScrollArea className="h-[200px] pr-4">
                {insights.length > 0 ? (
                  <div className="space-y-3">
                    {insights.map((insight, i) => (
                      <div key={i} className="rounded-lg border bg-muted/30 p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span className="font-medium">{String(insight.title || "Insight")}</span>
                        </div>
                        <p className="text-muted-foreground text-xs pl-6">
                          {String(insight.message || insight.description || "")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No specific insights generated for this conversation.
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="wellness" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(wellnessAnalysis).map(([key, value]) => {
                  if (key === "indicators" || typeof value === "object") return null;
                  return (
                    <div key={key} className="space-y-1">
                      <span className="text-xs text-muted-foreground capitalize">
                        {key.replace(/_/g, " ")}
                      </span>
                      <div className="font-medium capitalize">{String(value)}</div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="domain" className="space-y-4">
               <div className="space-y-2">
                 <h4 className="text-sm font-medium">Topics Detected</h4>
                 <div className="flex flex-wrap gap-2">
                   {Array.isArray(domainAnalysis["topics"]) && domainAnalysis["topics"].map((topic: unknown, i: number) => (
                     <Badge key={i} variant="secondary">{String(topic)}</Badge>
                   ))}
                 </div>
               </div>
               {Array.isArray(domainAnalysis["competencies_demonstrated"]) && (
                 <div className="space-y-2 mt-4">
                   <h4 className="text-sm font-medium">Competencies</h4>
                   <div className="flex flex-wrap gap-2">
                     {Array.isArray(domainAnalysis["competencies_demonstrated"]) && 
                      domainAnalysis["competencies_demonstrated"].map((comp: unknown, i: number) => (
                       <Badge key={i} variant="outline">{String(comp)}</Badge>
                     ))}
                   </div>
                 </div>
               )}
            </TabsContent>
             {agentRuntime.length > 0 && (
              <TabsContent value="runtime" className="space-y-4">
                <ScrollArea className="h-[200px] pr-4">
                  <div className="space-y-2">
                    {agentRuntime.slice(0, 10).map((runtimeStep) => (
                      <div key={runtimeStep.id} className="rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize">{runtimeStep.agent}</span>
                          <Badge variant={
                           runtimeStep.status === 'completed' ? 'default' :
                            runtimeStep.status === 'failed' ? 'destructive' : 'secondary'
                          }>{runtimeStep.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{runtimeStep.step}</p>
                        {runtimeStep.confidence !== undefined && (
                          <div className="mt-2">
                            <Progress value={runtimeStep.confidence * 100} className="h-1" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
