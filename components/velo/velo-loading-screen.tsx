"use client";

import { Loader2 } from "lucide-react";

export function VeloLoadingScreen({
  title = "Opening your VELO case file",
  body = "Loading your defended projects, evidence map, and recruiter-facing record.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center justify-center px-6 py-10">
      <div className="grain relative w-full max-w-3xl overflow-hidden rounded-[28px] border border-border bg-card px-6 py-10 shadow-sm md:px-10 md:py-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo/mark-color.svg" alt="" className="size-10" />
            <div>
              <p className="font-display text-xl font-semibold tracking-tight">VELO</p>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Verification in progress
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {body}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              "Restoring your case file",
              "Rehydrating verification evidence",
              "Preparing recruiter-facing views",
            ].map((label) => (
              <div
                key={label}
                className="rounded-2xl border border-border bg-muted/35 px-4 py-4"
              >
                <div className="mb-3 h-2 w-24 rounded-full bg-primary/15" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded-full bg-muted" />
                  <div className="h-3 w-4/5 rounded-full bg-muted" />
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3">
            <Loader2 className="size-4 animate-spin text-primary" />
            <p className="text-sm text-foreground/85">
              VELO is rebuilding the record, not showing placeholder verdicts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
