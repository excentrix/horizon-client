"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Sparkles, CheckCircle, XCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

type Status = "generating" | "completed" | "failed";

export default function GeneratingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionKey = searchParams.get("session");
  
  const [status, setStatus] = useState<Status>("generating");
  const [message, setMessage] = useState("Analyzing your profile and preferences...");
  const [planId, setPlanId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionKey) {
      router.push("/onboarding");
      return;
    }

    // Poll for session status
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/onboarding/session/${sessionKey}/`);
        const data = await res.json();

        if (data.current_step === "complete" && data.draft_plan) {
          setStatus("completed");
          setPlanId(data.draft_plan);
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
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-gray-900 to-indigo-950 flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Animated icon */}
        <div className="mb-8 relative">
          {status === "generating" && (
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full h-24 w-24 mx-auto bg-violet-500/30" />
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-500/50">
                <Sparkles className="h-12 w-12 text-white animate-pulse" />
              </div>
            </div>
          )}
          {status === "completed" && (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-2xl shadow-emerald-500/50">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
          )}
          {status === "failed" && (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-2xl shadow-red-500/50">
              <XCircle className="h-12 w-12 text-white" />
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2">
          {status === "generating" && "Creating Your Learning Journey"}
          {status === "completed" && "All Set!"}
          {status === "failed" && "Something went wrong"}
        </h1>

        <p className="text-gray-400 mb-8">{message}</p>

        {/* Progress steps */}
        {status === "generating" && (
          <div className="text-left space-y-3 bg-white/5 rounded-xl p-6 backdrop-blur-sm">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  step.done 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : "bg-gray-500/20 text-gray-500"
                }`}>
                  {step.done ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
                <span className={step.done ? "text-white" : "text-gray-500"}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {status === "failed" && (
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
