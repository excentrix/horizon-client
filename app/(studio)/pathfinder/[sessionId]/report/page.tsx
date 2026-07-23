"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { pathfinderApi, type PathwayReport, type PathwayReportMatch } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Sparkles, GraduationCap, FileBadge, Landmark, Compass } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { PathfinderHeader } from "../../_components/PathfinderHeader";
import { cn } from "@/lib/utils";

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

const ROUTE_ICONS: Record<string, typeof GraduationCap> = {
  degree: GraduationCap,
  entrance_exam: FileBadge,
  apprenticeship: Compass,
  certification: FileBadge,
};

function scoreColor(score: number) {
  if (score >= 80) return "text-primary";
  if (score >= 60) return "text-foreground";
  return "text-muted-foreground";
}

function MatchScoreRing({ score }: { score: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, score) / 100);
  return (
    <div className="relative flex size-14 shrink-0 items-center justify-center">
      <svg className="size-14 -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className={cn("absolute text-sm font-semibold", scoreColor(score))}>{Math.round(score)}</span>
    </div>
  );
}

function MatchCard({ match, rank }: { match: PathwayReportMatch; rank: number }) {
  return (
    <Card className={cn("overflow-hidden", `rise-in-${Math.min(rank, 3)}`)}>
      <CardHeader className="flex-row items-start gap-4 space-y-0">
        <MatchScoreRing score={match.match_score} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
              {rank}
            </span>
            <CardTitle className="text-base">{match.title}</CardTitle>
          </div>
          {match.why && <CardDescription className="mt-1">{match.why}</CardDescription>}
        </div>
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
                <ul className="space-y-3 text-sm">
                  {match.pathways.map((p, idx) => {
                    const Icon = ROUTE_ICONS[p.route] ?? Landmark;
                    return (
                      <li key={idx} className="flex gap-2">
                        <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <span className="font-medium">{p.title}</span> — {p.details}
                          {p.typical_duration && (
                            <span className="text-muted-foreground"> ({p.typical_duration})</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
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
  const radarData = Object.entries(RIASEC_LABELS).map(([letter, label]) => ({
    trait: label,
    value: Math.round((scores[letter] ?? 0) * 100),
  }));

  return (
    <>
      <PathfinderHeader />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <div className="rise-in">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Your Pathway Report</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Career matches, based on what you shared
          </h1>
          {report.riasec_profile?.rationale && (
            <p className="mt-2 max-w-xl text-muted-foreground">{report.riasec_profile.rationale}</p>
          )}
        </div>

        <Card className="rise-in-1 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Your interest profile (RIASEC)</CardTitle>
            <CardDescription>
              Based on the Holland Codes model — how your interests map across six broad types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto h-72 w-full max-w-md">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="trait" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    dataKey="value"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-2 border-t pt-4 sm:grid-cols-6">
              {radarData.map((d) => (
                <div key={d.trait} className="text-center">
                  <p className="text-sm font-semibold">{d.value}</p>
                  <p className="text-[11px] text-muted-foreground">{d.trait}</p>
                </div>
              ))}
            </div>
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
          <div className="space-y-4">
            {report.top_matches.map((match, i) => (
              <MatchCard key={match.career_profile_id} match={match} rank={i + 1} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
