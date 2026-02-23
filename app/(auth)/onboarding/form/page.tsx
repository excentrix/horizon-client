"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, Target, Trophy } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

type OnboardingData = {
  target_role: string;
  experience_level: "beginner" | "intermediate" | "advanced";
};

export default function OnboardingFormPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [hasResumePrefill, setHasResumePrefill] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    target_role: "",
    experience_level: "beginner",
  });
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill data if available
  useEffect(() => {
    const key = localStorage.getItem("onboarding_session_key");
    if (!key) {
      router.push("/onboarding");
      return;
    }
    setSessionKey(key);

    // Fetch session data to pre-fill
    fetch(`${API_URL}/onboarding/session/${key}/`)
      .then((res) => res.json())
      .then((data) => {
        if (data.parsed_data) {
          setHasResumePrefill(true);
          const { parsed_data } = data;
          setFormData((prev) => ({
            ...prev,
            target_role: parsed_data.current_role || "",
            experience_level: (parsed_data.experience_level || "beginner") as OnboardingData["experience_level"],
          }));
        }
      })
      .catch((err) => console.error("Failed to fetch session", err))
      .finally(() => setLoading(false));
  }, [router]);

  const suggestedRoles = [
    "Backend Engineer",
    "Data Scientist",
    "Product Manager",
    "UI/UX Designer",
    "DevOps Engineer",
    "AI Engineer",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionKey) return;

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/onboarding/submit-form/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_key: sessionKey,
          form_data: formData,
        }),
      });

      if (!response.ok) throw new Error("Submission failed");

      const data = await response.json();

      // Capture form submitted event
      posthog.capture('onboarding_form_submitted', {
        target_role: formData.target_role,
        experience_level: formData.experience_level,
      });

      router.push(data.redirect_url || "/onboarding/finalize");
    } catch (err) {
      console.error(err);
      // Show error toast?
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f4ff] dark:bg-[#0b0b0f] px-4 py-12">
      <div className="container mx-auto max-w-2xl">
        
        {/* Progress */}
        <div className="mb-8 flex justify-center">
            <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900 dark:text-gray-300">
                <span className="h-2 w-2 rounded-full bg-black dark:bg-white"></span>
                <span>Goals</span>
                <span className="h-px w-8 bg-black/30 dark:bg-white/30"></span>
                <span className="h-2 w-2 rounded-full bg-black/20 dark:bg-white/20"></span>
                <span className="text-gray-600 dark:text-gray-500">Mentor Intake</span>
            </div>
        </div>

        <Card className="border-2 border-black bg-white shadow-[10px_10px_0_0_#000] dark:border-white dark:bg-zinc-900 dark:shadow-[10px_10px_0_0_#fff]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-[#fcd34d] dark:border-white">
                <Target className="h-6 w-6 text-black" />
            </div>
            <CardTitle className="text-2xl font-extrabold dark:text-white">Design Your Journey</CardTitle>
            <CardDescription className="text-gray-700 dark:text-gray-400">
                  If you uploaded a resume, we pre-filled some details. Otherwise, just answer a few quick questions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">

              {!hasResumePrefill && (
                <div className="rounded-xl border-2 border-black bg-[#e0f2fe] p-4 text-sm text-gray-900 shadow-[6px_6px_0_0_#000] dark:border-gray-500 dark:bg-blue-900/20 dark:text-gray-100 dark:shadow-none">
                  <div className="mb-2 font-semibold text-black dark:text-blue-200">
                    Quick picks to get you started
                  </div>
                  <div className="mb-3 text-xs text-gray-700 dark:text-blue-300">
                    Tap a role to autofill. You can edit anytime.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, target_role: role }))}
                        className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-semibold text-black shadow-[3px_3px_0_0_#000] transition hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] dark:border-blue-400 dark:bg-blue-950 dark:text-blue-100 dark:shadow-none dark:hover:bg-blue-900"
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              )}
                  
                  {/* Target Role */}
                  <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                    <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    What is your target role?
                </Label>
                <Input
                  placeholder="e.g. Senior Backend Engineer, Data Scientist"
                  value={formData.target_role}
                  onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                  className="h-12 text-lg border-2 border-black shadow-[4px_4px_0_0_#000] dark:border-gray-500 dark:bg-zinc-800 dark:text-white dark:shadow-none dark:placeholder:text-gray-500"
                  required
                />
                  </div>
    
                  {/* Experience Level */}
                  <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                    <Trophy className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    Current Experience Level
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {["beginner", "intermediate", "advanced"].map((level) => {
                    const isSelected = formData.experience_level === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            experience_level: level as OnboardingData["experience_level"],
                          })
                        }
                        className={`flex flex-col items-center justify-center rounded-lg border-2 border-black p-3 text-sm font-semibold transition-all dark:border-gray-500 ${
                          isSelected
                            ? "bg-[#dcfce7] text-black shadow-[4px_4px_0_0_#000] dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-500 dark:shadow-none"
                            : "bg-white text-black shadow-[3px_3px_0_0_#000] hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] dark:bg-zinc-800 dark:text-gray-300 dark:shadow-none dark:hover:bg-zinc-700"
                        }`}
                      >
                        <span className="capitalize">{level}</span>
                      </button>
                    );
                  })}
                </div>
                  </div>
    
                  {/* Mentor Tone (Coming Soon) */}
              <Button 
                type="submit" 
                className="w-full text-lg h-12 bg-black text-white shadow-[4px_4px_0_0_#000] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition dark:bg-emerald-600 dark:shadow-[4px_4px_0_0_#000] dark:border-2 dark:border-emerald-400"
                disabled={submitting}
              >
                {submitting ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Saving your goal...
                    </>
                ) : (
                    <>
                        Continue to Mentor
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                )}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
