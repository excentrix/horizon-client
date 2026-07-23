import { pathfinderApi } from "@/lib/api";
import { fetchFeatureFlags } from "@/lib/feature-flags";
import type { UserSummary } from "@/types";

type RoutableUser = Pick<UserSummary, "is_superuser" | "user_type" | "onboarding_completed">;

/**
 * The SINGLE source of truth for "where does this logged-in user land." Previously this branching
 * was duplicated three times inside AuthContext (password login, Google/magic-link sync, one more)
 * plus once here — none of the AuthContext copies knew about Pathfinder, so a school user would get
 * sent to /dashboard by AuthContext's own router.push before this function's caller ever got a
 * chance to redirect them to /pathfinder. That race is why login wasn't routing Pathfinder users
 * correctly even after the entitlement check itself was correct. Call this from AuthContext (the
 * earliest point after auth succeeds), not from individual pages.
 */
export async function resolveHomeRoute(user: RoutableUser | null | undefined): Promise<string> {
  if (!user) return "/login";
  if (user.user_type === "student" && !user.onboarding_completed) return "/onboarding";
  if (user.is_superuser) return "/hq";
  if (user.user_type === "admin" || user.user_type === "educator") return "/institution/overview";

  try {
    const { pathfinder_enabled } = await pathfinderApi.getEntitlement();
    if (pathfinder_enabled) return "/pathfinder";
  } catch {
    // Global flag off (404 from FeatureFlagMiddleware) or any other failure — fall through.
  }
  const flags = await fetchFeatureFlags();
  return flags.dashboard ? "/dashboard" : "/verify";
}
