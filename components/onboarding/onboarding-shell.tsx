"use client";

import type { ReactNode } from "react";
import { Compass, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type OnboardingShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

export function OnboardingShell({
  title,
  subtitle,
  children,
  className,
}: OnboardingShellProps) {
  return (
    <div className="min-h-screen bg-[color:var(--color-primary-surface)] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-3xl border border-border bg-card px-6 py-5 shadow-[var(--shadow-1)]">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-[color:var(--color-primary-surface)] text-[color:var(--dock-item-active)]">
              <Compass className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-mono-ui text-[10px] tracking-[0.22em] uppercase text-muted-foreground">
                Horizon Onboarding
              </p>
              <h1 className="font-display text-2xl leading-tight text-foreground md:text-3xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            <div className="ml-auto hidden rounded-full border border-border bg-[color:var(--color-primary-surface)] px-3 py-1 text-xs text-muted-foreground md:flex md:items-center md:gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--dock-item-active)]" />
              VELO ready
            </div>
          </div>
        </header>

        <main className={cn("rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-1)] md:p-7", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}

