import type { Metadata } from "next";
import { CredentialView } from "./credential-view";

// Server wrapper so shared credential links unfurl as certificates (OG image
// via /api/og/credential) on WhatsApp/LinkedIn/X. The page itself stays a
// client component (./credential-view).

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

type Props = { params: Promise<{ auditId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { auditId } = await params;
  const fallback: Metadata = {
    title: "VELO credential — proof of work",
    description:
      "A code-grounded verification credential. Every score comes from a live interrogation about the candidate's own implementation.",
  };
  try {
    const res = await fetch(`${API_BASE}/audits/${auditId}/public/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return fallback;
    const body = await res.json();
    const report = body?.data ?? body;
    const v = report?.verification;
    if (!v) return fallback;

    const title = `${v.project_title || report.project_title || "Project"} — VELO ${
      v.status === "verified" ? "verified" : v.status === "suspicious" ? "flagged" : "credential"
    }`;
    const description =
      v.verdict_summary?.slice(0, 200) ||
      "Defended in a live interrogation grounded in the real source code. Full transcript public.";
    const og = new URLSearchParams({
      title: v.project_title || report.project_title || "Proof of work",
      status: v.status || "verified",
      meta: `${v.questions_answered ?? 0} questions defended · ${v.files_analyzed ?? 0} files read`,
    });
    if (v.score != null) og.set("score", String(Math.round(v.score * 100)));

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: `/api/og/credential?${og.toString()}`, width: 1200, height: 630 }],
      },
      twitter: { card: "summary_large_image", title, description },
    };
  } catch {
    return fallback;
  }
}

export default function Page() {
  return <CredentialView />;
}
