"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  DEFAULT_FLAGS,
  fetchFeatureFlags,
  type FeatureFlags,
  type FeatureName,
} from "@/lib/feature-flags";

/** The underlying query — exposes whether the REAL flags have loaded yet, distinct from the
 * DEFAULT_FLAGS placeholder. Callers that redirect/enforce based on a flag must wait for `data` to
 * be defined — enforcing on the placeholder is a real bug: a flag that defaults to false (like
 * `pathfinder`, dark-by-default) but is actually true for this deployment would get a route guard
 * redirect fired on the placeholder's `false` before the real `true` value ever arrives. */
export function useFeatureFlagsQuery() {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: fetchFeatureFlags,
    staleTime: 60_000,
    // placeholderData (not initialData) so we render with safe defaults but
    // still fetch the real flags immediately — otherwise a disabled flag like
    // `dashboard` wouldn't take effect until staleTime elapsed.
    placeholderData: keepPreviousData,
  });
}

/** Live feature-flag map, cached and shared across the app. Falls back to DEFAULT_FLAGS for
 * display purposes (e.g. "should I show this nav item") — NOT safe to use for redirect/enforcement
 * logic, since the fallback masks whether real data has loaded. Use useFeatureFlagsQuery for that. */
export function useFeatureFlags(): FeatureFlags {
  const { data } = useFeatureFlagsQuery();
  return data ?? DEFAULT_FLAGS;
}

/** True if a single feature is enabled. */
export function useFeature(name: FeatureName): boolean {
  return Boolean(useFeatureFlags()[name]);
}
