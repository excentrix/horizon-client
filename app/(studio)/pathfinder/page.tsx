"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pathfinderApi, type PathfinderSession } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Compass } from "lucide-react";
import { PathfinderHeader } from "./_components/PathfinderHeader";

const STEP_LABELS: Record<PathfinderSession["current_step"], string> = {
  aspiration_intake: "Just started",
  exploration: "In conversation",
  evidence_review: "Reviewing evidence",
  report_generating: "Report generating…",
  report_ready: "Report ready",
};

export default function PathfinderEntryPage() {
  const router = useRouter();
  const [entitled, setEntitled] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<PathfinderSession[]>([]);
  const [aspiration, setAspiration] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pathfinderApi
      .getEntitlement()
      .then((data) => setEntitled(data.pathfinder_enabled))
      .catch(() => setEntitled(false));
  }, []);

  useEffect(() => {
    if (!entitled) {
      setLoading(false);
      return;
    }
    pathfinderApi
      .listSessions()
      .then(setSessions)
      .catch(() => setError("Couldn't load your previous sessions."))
      .finally(() => setLoading(false));
  }, [entitled]);

  const handleStart = async () => {
    if (!aspiration.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const session = await pathfinderApi.createSession({ stated_aspiration: aspiration.trim() });
      router.push(`/pathfinder/${session.id}`);
    } catch {
      setError("Couldn't start a new session. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  if (entitled === null || loading) {
    return (
      <>
        <PathfinderHeader />
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </>
    );
  }

  if (!entitled) {
    return (
      <>
        <PathfinderHeader />
        <div className="mx-auto max-w-lg py-16 text-center text-muted-foreground">
          <Compass className="mx-auto mb-3 h-8 w-8" />
          <p>Pathfinder isn&apos;t enabled for your school yet.</p>
        </div>
      </>
    );
  }

  return (
    <>
    <PathfinderHeader />
    <div className="mx-auto max-w-2xl space-y-8 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Pathfinder</h1>
        <p className="text-muted-foreground">
          Figure out what career direction actually fits you — a conversation, not a quiz.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start a new session</CardTitle>
          <CardDescription>
            What career or field are you thinking about? Write it in your own words — there&apos;s no
            wrong answer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={aspiration}
            onChange={(e) => setAspiration(e.target.value)}
            placeholder="e.g. I think I want to be an architect, but I'm not totally sure..."
            rows={3}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleStart} disabled={creating || !aspiration.trim()}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Start exploring
          </Button>
        </CardContent>
      </Card>

      {sessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Previous sessions</h2>
          {sessions.map((session) => (
            <Card
              key={session.id}
              className="cursor-pointer transition hover:border-primary"
              onClick={() =>
                router.push(
                  session.current_step === "report_ready"
                    ? `/pathfinder/${session.id}/report`
                    : `/pathfinder/${session.id}`
                )
              }
            >
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{session.stated_aspiration || "Untitled exploration"}</p>
                  <p className="text-xs text-muted-foreground">
                    Started {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={session.current_step === "report_ready" ? "default" : "secondary"}>
                  {STEP_LABELS[session.current_step]}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
