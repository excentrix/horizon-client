"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFeatureFlags, useFeatureFlagsQuery } from "@/hooks/use-features";
import { usePathfinderEntitlementQuery } from "@/hooks/use-pathfinder-entitlement";
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

// VELO's own product surfaces — stay globally on (the "velo" flag is core-product-true for
// everyone), but a school whose org has Pathfinder enabled shouldn't land its users in VELO's
// candidate/HR verification flow. Segmentation the blunt global flags can't express, since it's
// per-user (org entitlement), not per-deployment.
const VELO_ONLY_PREFIXES = ["/verify", "/analysis", "/audit"];

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
  // Deliberately NOT useFeatureFlags() — that falls back to DEFAULT_FLAGS while the real fetch is
  // in flight, and DEFAULT_FLAGS has pathfinder (and other dark-by-default flags) as false. Acting
  // on that placeholder would redirect away from a route that's actually enabled for this
  // deployment, before the real value ever arrives. Wait for `data` to be defined.
  const { data: flags } = useFeatureFlagsQuery();
  const { data: entitlement } = usePathfinderEntitlementQuery();

  useEffect(() => {
    if (!flags) return;
    const match = ROUTE_FLAGS.find(([prefix]) => pathname.startsWith(prefix));
    if (match && !flags[match[1]]) {
      router.replace(flags.dashboard ? "/dashboard" : "/verify");
      return;
    }
    // Same reasoning as above: wait for the real entitlement value before enforcing anything on it.
    if (
      entitlement?.pathfinder_enabled &&
      VELO_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ) {
      router.replace("/pathfinder");
    }
  }, [pathname, flags, entitlement, router]);

  return null;
}
