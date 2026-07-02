import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      {/* faint warm first-light wash behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{ background: "radial-gradient(60% 100% at 50% 0%, var(--brand-parchment) 0%, transparent 70%)", opacity: 0.5 }}
      />
      <div className="relative w-full max-w-5xl">{children}</div>
    </div>
  );
}
