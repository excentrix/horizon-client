"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type OnboardingShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

/**
 * First-run VELO frame — the user's first impression of the product. Paper,
 * grain, the real VELO lockup, and the whole loop stated up front so a
 * brand-new user knows exactly what happens next.
 */
export function OnboardingShell({
  title,
  subtitle,
  children,
  className,
}: OnboardingShellProps) {
  return (
    <div className="grain relative min-h-screen bg-background px-4 py-10 md:px-6">
      <div className="relative mx-auto w-full max-w-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo/velo-lockup-color.svg" alt="VELO by excentrix" className="h-8" />

        <header className="rise-in mt-10">
          <p className="eyebrow flex items-center gap-2">
            <span className="eyebrow-dot" /> Case file · step 1 of 1
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
        </header>

        {/* The loop, before the first action — orientation beats onboarding tours. */}
        <ol className="rise-in-1 mt-6 grid gap-2 sm:grid-cols-3">
          {[
            ["Upload", "We extract the projects your résumé claims."],
            ["Defend", "VELO interrogates you on each one, grounded in your real code."],
            ["Share", "What you defend becomes a credential recruiters can audit."],
          ].map(([step, detail], i) => (
            <li key={step} className="rounded-xl border border-border bg-card/60 p-3">
              <p className="caseline uppercase tracking-[0.18em]">
                {i + 1} · {step}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/80">{detail}</p>
            </li>
          ))}
        </ol>

        <main
          className={cn(
            "rise-in-2 mt-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-1)] md:p-7",
            className,
          )}
        >
          {children}
        </main>

        <p className="caseline mt-6 text-center uppercase tracking-[0.18em]">
          Free first verification · nothing is shared until you choose to
        </p>
      </div>
    </div>
  );
}
