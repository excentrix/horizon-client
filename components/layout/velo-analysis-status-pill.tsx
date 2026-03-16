"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { auditApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MirrorStatus = "empty" | "running" | "ready" | "failed";

export function VeloAnalysisStatusPill() {
  const [status, setStatus] = useState<MirrorStatus>("empty");
  const [mirrorId, setMirrorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissedForMirror, setDismissedForMirror] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissedForMirror(window.localStorage.getItem("velo_analysis_dismissed_for"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await auditApi.getMirrorLatest();
        if (cancelled) return;
        setStatus(data.status);
        setMirrorId(data.mirror?.id ?? null);
        setError(data.analysis_job?.error ?? null);
      } catch {
        if (!cancelled) setStatus("empty");
      }
    };
    void poll();
    const id = window.setInterval(() => {
      // Keep frequent polling only while analysis is running.
      if (status === "running") {
        void poll();
      }
    }, 15000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void poll();
      }
    };
    const onOnline = () => {
      void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [status]);

  const isDismissed = useMemo(
    () => status === "ready" && mirrorId && dismissedForMirror === mirrorId,
    [dismissedForMirror, mirrorId, status]
  );

  if (status === "empty" || isDismissed) return null;

  if (status === "running") {
    return (
      <div className="mx-4 mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-blue-800">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="font-medium">VELO analysis running</span>
        </div>
        <p className="mt-1 text-[11px] text-blue-700">You can continue with mentor while this runs in background.</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mx-4 mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-rose-800">
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="font-medium">VELO analysis failed</span>
        </div>
        <p className="mt-1 text-[11px] text-rose-700">{error || "Retry from onboarding."}</p>
        <Button asChild size="sm" variant="outline" className="mt-2 h-7 text-xs">
          <Link href="/onboarding">Open Onboarding</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("mx-4 mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2")}>
      <div className="flex items-center gap-2 text-xs text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="font-medium">VELO analysis ready</span>
      </div>
      <p className="mt-1 text-[11px] text-emerald-700">Your Mirror report is available now.</p>
      <div className="mt-2 flex items-center gap-2">
        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
          <Link href="/mirror">View Mirror</Link>
        </Button>
        <button
          type="button"
          className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => {
            if (!mirrorId || typeof window === "undefined") return;
            window.localStorage.setItem("velo_analysis_dismissed_for", mirrorId);
            setDismissedForMirror(mirrorId);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
