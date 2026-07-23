"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pathfinderApi, type PathfinderSession, type PathwayReport } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Compass, Sparkles, MessageCircle, ArrowRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const [reports, setReports] = useState<PathwayReport[]>([]);
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
    Promise.all([pathfinderApi.listSessions(), pathfinderApi.listReports()])
      .then(([sessionData, reportData]) => {
        setSessions(sessionData);
        setReports(reportData);
      })
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

  const inProgressSessions = sessions.filter((s) => s.current_step !== "report_ready");

  return (
    <>
      <PathfinderHeader />
      <div className="mx-auto max-w-2xl space-y-10 px-4 py-10">
        <div className="rise-in text-center sm:text-left">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 sm:mx-0">
            <Compass className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pathfinder</h1>
          <p className="mt-1 text-muted-foreground">
            Figure out what career direction actually fits you — a conversation, not a quiz.
          </p>
        </div>

        <Card className="rise-in-1 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Start a new session
            </CardTitle>
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
              className="bg-background"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleStart} disabled={creating || !aspiration.trim()}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Start exploring
            </Button>
          </CardContent>
        </Card>

        {reports.length > 0 && (
          <div className="rise-in-2 space-y-3">
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <FileText className="size-4" /> Your Pathway Reports
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {reports.map((report) => {
                const session = sessions.find((s) => s.id === report.session);
                const topMatch = report.top_matches[0];
                return (
                  <Card
                    key={report.id}
                    className="group cursor-pointer overflow-hidden border-primary/20 transition hover:border-primary hover:shadow-md"
                    onClick={() => router.push(`/pathfinder/${report.session}/report`)}
                  >
                    <CardContent className="p-4">
                      <p className="truncate text-sm font-medium">
                        {session?.stated_aspiration || "Your exploration"}
                      </p>
                      {topMatch ? (
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Top match: {topMatch.title}</span>
                          <Badge variant="secondary">{Math.round(topMatch.match_score)}%</Badge>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">View your interest profile</p>
                      )}
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(report.generated_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          View report <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {inProgressSessions.length > 0 && (
          <div className="rise-in-3 space-y-3">
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <MessageCircle className="size-4" /> Continue exploring
            </h2>
            {inProgressSessions.map((session) => (
              <Card
                key={session.id}
                className="cursor-pointer transition hover:border-primary hover:shadow-sm"
                onClick={() => router.push(`/pathfinder/${session.id}`)}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{session.stated_aspiration || "Untitled exploration"}</p>
                    <p className="text-xs text-muted-foreground">
                      Started {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(session.current_step === "report_generating" && "animate-pulse")}
                  >
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
