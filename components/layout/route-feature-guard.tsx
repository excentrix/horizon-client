"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFeatureFlags } from "@/hooks/use-features";
import type { FeatureName } from "@/lib/feature-flags";

// Map studio route prefixes → the feature flag that gates them.
const ROUTE_FLAGS: Array<[string, FeatureName]> = [
  ["/verify", "velo"],
  ["/analysis", "velo"],
  ["/audit", "velo"],
  ["/chat", "chat"],
  ["/plans", "plans"],
  ["/roadmap", "roadmap"],
  ["/progress", "progress"],
  ["/simulations", "simulations"],
  ["/leaderboard", "gamification"],
  ["/institution", "institutions"],
  ["/dashboard", "dashboard"],
  ["/pathfinder", "pathfinder"],
];

/** True if the current route's feature flag is disabled. */
export function useIsRouteDisabled(): boolean {
  const pathname = usePathname() ?? "";
  const flags = useFeatureFlags();
  const match = ROUTE_FLAGS.find(([prefix]) => pathname.startsWith(prefix));
  return Boolean(match && !flags[match[1]]);
}

/**
 * Redirects away from a route whose feature is disabled. Falls back to the
 * VELO verify hub (always-on core product) — or /dashboard if the learning
 * surface is enabled. The backend already dark-routes the APIs; this keeps
 * the UX clean and avoids redirect loops when /dashboard itself is off.
 */
export function RouteFeatureGuard() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const flags = useFeatureFlags();

  useEffect(() => {
    const match = ROUTE_FLAGS.find(([prefix]) => pathname.startsWith(prefix));
    if (match && !flags[match[1]]) {
      router.replace(flags.dashboard ? "/dashboard" : "/verify");
    }
  }, [pathname, flags, router]);

  return null;
}
