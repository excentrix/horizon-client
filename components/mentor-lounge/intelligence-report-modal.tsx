import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb,
  BookOpen,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IntelligenceReportModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  analysisSummary: Record<string, unknown> | null;
}

export function IntelligenceReportModal({
  isOpen,
  onOpenChange,
  analysisSummary,
}: IntelligenceReportModalProps) {
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
  const sentimentAnalysis = asRecord(analysisCore["sentiment_analysis"]) ?? {};
  
  const insights = Array.isArray(analysisSummary["insights"]) 
    ? (analysisSummary["insights"] as Array<Record<string, unknown>>)
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <DialogTitle>Intelligence Report</DialogTitle>
          </div>
          <DialogDescription>
            Comprehensive analysis of your learning session and progress.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="domain">Knowledge</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="wellness">Wellness</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full pr-4">
              <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4 bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-primary" />
                      <h3 className="font-medium text-sm">Primary Domain</h3>
                    </div>
                    <p className="text-2xl font-bold capitalize">
                      {String(domainAnalysis["primary_domain"] || "General")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Detected focus area
                    </p>
                  </div>

                  <div className="rounded-lg border p-4 bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h3 className="font-medium text-sm">Engagement</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-2xl font-bold">
                          {Math.round(Number(analysisCore["engagement_score"] || 0) * 100)}%
                        </span>
                      </div>
                      <Progress value={Number(analysisCore["engagement_score"] || 0) * 100} className="h-2" />
                    </div>
                  </div>

                  <div className="rounded-lg border p-4 bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className={cn("h-4 w-4", 
                        crisisAnalysis["overall_urgency"] === "critical" ? "text-destructive" : "text-muted-foreground"
                      )} />
                      <h3 className="font-medium text-sm">Urgency Level</h3>
                    </div>
                    <Badge variant={crisisAnalysis["overall_urgency"] === "critical" ? "destructive" : "secondary"} className="text-sm">
                      {String(crisisAnalysis["overall_urgency"] || "Routine")}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-lg border p-4 bg-muted/20">
                  <h3 className="font-medium mb-3">Executive Summary</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {String(analysisCore["summary"] || "No summary available for this session.")}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="domain" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" /> Topics Covered
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(domainAnalysis["topics"]) && domainAnalysis["topics"].map((topic: unknown, i: number) => (
                        <Badge key={i} variant="secondary" className="px-3 py-1">
                          {String(topic)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="rounded-lg border p-4">
                      <h3 className="text-sm font-medium mb-3">Competencies Demonstrated</h3>
                      <div className="space-y-2">
                        {Array.isArray(domainAnalysis["competencies_demonstrated"]) && domainAnalysis["competencies_demonstrated"].length > 0 ? (
                          domainAnalysis["competencies_demonstrated"].map((comp: unknown, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                              <span>{String(comp)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No specific competencies detected yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h3 className="text-sm font-medium mb-3">Knowledge Gaps</h3>
                      <div className="space-y-2">
                        {Array.isArray(domainAnalysis["knowledge_gaps"]) && domainAnalysis["knowledge_gaps"].length > 0 ? (
                          domainAnalysis["knowledge_gaps"].map((gap: unknown, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              <span>{String(gap)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No significant knowledge gaps detected.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="insights" className="space-y-4 mt-0">
                {insights.length > 0 ? (
                  <div className="grid gap-4">
                    {insights.map((insight, i) => (
                      <div key={i} className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 bg-primary/10 p-2 rounded-full">
                            <Lightbulb className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-1">{String(insight.title || "Insight")}</h4>
                            <p className="text-sm text-muted-foreground">
                              {String(insight.message || insight.description || "")}
                            </p>
                            {Boolean(insight.actionable) && (
                              <Badge variant="outline" className="mt-2 text-xs">Actionable</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mb-2 opacity-20" />
                    <p>No specific insights generated for this conversation yet.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="wellness" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Emotional State
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(wellnessAnalysis).map(([key, value]) => {
                        if (key === "indicators" || typeof value === "object") return null;
                        return (
                          <div key={key} className="flex justify-between items-center border-b pb-2 last:border-0">
                            <span className="text-sm text-muted-foreground capitalize">
                              {key.replace(/_/g, " ")}
                            </span>
                            <span className="text-sm font-medium capitalize">{String(value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4">Wellness Indicators</h3>
                    <div className="space-y-2">
                      {Array.isArray(wellnessAnalysis["indicators"]) && wellnessAnalysis["indicators"].length > 0 ? (
                        wellnessAnalysis["indicators"].map((ind: unknown, i: number) => (
                          <Badge key={i} variant="outline" className="mr-2 mb-2">
                            {String(ind)}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No specific indicators detected.</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sentiment" className="space-y-6 mt-0">
                 <div className="rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4">Sentiment Analysis</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Overall Tone</span>
                        <span className="text-sm font-medium capitalize">
                          {String(sentimentAnalysis["overall_sentiment"] || "Neutral")}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Confidence</span>
                          <span>{Math.round(Number(sentimentAnalysis["confidence_score"] || 0) * 100)}%</span>
                        </div>
                        <Progress value={Number(sentimentAnalysis["confidence_score"] || 0) * 100} className="h-2" />
                      </div>
                    </div>
                 </div>
              </TabsContent>
            </ScrollArea>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
