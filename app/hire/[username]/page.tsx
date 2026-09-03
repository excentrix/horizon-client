"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { auditApi } from "@/lib/api";

// The HR-facing entry point — separate from the general/self-curated
// /p/<username> page on purpose (see docs/velo/PRODUCT.md's two-trust-
// surfaces model). Submitting this form auto-grants access (no candidate
// approval step — that's the fuller HR-initiated flow, deferred) and logs
// the request against the candidate, then hands off to the same printable
// report page (/p/<username>/report) with the minted token.

export default function RequestHiringProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = (params?.username ?? "") as string;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { access_token } = await auditApi.requestHiringProfileAccess(username, {
        requester_name: name,
        requester_email: email,
        requester_company: company,
        role_hiring_for: role,
      });
      router.push(`/p/${encodeURIComponent(username)}/report?token=${encodeURIComponent(access_token)}`);
    } catch {
      setError("Couldn't process that request — check the fields and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="size-4 text-[color:var(--brand-indigo)]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            Request Hiring Profile
          </span>
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Get {username}&apos;s verified evidence
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Dimension scores, examiner notes, claim-vs-evidence honesty — the full dossier, not the
          self-curated summary. Your request is logged and visible to the candidate.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div>
            <label htmlFor="requester_name" className="text-xs font-medium text-foreground">
              Your name
            </label>
            <input
              id="requester_name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="requester_email" className="text-xs font-medium text-foreground">
              Work email
            </label>
            <input
              id="requester_email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="requester_company" className="text-xs font-medium text-foreground">
              Company
            </label>
            <input
              id="requester_company"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="role_hiring_for" className="text-xs font-medium text-foreground">
              Role you&apos;re hiring for <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="role_hiring_for"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting && <Loader2 className="size-3.5 animate-spin" />}
            View Hiring Profile
          </button>
        </form>
      </div>
    </div>
  );
}
