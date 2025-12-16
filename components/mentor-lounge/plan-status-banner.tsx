"use client";

import { useEffect, useState } from "react";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X,
  FileText,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";

interface PlanStatusBannerProps {
  className?: string;
}

export function PlanStatusBanner({ className }: PlanStatusBannerProps) {
  const { 
    planBuildStatus, 
    planBuildMessage, 
    planBuildId,
    setPlanBuildStatus
  } = useMentorLoungeStore();
  
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (planBuildStatus !== "idle") {
      setIsVisible(true);
    }
  }, [planBuildStatus]);

  const handleClose = () => {
    setIsVisible(false);
    // Optionally reset store if needed, but keeping it in store allows re-showing context
    if (planBuildStatus === "completed" || planBuildStatus === "failed") {
      // Delay reset to allow animation to finish? 
      // Or just hide it locally. 
      // Let's reset the status to idle so it doesn't pop up again on nav
       setTimeout(() => setPlanBuildStatus("idle"), 300);
    }
  };

  if (!isVisible || planBuildStatus === "idle") return null;

  const isComplete = planBuildStatus === "completed";
  const isError = planBuildStatus === "failed";
  const isLoading = ["queued", "in_progress"].includes(planBuildStatus);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4",
            className
          )}
        >
          <div className={cn(
            "flex items-center p-4 rounded-xl shadow-lg border backdrop-blur-md",
            isLoading && "bg-background/80 border-border",
            isComplete && "bg-emerald-50/90 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
            isError && "bg-rose-50/90 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800"
          )}>
            <div className="flex-shrink-0 mr-3">
              {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {isComplete && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
              {isError && <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />}
            </div>
            
            <div className="flex-1 min-w-0 mr-2">
              <h4 className={cn(
                "text-sm font-semibold",
                isComplete && "text-emerald-900 dark:text-emerald-100",
                isError && "text-rose-900 dark:text-rose-100"
              )}>
                {isComplete ? "Plan Ready" : isError ? "Generation Failed" : "Building Plan"}
              </h4>
              <p className={cn(
                "text-xs truncate",
                isLoading && "text-muted-foreground",
                isComplete && "text-emerald-700 dark:text-emerald-300",
                isError && "text-rose-700 dark:text-rose-300"
              )}>
                {planBuildMessage || "Processing..."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isComplete && planBuildId && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs border-emerald-200 hover:bg-emerald-100 hover:text-emerald-900 dark:border-emerald-800 dark:hover:bg-emerald-900/50"
                  asChild
                >
                  <a href={`/plans?plan=${planBuildId}`}>
                    View <ArrowRight className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              )}
              
              <button 
                onClick={handleClose}
                className={cn(
                  "p-1 rounded-full hover:bg-black/5 transition-colors",
                  isComplete && "hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50",
                  isError && "hover:bg-rose-200/50 dark:hover:bg-rose-800/50"
                )}
              >
                <X className="h-4 w-4 opacity-70" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
