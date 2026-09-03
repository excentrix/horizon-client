import type { Metadata } from "next";

// Server wrapper so the printed/PDF'd report — and a browser's print
// header/footer, when a user leaves that dialog option on — carries the
// candidate's name instead of the app-wide "Horizon" title. The page itself
// stays a client component (./page.tsx); an imperative `document.title` set
// there doesn't reliably stick against Next's own metadata management, so
// this mirrors the working pattern already used by the parent profile route
// (app/p/[username]/page.tsx).

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const fallback: Metadata = { title: `@${username} — VELO Verified Capability Report` };
  try {
    // The candidate's name is present on both the teaser and the full
    // dossier response — no token needed just to title the page.
    const res = await fetch(`${API_BASE}/verified-profile/${encodeURIComponent(username)}/`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return fallback;
    const body = await res.json();
    const data = body?.data ?? body;
    const name = data?.candidate?.name;
    if (!name) return fallback;
    return { title: `${name} — VELO Verified Capability Report` };
  } catch {
    return fallback;
  }
}

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
