import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 px-4">
      <div className="w-full max-w-4xl">{children}</div>
    </div>
  );
}
