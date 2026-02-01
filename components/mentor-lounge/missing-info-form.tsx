"use client";

import { useState } from "react";
import { Check, X, ArrowRight, CalendarClock, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MissingInformationItem } from "@/types";
import { telemetry } from "@/lib/telemetry";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { planningApi } from "@/lib/api";

interface MissingInfoFormProps {
  item: MissingInformationItem;
}

export function MissingInfoForm({ item }: MissingInfoFormProps) {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resolveMissingInfo = useMentorLoungeStore(state => state.resolveMissingInfo);
  const planSessionId = useMentorLoungeStore(state => state.planSessionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    setIsSubmitting(true);
    try {
      if (!planSessionId) {
        telemetry.toastError("Unable to submit info", "Missing plan session.");
        return;
      }

      await planningApi.submitMissingInfo(planSessionId, {
        field: item.field,
        value: value.trim(),
      });
      
      resolveMissingInfo(item.id);
      telemetry.toastInfo("Information updated", "Thanks! We've updated your profile.");
    } catch (error) {
       telemetry.toastError("Failed to update information. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSchedule = item.field.includes("schedule") || item.field.includes("availability");
  const Icon = isSchedule ? CalendarClock : BookOpen;

  if (item.status === "resolved") return null;

  return (
    <Card className="border-amber-500/50 bg-amber-500/5 mb-4 animate-in fade-in slide-in-from-top-2">
       <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600 dark:text-amber-400">
             <Icon className="w-4 h-4" />
             Input Required
          </CardTitle>
          <p className="text-xs text-muted-foreground">{item.context || item.question}</p>
          {item.unblocks ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{item.unblocks}</p>
          ) : null}
       </CardHeader>
       <CardContent className="pb-2">
          <form onSubmit={handleSubmit} className="flex gap-2">
             <Input 
                value={value} 
                onChange={(e) => setValue(e.target.value)}
                placeholder={isSchedule ? "e.g. Mon-Fri 6pm-8pm" : "Enter details..."}
                className="h-8 text-xs"
                disabled={isSubmitting}
             />
             <Button type="submit" size="sm" className="h-8 w-8 p-0" disabled={isSubmitting || !value.trim()}>
                 {isSubmitting ? "..." : <ArrowRight className="w-3.5 h-3.5" />}
             </Button>
          </form>
       </CardContent>
    </Card>
  );
}
