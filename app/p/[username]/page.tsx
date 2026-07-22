import type { Metadata } from "next";
import { PublicProfileView } from "./profile-view";

// Server wrapper so shared profile links (/p/<username>?tab=verified) unfurl
// with the candidate's verified headline + OG card. The page itself stays a
// client component (./profile-view).

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const fallback: Metadata = {
    title: `@${username} — portfolio`,
    description: "Projects, skills and verified work.",
  };
  try {
    const res = await fetch(`${API_BASE}/verified-profile/${encodeURIComponent(username)}/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return fallback;
    const body = await res.json();
    const data = body?.data ?? body;
    const vp = data?.verified_profile;
    if (!vp) return fallback;

    const name = data.candidate?.name || username;
    const title = vp.headline ? `${name} — ${vp.headline}` : `${name} — VELO-verified profile`;
    const description =
      vp.narrative?.slice(0, 200) ||
      `${vp.verified_project_count}/${vp.claimed_project_count} projects defended under code-grounded interrogation.`;
    const og = new URLSearchParams({
      title: vp.headline || `${name} — verified profile`,
      status: "verified",
      meta: `${vp.verified_project_count}/${vp.claimed_project_count} projects defended · ${vp.coverage} sample`,
    });

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
  return <PublicProfileView />;
}
