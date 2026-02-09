 "use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { GamificationProvider } from "@/components/gamification";
import { cn } from "@/lib/utils";

export default function StudioLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideSidebar =
    pathname.includes("/plans/") && pathname.includes("/playground");

  return (
    <GamificationProvider>
      <div
        className={cn(
          "grid min-h-screen w-full",
          hideSidebar ? "grid-cols-1" : "md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]",
        )}
      >
        {hideSidebar ? null : <Sidebar />}
        <div className="flex min-h-0 flex-col">
          <main className="flex max-h-screen flex-1 flex-col gap-4 lg:gap-6">
            {children}
          </main>
        </div>
      </div>
    </GamificationProvider>
  );
}
