import { ShieldCheck } from "lucide-react";

// "first light" auth panel — dark ink surface, one rising-sun (energy) glow,
// paper text, the real VELO lockup (from horizon-web's brand kit), and the mono
// eyebrow signature. Shared by the login and register split layouts.
//
// Responsive: left column on desktop, a compact top band on mobile (vertical
// split) — the points list + footer are desktop-only to keep the band short.

const DEFAULT_POINTS = [
  "Interrogated on your real code — not a quiz",
  "A verdict you can actually defend",
  "A credential you can share with anyone",
];

// Faint fractal-noise grain — the brand's "warm print" texture.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function AuthBrandPanel({
  heading = "Prove you can defend the work you claim.",
  points = DEFAULT_POINTS,
}: {
  heading?: string;
  points?: string[];
}) {
  return (
    <div className="relative flex flex-col gap-7 overflow-hidden bg-[#1b1b20] p-8 text-[color:var(--brand-parchment)] lg:justify-between lg:gap-0 lg:p-10">
      {/* rising sun */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full blur-[64px]"
        style={{ background: "radial-gradient(circle, var(--brand-tangerine) 0%, transparent 68%)", opacity: 0.5 }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-6 top-8 h-24 w-24 rounded-full blur-[10px]"
        style={{ background: "radial-gradient(circle, var(--brand-tangerine) 0%, transparent 70%)", opacity: 0.2 }}
      />
      {/* grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: GRAIN }}
      />

      {/* VELO lockup (shared sun mark + wordmark) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo/velo-lockup-cream.svg" alt="VELO" className="relative h-7 w-auto self-start" />

      {/* message */}
      <div className="relative max-w-sm space-y-4 lg:space-y-6">
        <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-[color:var(--brand-parchment)]/55">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--brand-tangerine)" }} />
          Proof of work
        </p>
        <h2 className="font-display text-xl font-semibold leading-[1.15] tracking-tight lg:text-[1.9rem] lg:leading-[1.12]">
          {heading}
        </h2>
        <ul className="hidden space-y-3.5 lg:block">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-sm leading-snug text-[color:var(--brand-parchment)]/75">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--brand-tangerine)" }} />
              {p}
            </li>
          ))}
        </ul>
      </div>

      {/* footer — desktop only */}
      <p className="relative hidden font-mono text-[11px] tracking-wide text-[color:var(--brand-parchment)]/40 lg:block">
        Verification, not vibes.
      </p>
    </div>
  );
}
