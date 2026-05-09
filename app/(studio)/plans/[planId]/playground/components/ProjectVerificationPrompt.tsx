"use client";

import { useState } from "react";
import { planningApi } from "@/lib/api";
import { ProjectVerificationSheet } from "@/components/mirror/ProjectVerificationSheet";

interface ProjectVerificationPromptProps {
  taskId: string;
  taskTitle: string;
  /** Called after a successful verdict so the parent can update task status */
  onVerified?: (score: number) => void;
}

export function ProjectVerificationPrompt({
  taskId,
  taskTitle,
  onVerified,
}: ProjectVerificationPromptProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState<string>(taskTitle);
  const [sheetOpen, setSheetOpen] = useState(false);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const data = await planningApi.startVeloVerification(taskId);
      setSnapshotId(data.snapshot_id);
      setProjectTitle(data.project_title || taskTitle);
      setSheetOpen(true);
    } catch {
      setError("Could not start verification. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSheetClose(open: boolean) {
    if (!open && snapshotId) {
      // Sheet closed — check if verification completed
      try {
        const status = await planningApi.getVeloStatus(taskId);
        if (
          status.started &&
          status.status === "verified" &&
          status.verification_score != null
        ) {
          await planningApi.completeVeloVerification(taskId, {
            status: status.status,
            verification_score: status.verification_score,
            verdict_summary: status.verdict_summary,
          });
          onVerified?.(status.verification_score);
        }
      } catch {
        // Non-critical — post-verification actions will retry on next open
      }
    }
    setSheetOpen(open);
  }

  return (
    <>
      <article className="flex flex-col overflow-hidden rounded-xl border border-violet-800/40 bg-[#0E1117] shadow-xl">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-violet-600/70 to-indigo-600/70 px-6 py-5 shrink-0">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -right-2 -top-2 h-12 w-12 rounded-full bg-white/8" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/20 text-xl">
              🔍
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
                VELO Verification
              </p>
              <h2 className="text-base font-bold text-white leading-tight">
                Verify Your Project
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col gap-5">
          <p className="text-sm text-slate-300 leading-relaxed">
            You&apos;ve completed the learning path for{" "}
            <span className="font-semibold text-white">{taskTitle}</span>. Now
            prove you built it — VELO will review your code, validate your
            documentation, and run a live technical interview to verify
            ownership and depth.
          </p>

          {/* Steps */}
          <ol className="flex flex-col gap-3">
            {[
              {
                step: "01",
                label: "Connect your repository",
                desc: "Link the GitHub repo(s) where your project lives.",
              },
              {
                step: "02",
                label: "Submit VELO_AUDIT.md",
                desc: "Push a completed VELO_AUDIT.md to your repo. A pre-filled template is included.",
              },
              {
                step: "03",
                label: "Pass the interrogation",
                desc: "Answer adaptive questions about architecture, decisions, and trade-offs.",
              },
              {
                step: "04",
                label: "Earn your badge",
                desc: "A verified project is added to your portfolio with a VELO badge.",
              },
            ].map(({ step, label, desc }) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-400 mt-0.5">
                  {step}
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-200">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ol>

          {error && (
            <p className="text-xs text-red-400 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={loading}
            className="mt-1 w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {loading ? "Starting…" : "Start VELO Verification →"}
          </button>
        </div>
      </article>

      {snapshotId && (
        <ProjectVerificationSheet
          open={sheetOpen}
          onOpenChange={handleSheetClose}
          snapshotId={snapshotId}
          projectIndex={0}
          projectTitle={projectTitle}
        />
      )}
    </>
  );
}
