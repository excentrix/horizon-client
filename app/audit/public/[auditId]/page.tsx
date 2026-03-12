"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { auditApi } from "@/lib/api";
import type { AuditReport } from "@/types";
import { VeloShell } from "@/components/velo/velo-shell";

export default function PublicAuditReportPage() {
  const params = useParams();
  const auditId = params.auditId as string;
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await auditApi.getPublicReport(auditId);
        setReport(data);
      } catch (err) {
        setError("Report unavailable.");
      }
    };
    if (auditId) {
      void load();
    }
  }, [auditId]);

  return (
    <VeloShell>
      <div className="border-[3px] border-green-700 p-6">
        <h2 className="text-xl font-semibold uppercase tracking-[0.2em]">
          Horizon Evidence Chain
        </h2>
        <p className="mt-2 text-sm text-green-300">
          Public recruiter view. Transcript withheld.
        </p>
      </div>

      {error ? <p className="text-red-400">{error}</p> : null}

      {report ? (
        <div className="border-[3px] border-green-700 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{report.project_title}</h2>
            <p className="text-sm text-green-300">Status: {report.status}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">H_m Score</p>
              <p className="text-2xl font-semibold">{report.scores.hm_score ?? "-"}</p>
            </div>
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">Interrogation Depth</p>
              <p className="text-2xl font-semibold">{report.scores.interrogation_depth ?? "-"}</p>
            </div>
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">Evidence Validity</p>
              <p className="text-2xl font-semibold">{report.scores.evidence_validity ?? "-"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </VeloShell>
  );
}
