import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Activity, BookOpen, Briefcase, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntelligenceStatusProps {
  analysisSummary: Record<string, unknown> | null;
  className?: string;
}

export function IntelligenceStatus({ analysisSummary, className }: IntelligenceStatusProps) {
  if (!analysisSummary) return null;

  const asRecord = (value: unknown): Record<string, unknown> | null =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;

  const analysisResult = asRecord(analysisSummary["analysis_result"]) ?? asRecord(analysisSummary["analysis_results"]) ?? {};
  const analysisCore = asRecord(analysisResult["analysis_results"]) ?? analysisResult;
  
  const domainAnalysis = asRecord(analysisCore["domain_analysis"]) ?? {};
  const wellnessAnalysis = asRecord(analysisCore["wellness_analysis"]) ?? {};
  const crisisAnalysis = asRecord(analysisCore["crisis_analysis"]) ?? {};
  
  const progressUpdate = asRecord(analysisSummary["progress_update"]);
  const message = typeof analysisSummary["message"] === "string" ? analysisSummary["message"] : "";
  
  const insights = Array.isArray(analysisSummary["insights"]) 
    ? (analysisSummary["insights"] as Array<Record<string, unknown>>)
    : [];

  const isAnalyzing = message.toLowerCase().includes("analysis in progress") || 
                      message.toLowerCase().includes("started") ||
                      (progressUpdate && progressUpdate.status !== "completed");

  const getProgressValue = (status: string) => {
    switch (status) {
      case "analysis_started": return 10;
      case "core_analysis_completed": return 40;
      case "context_extraction_completed": return 70;
      case "comprehensive_analysis_completed": return 100;
      default: return isAnalyzing ? 30 : 100;
    }
  };

  const progressValue = progressUpdate?.status 
    ? getProgressValue(progressUpdate.status as string) 
    : (isAnalyzing ? 30 : 100);

  return (
    <Card className={cn("w-full transition-all duration-300", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Intelligence Analysis</CardTitle>
          </div>
          {isAnalyzing && (
            <Badge variant="outline" className="animate-pulse gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing
            </Badge>
          )}
        </div>
        <CardDescription className="flex flex-col gap-2">
          <span>{message || "Ready for analysis"}</span>
          {isAnalyzing && (
            <Progress value={progressValue} className="h-1" />
          )}
        </CardDescription>
      </CardHeader>
      
      {!isAnalyzing && Object.keys(analysisCore).length > 0 && (
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="wellness">Wellness</TabsTrigger>
              <TabsTrigger value="domain">Domain</TabsTrigger>
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
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
