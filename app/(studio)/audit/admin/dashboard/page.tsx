"use client";

import { useEffect, useState } from "react";
import { auditApi } from "@/lib/api";

export default function AuditAdminDashboardPage() {
  const [metrics, setMetrics] = useState<{
    total_audits: number;
    verified: number;
    narrative_validated: number;
    unverified: number;
    completion_rate: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await auditApi.getAdminMetrics();
        setMetrics(data);
      } catch (err) {
        setError("Unable to load audit metrics.");
      }
    };
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-black text-green-100 px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="border-[3px] border-green-500 p-6">
          <h1 className="text-xl font-semibold uppercase tracking-[0.2em]">
            College Audit Dashboard
          </h1>
          <p className="mt-2 text-sm text-green-300">
            Cohort-level metrics for audit completion and verification.
          </p>
        </div>

        {error ? <p className="text-red-400">{error}</p> : null}

        {metrics ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border-[3px] border-green-700 p-4">
              <p className="text-xs uppercase text-green-400">Total Audits</p>
              <p className="text-2xl font-semibold">{metrics.total_audits}</p>
            </div>
            <div className="border-[3px] border-green-700 p-4">
              <p className="text-xs uppercase text-green-400">Completion Rate</p>
              <p className="text-2xl font-semibold">{Math.round(metrics.completion_rate * 100)}%</p>
            </div>
            <div className="border-[3px] border-green-700 p-4">
              <p className="text-xs uppercase text-green-400">Verified Truth</p>
              <p className="text-2xl font-semibold">{metrics.verified}</p>
            </div>
            <div className="border-[3px] border-green-700 p-4">
              <p className="text-xs uppercase text-green-400">Narrative Validated</p>
              <p className="text-2xl font-semibold">{metrics.narrative_validated}</p>
            </div>
            <div className="border-[3px] border-green-700 p-4">
              <p className="text-xs uppercase text-green-400">Unverified</p>
              <p className="text-2xl font-semibold">{metrics.unverified}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
