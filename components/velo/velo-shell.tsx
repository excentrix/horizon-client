"use client";

import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

export function VeloShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(900px_420px_at_0%_0%,rgba(99,102,241,0.08),transparent),radial-gradient(800px_360px_at_100%_0%,rgba(56,189,248,0.08),transparent)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[var(--shadow-2)] backdrop-blur">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">VELO</p>
              <h1 className="text-xl font-semibold">Verification & Evidence Layer</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Structured onboarding, readiness audit, and mentor handoff for roadmap personalization.
              </p>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
