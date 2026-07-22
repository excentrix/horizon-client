"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { pathfinderApi, type PathwayReport } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Sparkles } from "lucide-react";
import { PathfinderHeader } from "../../_components/PathfinderHeader";

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 90000;

const RIASEC_LABELS: Record<string, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{Math.round(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

export default function PathwayReportPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId ?? "";
  const [report, setReport] = useState<PathwayReport | null>(null);
  const [checking, setChecking] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const start = Date.now();

    const poll = async () => {
      while (!cancelled && Date.now() - start < POLL_TIMEOUT_MS) {
        try {
          const data = await pathfinderApi.getSessionReport(sessionId);
          if (!cancelled) {
            setReport(data);
            setChecking(false);
          }
          return;
        } catch {
          // Not ready yet (404) — keep polling until the timeout.
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      if (!cancelled) {
        setChecking(false);
        setTimedOut(true);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (checking) {
    return (
      <>
        <PathfinderHeader />
        <div className="mx-auto max-w-lg py-16 text-center text-muted-foreground">
          <Sparkles className="mx-auto mb-3 h-8 w-8 animate-pulse text-primary" />
          <p className="font-medium text-foreground">Putting together your Pathway Report…</p>
          <p className="mt-1 text-sm">This usually takes under a minute. This page will update on its own.</p>
          <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin" />
        </div>
      </>
    );
  }

  if (!report) {
    return (
      <>
        <PathfinderHeader />
        <div className="mx-auto max-w-lg py-16 text-center text-muted-foreground">
          <p className="font-medium text-foreground">
            {timedOut ? "This is taking longer than expected." : "Your report isn't ready yet."}
          </p>
          <p className="mt-1 text-sm">
            Refresh this page in a bit — report generation runs in the background and should finish soon.
          </p>
        </div>
      </>
    );
  }

  const scores = report.riasec_profile?.scores ?? {};

  return (
    <>
    <PathfinderHeader />
    <div className="mx-auto max-w-3xl space-y-8 py-10">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Your Pathway Report</p>
        <h1 className="text-2xl font-semibold">Career matches, based on what you shared</h1>
        {report.riasec_profile?.rationale && (
          <p className="mt-2 text-muted-foreground">{report.riasec_profile.rationale}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your interest profile (RIASEC)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {Object.entries(RIASEC_LABELS).map(([letter, label]) => (
            <ScoreBar key={letter} label={label} value={(scores[letter] ?? 0) * 100} />
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Top matches</h2>
        {report.top_matches.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-6 text-sm text-muted-foreground">
              We don&apos;t have full career pathway data for your school&apos;s region reviewed yet, so
              we can&apos;t show ranked matches for this report. Your interest profile above is still
              accurate — check back after your school&apos;s counselor has more pathways set up, or
              generate a new report later.
            </CardContent>
          </Card>
        )}
        {report.top_matches.map((match, i) => (
          <Card key={match.career_profile_id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{i + 1}. {match.title}</CardTitle>
                <Badge>{Math.round(match.match_score)}% match</Badge>
              </div>
              {match.why && <CardDescription>{match.why}</CardDescription>}
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">{match.summary}</p>
              <Accordion type="single" collapsible className="w-full">
                {match.specializations?.length > 0 && (
                  <AccordionItem value="specializations">
                    <AccordionTrigger>Specializations</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-inside list-disc space-y-1 text-sm">
                        {match.specializations.map((s) => (
                          <li key={s.name}><span className="font-medium">{s.name}</span> — {s.description}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}
                {match.pathways?.length > 0 && (
                  <AccordionItem value="pathways">
                    <AccordionTrigger>How to get there</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2 text-sm">
                        {match.pathways.map((p, idx) => (
                          <li key={idx}>
                            <Badge variant="outline" className="mr-2">{p.route}</Badge>
                            <span className="font-medium">{p.title}</span> — {p.details}
                            {p.typical_duration && (
                              <span className="text-muted-foreground"> ({p.typical_duration})</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}
                {match.credentials?.length > 0 && (
                  <AccordionItem value="credentials">
                    <AccordionTrigger>Credentials — load-bearing vs. optional</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1 text-sm">
                        {match.credentials.map((c) => (
                          <li key={c.name}>
                            <Badge variant={c.load_bearing ? "default" : "secondary"} className="mr-2">
                              {c.load_bearing ? "Required" : "Optional"}
                            </Badge>
                            <span className="font-medium">{c.name}</span>
                            {c.notes && <span className="text-muted-foreground"> — {c.notes}</span>}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}
                {match.college_fit?.length > 0 && (
                  <AccordionItem value="colleges">
                    <AccordionTrigger>Colleges that fit</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-1 text-sm">
                        {match.college_fit.map((c) => (
                          <li key={c.name}>
                            <span className="font-medium">{c.name}</span> — {c.why_fit}
                            {c.region_note && <span className="text-muted-foreground"> ({c.region_note})</span>}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
    </>
  );
}
