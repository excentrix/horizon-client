"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getApiUrl() {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }
  return API_URL;
}

type Status = "generating" | "completed" | "failed";

export default function GeneratingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-primary-surface)] px-4">
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--dock-item-active)]" />
      </div>
    }>
      <GeneratingPageContent />
    </Suspense>
  );
}

function GeneratingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionKey = searchParams?.get("session") ?? null;
  
  const [status, setStatus] = useState<Status>("generating");
  const [message, setMessage] = useState("Analyzing your profile and preferences...");

  useEffect(() => {
    if (!sessionKey) {
      router.push("/onboarding");
      return;
    }

    // Poll for session status
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${getApiUrl()}/onboarding/session/${sessionKey}/`);
        const data = await res.json();

        if (data.current_step === "complete" && data.draft_plan) {
          setStatus("completed");
          setMessage("Your personalized learning plan is ready!");
          clearInterval(pollInterval);
          
          // Redirect after short delay
          setTimeout(() => {
            router.push(`/plans/${data.draft_plan}/playground`);
          }, 2000);
        } else if (data.current_step === "failed") {
          setStatus("failed");
          setMessage("Plan generation failed. Please try again.");
          clearInterval(pollInterval);
        } else if (data.current_step === "generating") {
          // Still generating
          setMessage("Building your personalized curriculum...");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [sessionKey, router]);

  const steps = [
    { label: "Creating your account", done: true },
    { label: "Analyzing your background", done: status !== "generating" || message.includes("Building") },
    { label: "Building personalized curriculum", done: status === "completed" },
    { label: "Preparing your dashboard", done: status === "completed" },
  ];

  return (
    <OnboardingShell
      title={
        status === "generating"
          ? "Generating your learning journey"
          : status === "completed"
            ? "All set"
            : "Something went wrong"
      }
      subtitle={message}
      className="mx-auto max-w-2xl"
    >
      <div className="mx-auto max-w-xl text-center">
        {/* Animated icon */}
        <div className="mb-8 relative">
          {status === "generating" && (
            <div className="relative">
              <div className="absolute inset-0 mx-auto h-24 w-24 animate-ping rounded-full bg-[color:var(--dock-item-active)]/10" />
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-border bg-card">
                <Sparkles className="h-12 w-12 animate-pulse text-[color:var(--dock-item-active)]" />
              </div>
            </div>
          )}
          {status === "completed" && (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50">
              <CheckCircle className="h-12 w-12 text-emerald-600" />
            </div>
          )}
          {status === "failed" && (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-rose-300 bg-rose-50">
              <XCircle className="h-12 w-12 text-rose-600" />
            </div>
          )}
        </div>

        {/* Progress steps */}
        {status === "generating" && (
          <div className="space-y-3 rounded-xl border border-border bg-[color:var(--color-primary-surface)] p-6 text-left">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  step.done 
                    ? "border border-emerald-300 bg-emerald-50 text-emerald-700" 
                    : "border border-border bg-card text-muted-foreground"
                }`}>
                  {step.done ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
                <span className={step.done ? "font-medium text-foreground" : "text-muted-foreground"}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {status === "failed" && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Try Again
            </Button>
            <Button
              onClick={() => router.push("/onboarding")}
            >
              Restart onboarding
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
            >
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </OnboardingShell>
  );
}
