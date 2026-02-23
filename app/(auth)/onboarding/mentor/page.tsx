"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export default function MentorIntakePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const queryKey = searchParams.get("session");
    const queryConversation = searchParams.get("conversation");
    const localKey = typeof window !== "undefined" ? localStorage.getItem("onboarding_session_key") : null;
    const resolved = queryKey || localKey;
    if (!resolved) {
      router.push("/onboarding");
      return;
    }
    setSessionKey(resolved);
    if (queryConversation) {
      setConversationId(queryConversation);
      router.replace(`/chat?context=mentor_intake&conversation=${queryConversation}`);
    }
  }, [router, searchParams]);

  const handleComplete = async () => {
    if (!sessionKey) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/onboarding/mentor-intake/complete/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_key: sessionKey,
          intake_data: {
            notes,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete mentor intake");
      }

      router.push(data.redirect_url || `/onboarding/generating?session=${sessionKey}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f4ff] dark:bg-[#0b0b0f] px-4 py-12">
      <div className="container mx-auto max-w-2xl">
        <Card className="border-2 border-black bg-white shadow-[10px_10px_0_0_#000] dark:border-white dark:bg-zinc-900 dark:shadow-[10px_10px_0_0_#fff]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Mentor Intake</CardTitle>
            <CardDescription>
              Your mentor will personalize your roadmap based on your goals, constraints, and learning style.
              Share any extra context below, then continue to generate your roadmap.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-dashed border-black/20 bg-white/70 p-4">
              <p className="text-sm text-muted-foreground">
                Tip: If you want the mentor to chat live, open the Mentor Lounge in another tab.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() =>
                  router.push(
                    conversationId
                      ? `/chat?context=mentor_intake&conversation=${conversationId}`
                      : "/chat?context=mentor_intake"
                  )
                }
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Open Mentor Lounge
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Additional context (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Share constraints, preferences, or any career goals your mentor should know."
                rows={5}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              onClick={handleComplete}
              className="w-full"
              size="lg"
              disabled={submitting || !sessionKey}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing your roadmap...
                </>
              ) : (
                "Continue to Roadmap Generation"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
