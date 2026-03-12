"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { auditApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { AuditReport } from "@/types";
import { VeloShell } from "@/components/velo/velo-shell";
import { Badge } from "@/components/ui/badge";

export default function AuditReportPage() {
  const params = useParams();
  const auditId = params.auditId as string;
  const [report, setReport] = useState<AuditReport | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [handoffLoading, setHandoffLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await auditApi.getReport(auditId);
        setReport(data);
      } catch (err) {
        setStatusMessage("Unable to load report.");
      }
    };
    if (auditId) {
      void load();
    }
  }, [auditId]);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/audit/public/${auditId}`;
  }, [auditId]);

  const handleMentorHandoff = async () => {
    if (!auditId) return;
    setHandoffLoading(true);
    try {
      const handoff = await auditApi.mentorHandoff(auditId);
      if (typeof window !== "undefined") {
        window.location.href = handoff.chat_url;
      }
    } catch {
      setStatusMessage("Unable to start mentor handoff.");
    } finally {
      setHandoffLoading(false);
    }
  };

  return (
    <VeloShell>
      {statusMessage ? <p className="text-red-400">{statusMessage}</p> : null}

      {report ? (
        <div className="border-[3px] border-green-700 p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
            <h2 className="text-lg font-semibold">{report.project_title}</h2>
            <p className="text-sm text-green-300">Audit Type: {report.audit_type}</p>
            </div>
            <Badge variant={report.mentor_context_status === "confirmed" ? "default" : "secondary"}>
              {report.mentor_context_status === "confirmed"
                ? "Mentor context confirmed"
                : "Mentor context pending"}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">H_m Score</p>
              <p className="text-2xl font-semibold">{report.scores.hm_score ?? "-"}</p>
            </div>
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">Code Signature</p>
              <p className="text-2xl font-semibold">{report.scores.code_signature ?? "-"}</p>
            </div>
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">Interrogation Depth</p>
              <p className="text-2xl font-semibold">{report.scores.interrogation_depth ?? "-"}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">Direction: Focus Areas</p>
              <ul className="mt-2 list-disc pl-4 text-sm text-green-200 space-y-1">
                {(report.direction_overview?.focus_areas || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">Direction: Risk Areas</p>
              <ul className="mt-2 list-disc pl-4 text-sm text-green-200 space-y-1">
                {(report.direction_overview?.risk_areas || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-[2px] border-green-800 p-4">
            <p className="text-xs uppercase text-green-500">Readiness Narrative</p>
            <p className="mt-2 text-sm text-green-200">
              {report.direction_overview?.readiness_narrative || "Mentor will use this audit context to personalize your roadmap."}
            </p>
          </div>

          {report.mentor_handoff_required ? (
            <div className="border-[2px] border-green-800 p-4 space-y-2">
              <p className="text-xs uppercase text-green-500">Next Step</p>
              <p className="text-sm text-green-200">
                Continue with mentor to convert this audit into a personalized roadmap context.
              </p>
              <Button
                onClick={handleMentorHandoff}
                disabled={handoffLoading}
                className="border-[3px] border-green-400 bg-green-400/10 text-green-200 hover:bg-green-400/20"
              >
                {handoffLoading ? "Opening Mentor..." : "Continue with Mentor"}
              </Button>
            </div>
          ) : null}

          <div className="border-[2px] border-green-800 p-4">
            <p className="text-xs uppercase text-green-500">Evidence Summary</p>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-green-200">
              {JSON.stringify(report.evidence_summary ?? {}, null, 2)}
            </pre>
          </div>
          {report.resume_summary ? (
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">Resume Summary</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-green-200">
                {JSON.stringify(report.resume_summary ?? {}, null, 2)}
              </pre>
            </div>
          ) : null}

          <div className="border-[2px] border-green-800 p-4 space-y-2">
            <p className="text-xs uppercase text-green-500">Shareable Link</p>
            <p className="text-sm break-all">{publicUrl}</p>
            <Button
              onClick={() => navigator.clipboard.writeText(publicUrl)}
              className="border-[3px] border-green-400 bg-green-400/10 text-green-200 hover:bg-green-400/20"
            >
              Copy Link
            </Button>
          </div>
        </div>
      ) : null}
    </VeloShell>
  );
}
