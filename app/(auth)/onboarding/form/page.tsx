"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, Target, Trophy } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getApiUrl() {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }
  return API_URL;
}

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
    try {
      fetch(`${getApiUrl()}/onboarding/session/${key}/`)
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
    } catch (err) {
      console.error("API configuration error", err);
      setLoading(false);
    }
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
      const response = await fetch(`${getApiUrl()}/onboarding/submit-form/`, {
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
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--color-primary-surface)]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <OnboardingShell title="Confirm your goal" subtitle="We prefill what we can from your resume. Adjust it once and continue.">
        <div className="mb-2 flex justify-center">
            <div className="flex items-center space-x-2 text-sm font-semibold text-gray-900 dark:text-gray-300">
                <span className="h-2 w-2 rounded-full bg-[color:var(--dock-item-active)]"></span>
                <span>Goals</span>
                <span className="h-px w-8 bg-border"></span>
                <span className="h-2 w-2 rounded-full bg-border"></span>
                <span className="text-muted-foreground">Mentor Intake</span>
            </div>
        </div>

        <Card className="border border-border bg-card shadow-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-[color:var(--color-primary-surface)]">
                <Target className="h-6 w-6 text-[color:var(--dock-item-active)]" />
            </div>
            <CardTitle className="text-2xl font-semibold">Design Your Journey</CardTitle>
            <CardDescription className="text-muted-foreground">
                  If you uploaded a resume, we pre-filled some details. Otherwise, just answer a few quick questions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">

              {!hasResumePrefill && (
                <div className="rounded-xl border border-border bg-[color:var(--color-primary-surface)] p-4 text-sm text-foreground">
                  <div className="mb-2 font-semibold">
                    Quick picks to get you started
                  </div>
                  <div className="mb-3 text-xs text-muted-foreground">
                    Tap a role to autofill. You can edit anytime.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, target_role: role }))}
                        className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-[color:var(--dock-item-hover-bg)]"
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              )}
                  
                  {/* Target Role */}
                  <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base font-semibold">
                    <Target className="h-4 w-4 text-[color:var(--dock-item-active)]" />
                    What is your target role?
                </Label>
                <Input
                  placeholder="e.g. Senior Backend Engineer, Data Scientist"
                  value={formData.target_role}
                  onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                  className="h-12 text-lg"
                  required
                />
                  </div>
    
                  {/* Experience Level */}
                  <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base font-semibold">
                    <Trophy className="h-4 w-4 text-[color:var(--dock-item-active)]" />
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
                            ? "bg-[color:var(--dock-item-hover-bg)] text-[color:var(--dock-item-active)]"
                            : "bg-card text-foreground hover:bg-[color:var(--dock-item-hover-bg)]"
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
                className="h-12 w-full text-lg"
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
    </OnboardingShell>
  );
}
