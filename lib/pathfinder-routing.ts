import { pathfinderApi } from "@/lib/api";

/**
 * Where a logged-in user should land. Superusers go to HQ. Students/educators whose school has
 * Pathfinder enabled land on Pathfinder instead of the VELO-first dashboard — Pathfinder is their
 * product, not VELO. Everyone else keeps the existing dashboard default.
 */
export async function resolveHomeRoute(user: { is_superuser?: boolean } | null | undefined): Promise<string> {
  if (!user) return "/login";
  if (user.is_superuser) return "/hq";
  try {
    const { pathfinder_enabled } = await pathfinderApi.getEntitlement();
    if (pathfinder_enabled) return "/pathfinder";
  } catch {
    // Global flag off (404 from FeatureFlagMiddleware) or any other failure — fall through.
  }
  return "/dashboard";
}
