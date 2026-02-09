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
  latestAnalysis?: Record<string, unknown>;
}

export function LearnerProfilePanel({
  academicSnapshot,
  careerSnapshot,
  wellnessSnapshot,
  latestAnalysis,
}: LearnerProfilePanelProps) {
  
  if (!academicSnapshot && !careerSnapshot && !wellnessSnapshot && !latestAnalysis) {
    return (
        <div className="text-center p-4 text-muted-foreground text-sm">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Intelligence profile not yet generated.</p>
        </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        <div>
            <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">
                Current Learner Model
            </h3>
            <Section title="Academic" icon={<GraduationCap className="w-4 h-4 text-blue-500" />} data={academicSnapshot} />
            <Section title="Career" icon={<Briefcase className="w-4 h-4 text-emerald-500" />} data={careerSnapshot} />
            <Section title="Latest Analysis" icon={<Brain className="w-4 h-4 text-purple-500" />} data={latestAnalysis} />
            <Section title="Wellness" icon={<HeartPulse className="w-4 h-4 text-rose-500" />} data={wellnessSnapshot} />
        </div>
      </div>
    </ScrollArea>
  );
}

// Helper components for recursive rendering

function Section({ title, icon, data }: { title: string, icon: React.ReactNode, data?: Record<string, unknown> }) {
    if (!data || Object.keys(data).length === 0) return null;
    
    const isAiInferred = typeof data.confidence === 'number' || typeof data.confidence_score === 'number';
    const updatedAt = (data.generated_at || data.analyzed_at) as string;

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
            <CardContent className="p-3 text-xs space-y-3">
                <RecursiveObject data={data} />
                
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
}

function RecursiveObject({ data, level = 0 }: { data: Record<string, unknown>, level?: number }) {
    return (
        <div className="grid grid-cols-1 gap-2">
            {Object.entries(data).map(([key, value]) => {
                if (['generated_at', 'analyzed_at', 'confidence', 'confidence_score'].includes(key)) return null;
                
                return (
                    <div key={key} className="group">
                        <span className="text-muted-foreground capitalize block text-[10px] mb-0.5">
                            {key.replace(/_/g, ' ')}
                        </span>
                        <div className="font-medium break-words">
                            <RecursiveValue value={value} level={level} />
                        </div>
                    </div>
                )
            })}
        </div>
    );
}

function RecursiveValue({ value, level }: { value: unknown, level: number }) {
    if (value === null || value === undefined) return <span className="text-muted-foreground italic">None</span>;
    
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return <span>{String(value)}</span>;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return <span className="text-muted-foreground italic">Empty list</span>;
        
        // Check if array contains primitives or complex objects
        const isPrimitiveArray = value.every(item => typeof item !== 'object' || item === null);

        if (isPrimitiveArray) {
            return (
                <div className="flex flex-wrap gap-1">
                    {value.map((item, i) => (
                         <Badge key={i} variant="outline" className="text-[10px] py-0 h-auto min-h-[1.25rem] whitespace-normal text-left">
                            {String(item)}
                        </Badge>
                    ))}
                </div>
            );
        }

        return (
            <div className="pl-2 mt-1 space-y-2 border-l-2 border-muted/50">
                {value.map((item, i) => (
                    <div key={i} className="text-xs">
                        <RecursiveValue value={item} level={level + 1} />
                    </div>
                ))}
            </div>
        );
    }

    if (typeof value === 'object') {
        // It's a nested object
        return (
             <div className="pl-2 mt-1 border-l-2 border-muted/50">
                 <RecursiveObject data={value as Record<string, unknown>} level={level + 1} />
             </div>
        );
    }

    return <span>{String(value)}</span>;
}
