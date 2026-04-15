"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { GamificationProvider } from "@/components/gamification";
import { cn } from "@/lib/utils";
import { SupportFeedbackWidget } from "@/components/ui/support-feedback-widget";
import { StudioDockNav } from "@/components/layout/studio-dock-nav";
import { ProfileMenu } from "@/components/layout/profile-menu";
import Link from "next/link";

export default function StudioLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const isPlansV2 = pathname === "/plans/v2";
  const isNoPageScrollRoute = pathname === "/chat" || isDashboard;
  const hideDock =
    (pathname.includes("/plans/") && pathname.includes("/playground")) ||
    pathname.startsWith("/onboarding");

  return (
    <GamificationProvider>
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/92 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 lg:px-6">
            <Link href="/dashboard" className="font-display text-sm uppercase tracking-[0.18em] text-foreground">
              Horizon Studio
            </Link>
            <ProfileMenu variant="compact" />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <main
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              isNoPageScrollRoute
                ? "pb-0"
                : isPlansV2
                  ? "pb-0"
                  // ? "pb-[calc(2.5rem+env(safe-area-inset-bottom))]"
                : hideDock
                  ? "pb-0"
                  : "pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-[calc(7rem+env(safe-area-inset-bottom))]",
            )}
          >
            <div
              className={cn(
                "flex-1 min-h-0",
                isNoPageScrollRoute ? "overflow-hidden" : "overflow-y-auto",
              )}
            >
              {children}
            </div>
          </main>
        </div>

        {hideDock ? null : <StudioDockNav />}
        <SupportFeedbackWidget />
      </div>
    </GamificationProvider>
  );
}
