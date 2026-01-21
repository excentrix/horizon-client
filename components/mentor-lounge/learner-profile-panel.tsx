"use client";

import { 
  GraduationCap, 
  Briefcase, 
  HeartPulse, 
  Brain,
  Sparkles,
  History
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface LearnerProfilePanelProps {
  academicSnapshot?: Record<string, unknown>;
  careerSnapshot?: Record<string, unknown>;
  wellnessSnapshot?: Record<string, unknown>;
  latestAnalysis?: {
    domain?: string;
    career_stage?: string;
    wellness_level?: string;
    urgency_level?: string;
    key_insights?: string[];
    analyzed_at?: string;
  };
}

export function LearnerProfilePanel({
  academicSnapshot,
  careerSnapshot,
  wellnessSnapshot,
  latestAnalysis,
}: LearnerProfilePanelProps) {
  
  if (!academicSnapshot && !careerSnapshot && !wellnessSnapshot) {
    return (
        <div className="text-center p-4 text-muted-foreground text-sm">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Intelligence profile not yet generated.</p>
        </div>
    );
  }

  const renderSection = (
    title: string, 
    icon: React.ReactNode, 
    data?: Record<string, unknown>
  ) => {
    if (!data) return null;
    
    // Check if this data is AI inferred (mock logic: check for 'confidence' field)
    const isAiInferred = typeof data.confidence === 'number';
    const updatedAt = data.generated_at as string;

    return (
      <div className="mb-4 last:mb-0">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm font-semibold">{title}</span>
            </div>
            <div className="flex gap-1">
                {isAiInferred && (
                    <Badge variant="secondary" className="text-[10px] px-1 h-5 gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI Inferred
                    </Badge>
                )}
            </div>
        </div>
        
        <Card className="bg-card/50">
            <CardContent className="p-3 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(data).slice(0, 6).map(([key, value]) => {
                        if (typeof value === 'object' || key === 'generated_at') return null;
                        return (
                            <div key={key}>
                                <span className="text-muted-foreground capitalize block truncate">
                                    {key.replace(/_/g, ' ')}
                                </span>
                                <span className="font-medium truncate block">
                                    {String(value)}
                                </span>
                            </div>
                        )
                    })}
                </div>
                {updatedAt && (
                   <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2 pt-2 border-t">
                      <History className="w-3 h-3" />
                      Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
                   </div>
                )}
            </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
            <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">
                Current Learner Model
            </h3>
            {renderSection("Academic", <GraduationCap className="w-4 h-4 text-blue-500" />, academicSnapshot)}
            {renderSection("Career", <Briefcase className="w-4 h-4 text-emerald-500" />, careerSnapshot)}

            {/* Latest Analysis Section */}
            {latestAnalysis && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Latest Intelligence Analysis
                </h3>
                <Card className="bg-card/50">
                  <CardContent className="p-3 text-xs space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {latestAnalysis.domain && (
                        <div>
                          <span className="text-muted-foreground block">Domain</span>
                          <Badge variant="outline" className="text-xs mt-1">{latestAnalysis.domain}</Badge>
                        </div>
                      )}
                      {latestAnalysis.career_stage && (
                        <div>
                          <span className="text-muted-foreground block">Career</span>
                          <span className="font-medium">{latestAnalysis.career_stage}</span>
                        </div>
                      )}
                      {latestAnalysis.wellness_level && (
                        <div>
                          <span className="text-muted-foreground block">Wellness</span>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {latestAnalysis.wellness_level}
                          </Badge>
                        </div>
                      )}
                      {latestAnalysis.urgency_level && (
                        <div>
                          <span className="text-muted-foreground block">Urgency</span>
                          <Badge variant="secondary" className="text-xs mt-1">{latestAnalysis.urgency_level}</Badge>
                        </div>
                      )}
                    </div>
                    
                    {latestAnalysis.key_insights && latestAnalysis.key_insights.length > 0 && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground block mb-2">Key Insights</span>
                        <ul className="space-y-1.5">
                          {latestAnalysis.key_insights.map((insight, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-muted-foreground shrink-0">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            {renderSection("Wellness", <HeartPulse className="w-4 h-4 text-rose-500" />, wellnessSnapshot)}
        </div>
      </div>
    </ScrollArea>
  );
}
