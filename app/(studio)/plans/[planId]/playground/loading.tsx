"use client";

export default function PlaygroundLoading() {
  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] items-center justify-center bg-background p-6">
      <div className="w-full max-w-xl rounded-3xl border bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-full bg-emerald-200" />
        <p className="text-sm font-semibold text-foreground">
          Entering your learning playground
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Setting up your task, mentor, and resources...
        </p>
      </div>
    </div>
  );
}
