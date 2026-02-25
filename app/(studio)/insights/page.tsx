"use client";

import { useEffect, useState, useCallback } from "react";
import { intelligenceApi, portfolioApi } from "@/lib/api";
import { CompetencyGraph } from "@/components/intelligence/CompetencyGraph";
import { ReadinessGauge } from "@/components/intelligence/ReadinessGauge";
import { ProofGallery } from "@/components/intelligence/ProofGallery";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RefreshCw, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PortfolioArtifact } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CompetencyPoint {
  name: string;
  competency_type: string;
  proficiency_level: string;
  numeric_level: number;
  evidence_count: number;
}

interface ReadinessData {
  overall_readiness_score: number;
  career_stage_assessment: {
    stage: string;
    completed_roadmap_levels: number;
    advanced_competency_count: number;
  };
  professional_development_recommendations: Array<{
    competency: string;
    action: string;
    priority: string;
    related_goal: string | null;
  }>;
  skill_gaps?: Array<{
    competency: string;
    current_level: string;
    gap_size: number;
  }>;
}

interface EvidenceReadiness {
  score: number;
  label: string;
  top_competencies: string[];
  next_tips: string[];
  generated_at: string;
  error?: string;
}

// ─── Level → numeric score map ───────────────────────────────────────────────
const LEVEL_MAP: Record<string, number> = {
  developing: 1,
  emerging: 2,
  proficient: 3,
  advanced: 4,
  expert: 5,
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const [competencies, setCompetencies] = useState<CompetencyPoint[]>([]);
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [evidenceReadiness, setEvidenceReadiness] = useState<EvidenceReadiness | null>(null);
  const [artifacts, setArtifacts] = useState<PortfolioArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [compData, readinessData, evidenceReadinessData, artifactsData] = await Promise.allSettled([
        intelligenceApi.getCompetencyAssessments(),
        intelligenceApi.getCareerReadiness({ include_gaps: true, include_recommendations: true }),
        fetch("/api/portfolio/readiness/", { credentials: "include" }).then((r) => r.json()),
        portfolioApi.listArtifacts(),
      ]);

      if (compData.status === "fulfilled" && Array.isArray(compData.value)) {
        setCompetencies(
          compData.value.map((a) => ({
            name: a.competency.name,
            competency_type: a.competency.competency_type,
            proficiency_level: a.proficiency_level,
            numeric_level: LEVEL_MAP[a.proficiency_level] ?? 1,
            evidence_count: a.evidence_count ?? 0,
          }))
        );
      }

      if (readinessData.status === "fulfilled") {
        setReadiness(readinessData.value as ReadinessData);
      }

      if (evidenceReadinessData.status === "fulfilled") {
        setEvidenceReadiness(evidenceReadinessData.value as EvidenceReadiness);
      }

      if (artifactsData.status === "fulfilled" && Array.isArray(artifactsData.value)) {
        setArtifacts(artifactsData.value as PortfolioArtifact[]);
      }
    } catch {
      setError("Failed to load your insights. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Use the higher of the two readiness sources so verified work is always honoured
  const gaugeScore = Math.max(
    readiness?.overall_readiness_score ?? 0,
    evidenceReadiness?.score ?? 0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your Mirror</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          A real-time snapshot of your skills, proof of work, and career readiness.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={load}>
            <RefreshCw className="mr-1 h-3 w-3" /> Retry
          </Button>
        </div>
      )}

      {/* Top row: Readiness gauge + Skill gaps */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ReadinessGauge
          score={gaugeScore}
          careerStage={readiness?.career_stage_assessment}
          className="lg:col-span-1"
        />

        {/* Recommendations */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-violet-600" />
              Development Roadmap
            </CardTitle>
            <CardDescription>Actions to accelerate your career readiness</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : readiness?.professional_development_recommendations?.length ? (
              <ul className="space-y-2">
                {readiness.professional_development_recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3 text-sm">
                    <Badge
                      variant={r.priority === "high" ? "destructive" : "secondary"}
                      className="mt-0.5 shrink-0 text-[10px]"
                    >
                      {r.priority}
                    </Badge>
                    <div>
                      <p className="font-medium">{r.competency}</p>
                      <p className="text-xs text-muted-foreground">{r.action}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <TrendingUp className="h-8 w-8 opacity-40" />
                <p className="text-sm">
                  {competencies.length === 0
                    ? "Complete a few learning sessions to get personalised recommendations."
                    : "Great job! No critical skill gaps detected right now."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Competency Graph */}
      <CompetencyGraph competencies={loading ? [] : competencies} />

      {/* Proof Gallery */}
      <ProofGallery
        artifacts={loading ? [] : artifacts}
        isLoading={loading}
      />
    </div>
  );
}
