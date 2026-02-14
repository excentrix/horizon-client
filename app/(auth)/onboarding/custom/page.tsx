"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Target, Clock, BrainCircuit } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export default function OnboardingCustomPathPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    target_role: "",
    experience_level: "beginner",
    hours_per_week: 8,
    skills: "",
    goal: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const sessionKey = localStorage.getItem("onboarding_session_key");
    if (!sessionKey) {
      router.push("/onboarding");
      return;
    }

    const payload = {
      session_key: sessionKey,
      form_data: {
        target_role: formData.target_role || "Custom Path",
        experience_level: formData.experience_level,
        hours_per_week: formData.hours_per_week,
        skills: formData.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        goal: formData.goal,
        notes: formData.notes,
        custom_path: true,
      },
    };

    try {
      const res = await fetch(`${API_URL}/onboarding/submit-form/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to submit custom path preferences");
      await res.json();
      router.push("/onboarding/paths");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f4ff] dark:bg-[#0b0b0f] px-4 py-12">
      <div className="container mx-auto max-w-2xl">
        <Card className="border-2 border-black bg-white shadow-[10px_10px_0_0_#000] dark:border-white dark:bg-zinc-900 dark:shadow-[10px_10px_0_0_#fff]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-[#fcd34d] dark:border-white">
              <Sparkles className="h-6 w-6 text-black" />
            </div>
            <CardTitle className="text-2xl font-extrabold dark:text-white">Create a Custom Path</CardTitle>
            <CardDescription className="text-gray-700 dark:text-gray-400">
              Tell us exactly what you want. We’ll craft a tailored learning track for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <Target className="h-4 w-4 text-black dark:text-white" /> Target role or outcome
                </Label>
                <Input
                  value={formData.target_role}
                  onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                  className="border-2 border-black shadow-[3px_3px_0_0_#000] dark:border-gray-500 dark:bg-zinc-800 dark:text-white dark:shadow-none dark:placeholder:text-gray-500"
                  placeholder="e.g. Robotics Engineer, AI Researcher"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <BrainCircuit className="h-4 w-4 text-black dark:text-white" /> Experience level
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {"beginner,intermediate,advanced".split(",").map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({ ...formData, experience_level: level })}
                      className={`rounded-lg border-2 border-black px-3 py-2 text-sm font-semibold shadow-[3px_3px_0_0_#000] transition hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#000] dark:border-gray-500 ${
                        formData.experience_level === level ? "bg-[#dcfce7] dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-500 dark:shadow-none" : "bg-white dark:bg-zinc-800 dark:text-gray-300 dark:shadow-none dark:hover:bg-zinc-700"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <Clock className="h-4 w-4 text-black dark:text-white" /> Hours per week
                </Label>
                <Input
                  type="number"
                  min={2}
                  max={40}
                  value={formData.hours_per_week}
                  onChange={(e) => setFormData({ ...formData, hours_per_week: Number(e.target.value) })}
                  className="border-2 border-black shadow-[3px_3px_0_0_#000] dark:border-gray-500 dark:bg-zinc-800 dark:text-white dark:shadow-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-900 dark:text-white">Current skills</Label>
                <Input
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="border-2 border-black shadow-[3px_3px_0_0_#000] dark:border-gray-500 dark:bg-zinc-800 dark:text-white dark:shadow-none dark:placeholder:text-gray-500"
                  placeholder="Comma-separated e.g. Python, ROS, Control Systems"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-900 dark:text-white">Primary goal</Label>
                <Textarea
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  className="border-2 border-black shadow-[3px_3px_0_0_#000] dark:border-gray-500 dark:bg-zinc-800 dark:text-white dark:shadow-none dark:placeholder:text-gray-500"
                  placeholder="Describe what you want to achieve"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-gray-900 dark:text-white">Notes (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="border-2 border-black shadow-[3px_3px_0_0_#000] dark:border-gray-500 dark:bg-zinc-800 dark:text-white dark:shadow-none dark:placeholder:text-gray-500"
                  placeholder="Anything else we should consider?"
                />
              </div>

              {error && (
                <div className="rounded-md border-2 border-black bg-red-100 p-3 text-sm font-semibold text-red-700 shadow-[3px_3px_0_0_#000] dark:border-red-500/50 dark:bg-red-900/20 dark:text-red-300 dark:shadow-none">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-black text-white shadow-[4px_4px_0_0_#000] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition dark:bg-emerald-600 dark:text-white dark:shadow-[4px_4px_0_0_#000]"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Crafting your path...
                  </>
                ) : (
                  "Build My Custom Path"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
