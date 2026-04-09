 "use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { GamificationProvider } from "@/components/gamification";
import { cn } from "@/lib/utils";
import { SupportFeedbackWidget } from "@/components/ui/support-feedback-widget";

export default function StudioLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideSidebar =
    (pathname.includes("/plans/") && pathname.includes("/playground")) ||
    pathname.startsWith("/onboarding");

  return (
    <GamificationProvider>
      <div
        className={cn(
          "grid h-screen w-full overflow-hidden",
          hideSidebar ? "grid-cols-1" : "md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]",
        )}
      >
        {hideSidebar ? null : <Sidebar />}
        <div className="flex min-h-0 flex-col">
          <main className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            pathname === "/chat" ? "gap-0" : "gap-4 lg:gap-6"
          )}>
            <div className={cn(
              "flex-1 min-h-0",
              pathname === "/chat" ? "overflow-hidden" : "overflow-y-auto"
            )}>
              {children}
            </div>
          </main>
        </div>
        <SupportFeedbackWidget />
      </div>
    </GamificationProvider>
  );
}
