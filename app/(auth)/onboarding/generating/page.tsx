"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Sparkles, CheckCircle, XCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

type Status = "generating" | "completed" | "failed";

export default function GeneratingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center px-4">
        <Loader2 className="h-8 w-8 text-white animate-spin" />
      </div>
    }>
      <GeneratingPageContent />
    </Suspense>
  );
}

function GeneratingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionKey = searchParams.get("session");
  
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
        const res = await fetch(`${API_URL}/onboarding/session/${sessionKey}/`);
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
    <div className="min-h-screen bg-[#f6f4ff] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Animated icon */}
        <div className="mb-8 relative">
          {status === "generating" && (
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full h-24 w-24 mx-auto bg-black/5" />
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-black bg-[#fcd34d] shadow-[6px_6px_0_0_#000]">
                <Sparkles className="h-12 w-12 text-black animate-pulse" />
              </div>
            </div>
          )}
          {status === "completed" && (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-black bg-[#dcfce7] shadow-[6px_6px_0_0_#000]">
              <CheckCircle className="h-12 w-12 text-black" />
            </div>
          )}
          {status === "failed" && (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-black bg-[#fecaca] shadow-[6px_6px_0_0_#000]">
              <XCircle className="h-12 w-12 text-black" />
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          {status === "generating" && "Creating Your Learning Journey"}
          {status === "completed" && "All Set!"}
          {status === "failed" && "Something went wrong"}
        </h1>

        <p className="text-gray-600 mb-8">{message}</p>

        {/* Progress steps */}
        {status === "generating" && (
          <div className="text-left space-y-3 bg-white rounded-xl p-6 border-2 border-black shadow-[6px_6px_0_0_#000]">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  step.done 
                    ? "bg-[#dcfce7] text-black border-2 border-black" 
                    : "bg-gray-100 text-gray-400 border-2 border-gray-200"
                }`}>
                  {step.done ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
                <span className={step.done ? "text-gray-900 font-medium" : "text-gray-500"}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {status === "failed" && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-white text-black border-2 border-black shadow-[4px_4px_0_0_#000] transition hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000]"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push("/onboarding/paths")}
              className="px-6 py-3 bg-[#fcd34d] text-black border-2 border-black shadow-[4px_4px_0_0_#000] transition hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000]"
            >
              Choose a Different Path
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 bg-white text-black border-2 border-black shadow-[4px_4px_0_0_#000] transition hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000]"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

