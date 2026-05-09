"use client";

import { useState } from "react";
import { X, RefreshCw, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export type RegenerationModalMode = "reason_required" | "exceeded";

interface Props {
  mode: RegenerationModalMode;
  limit: number;
  nextReset?: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function RegenerationModal({ mode, limit, nextReset, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  const formattedReset = nextReset
    ? new Date(nextReset).toLocaleDateString(undefined, { month: "long", day: "numeric" })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* Header */}
        <div className={`rounded-t-2xl px-6 pt-6 pb-5 ${mode === "exceeded" ? "bg-amber-50" : "bg-violet-50"}`}>
          <button onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
          <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-full ${
            mode === "exceeded" ? "bg-amber-100 text-amber-600" : "bg-violet-100 text-violet-600"
          }`}>
            {mode === "exceeded" ? <Lock className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            {mode === "exceeded" ? "Regeneration limit reached" : "Regenerate lesson"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "exceeded"
              ? `Your free plan includes ${limit} lesson regeneration${limit !== 1 ? "s" : ""}.${
                  formattedReset ? ` You can regenerate again on ${formattedReset}.` : ""
                }`
              : `Your free plan allows ${limit} lesson regeneration${limit !== 1 ? "s" : ""}. Help us improve by telling us why you're regenerating.`}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {mode === "reason_required" ? (
            <>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Why are you regenerating this lesson?
              </label>
              <textarea
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. The content felt too basic, I'd like more hands-on examples…"
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              <p className="mt-1.5 text-xs text-slate-400">
                This uses your one regeneration for this task.
              </p>
            </>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Upgrade your plan to unlock unlimited lesson regenerations and
              more AI-powered customisations.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500">
            {mode === "exceeded" ? "Close" : "Cancel"}
          </Button>
          {mode === "reason_required" && (
            <Button
              size="sm"
              disabled={!reason.trim() || submitting}
              onClick={handleSubmit}
              className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
            >
              {submitting ? "Regenerating…" : "Regenerate"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
