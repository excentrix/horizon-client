"use client";

import Link from "next/link";
import { ProfileMenu } from "@/components/layout/profile-menu";

/**
 * Pathfinder's own header — deliberately NOT the shared VELO-branded studio header (no VELO
 * wordmark/nav), but uses the same Horizon logomark as VELO for brand consistency.
 */
export function PathfinderHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/92 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 lg:px-6">
        <Link href="/pathfinder" className="flex items-center gap-2" aria-label="Horizon Pathfinder">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo/mark-color.svg" alt="" className="h-5 w-5" />
          <span className="font-medium">Pathfinder</span>
        </Link>
        <ProfileMenu variant="compact" />
      </div>
    </header>
  );
}
