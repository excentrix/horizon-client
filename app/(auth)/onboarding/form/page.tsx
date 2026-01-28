"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, BrainCircuit, Target, Clock, Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

type OnboardingData = {
  target_role: string;
  experience_level: "beginner" | "intermediate" | "advanced";
  hours_per_week: number;
  skills: string[];
};

export default function OnboardingFormPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [formData, setFormData] = useState<OnboardingData>({
    target_role: "",
    experience_level: "beginner",
    hours_per_week: 10,
    skills: [],
  });
  const [skillInput, setSkillInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toneOverride, setToneOverride] = useState<string | null>(null);
  const [savingTone, setSavingTone] = useState(false);
  const toneOverrideEnabled = useMemo(
    () => process.env.NEXT_PUBLIC_TONE_OVERRIDE_ENABLED === "true",
    []
  );

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
          const { parsed_data } = data;
          setFormData((prev) => ({
            ...prev,
            target_role: parsed_data.current_role || "",
            experience_level: (parsed_data.experience_level || "beginner") as any,
            skills: parsed_data.skills || [],
          }));
        }
      })
      .catch((err) => console.error("Failed to fetch session", err))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!toneOverrideEnabled) return;
    authApi
      .getProfileDetail()
      .then((profile) => {
        const prefs = profile.mentor_preferences ?? {};
        const override = prefs.tone_override ?? null;
        setToneOverride(override);
      })
      .catch(() => {
        // Non-blocking: tone override is optional
      });
  }, [toneOverrideEnabled]);

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
      // Store matched paths? Or just navigate and fetch again?
      // For now, let's just navigate
      router.push("/onboarding/paths");
    } catch (err) {
      console.error(err);
      // Show error toast?
    } finally {
      setSubmitting(false);
    }
  };

  const handleToneSelect = async (tone: string) => {
    if (!toneOverrideEnabled) return;
    setSavingTone(true);
    try {
      const profile = await authApi.getProfileDetail();
      const prefs = profile.mentor_preferences ?? {};
      const nextPrefs = { ...prefs, tone_override: tone };
      await authApi.updateProfileDetail({ mentor_preferences: nextPrefs });
      setToneOverride(tone);
    } catch (err) {
      console.error("Failed to save tone override", err);
    } finally {
      setSavingTone(false);
    }
  };

  const addSkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      if (!formData.skills.includes(skillInput.trim())) {
        setFormData({
          ...formData,
          skills: [...formData.skills, skillInput.trim()],
        });
      }
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skillToRemove),
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-12">
      <div className="container mx-auto max-w-2xl">
        
        {/* Progress */}
        <div className="mb-8 flex justify-center">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="h-2 w-2 rounded-full bg-violet-600"></span>
                <span className="font-medium text-violet-600">Preferences</span>
                <span className="h-px w-8 bg-gray-300 dark:bg-gray-700"></span>
                <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                <span>Path Selection</span>
            </div>
        </div>

        <Card className="border-0 shadow-lg ring-1 ring-gray-200 dark:ring-gray-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                <BrainCircuit className="h-6 w-6 text-violet-600" />
            </div>
            <CardTitle className="text-2xl">Design Your Journey</CardTitle>
            <CardDescription>
              We've pre-filled some details from your resume. Tweak them to find your perfect path.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Target Role */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4 text-violet-600" />
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
                <Label className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-violet-600" />
                    Current Experience Level
                </Label>
                <div className="grid grid-cols-3 gap-3">
                    {['beginner', 'intermediate', 'advanced'].map((level) => (
                        <button
                            key={level}
                            type="button"
                            onClick={() => setFormData({ ...formData, experience_level: level as any })}
                            className={cn(
                                "flex flex-col items-center justify-center rounded-lg border p-3 text-sm font-medium transition-all hover:bg-violet-50 dark:hover:bg-violet-900/10",
                                formData.experience_level === level
                                    ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 ring-2 ring-violet-600 ring-offset-2 dark:ring-offset-gray-900"
                                    : "border-gray-200 text-gray-600 dark:border-gray-800 dark:text-gray-400"
                            )}
                        >
                            <span className="capitalize">{level}</span>
                        </button>
                    ))}
                </div>
              </div>

              {/* Mentor Tone (Coming Soon) */}
              <div className="relative space-y-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-5 dark:border-violet-900/40 dark:bg-violet-900/10">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    Mentor Tone (Pro)
                  </Label>
                  <Badge className="border border-violet-300 bg-white text-violet-700 dark:border-violet-800 dark:bg-gray-900 dark:text-violet-200">
                    Coming soon
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We automatically adapt your mentor's tone based on your progress and mood. You'll soon be able to
                  override it manually.
                </p>
                <div className={cn("grid grid-cols-3 gap-3", !toneOverrideEnabled && "opacity-60")}>
                  {["Supportive", "Direct", "Hard love"].map((tone) => {
                    const toneValue = tone.toLowerCase().replace(" ", "-");
                    const isActive = toneOverride === toneValue;
                    return (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => handleToneSelect(toneValue)}
                        disabled={!toneOverrideEnabled || savingTone}
                        className={cn(
                          "flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition",
                          isActive
                            ? "border-violet-600 bg-white text-violet-700 shadow-sm dark:bg-gray-900 dark:text-violet-200"
                            : "border-violet-200 bg-white text-violet-700 dark:border-violet-800 dark:bg-gray-900 dark:text-violet-200",
                          (!toneOverrideEnabled || savingTone) && "cursor-not-allowed"
                        )}
                      >
                        {tone}
                      </button>
                    );
                  })}
                </div>
                {!toneOverrideEnabled && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-600 shadow-sm dark:bg-gray-900/80">
                      Coming Soon
                    </span>
                  </div>
                )}
              </div>

              {/* Time Commitment */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-base">
                        <Clock className="h-4 w-4 text-violet-600" />
                        Weekly Time Commitment
                    </Label>
                    <span className="text-sm font-medium text-violet-600 bg-violet-50 dark:bg-violet-900/30 px-2.5 py-0.5 rounded-full">
                        {formData.hours_per_week} hours
                    </span>
                </div>
                <Slider
                  value={[formData.hours_per_week]}
                  onValueChange={(vals) => setFormData({ ...formData, hours_per_week: vals[0] })}
                  min={2}
                  max={40}
                  step={1}
                  className="py-4"
                />
                <p className="text-xs text-gray-500">
                    Recommended: 10-15 hours for steady progress.
                </p>
              </div>

              {/* Skills */}
              <div className="space-y-3">
                <Label className="text-base">Top Skills (for placement)</Label>
                <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/50 min-h-[100px]">
                    {formData.skills.map((skill) => (
                        <Badge variant="secondary" key={skill} className="gap-1 bg-white dark:bg-gray-800 shadow-sm pl-2.5 pr-1 py-1 text-sm">
                            {skill}
                            <button
                                type="button"
                                onClick={() => removeSkill(skill)}
                                className="ml-1 rounded-full p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </Badge>
                    ))}
                    <input
                        type="text"
                        placeholder="Type skill & press Enter..."
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={addSkill}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 min-w-[150px]"
                    />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full text-lg h-12 bg-violet-600 hover:bg-violet-700"
                disabled={submitting}
              >
                {submitting ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Finding Best Paths...
                    </>
                ) : (
                    <>
                        Generate Recommendations
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
