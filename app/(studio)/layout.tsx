import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex min-h-0 flex-col">
        <main className="flex max-h-screen flex-1 flex-col gap-4 lg:gap-6">
          {children}
        </main>
      </div>
    </div>
  );
}
