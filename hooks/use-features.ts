"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  DEFAULT_FLAGS,
  fetchFeatureFlags,
  type FeatureFlags,
  type FeatureName,
} from "@/lib/feature-flags";

/** Live feature-flag map, cached and shared across the app. */
export function useFeatureFlags(): FeatureFlags {
  const { data } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: fetchFeatureFlags,
    staleTime: 60_000,
    // placeholderData (not initialData) so we render with safe defaults but
    // still fetch the real flags immediately — otherwise a disabled flag like
    // `dashboard` wouldn't take effect until staleTime elapsed.
    placeholderData: keepPreviousData,
  });
  return data ?? DEFAULT_FLAGS;
}

/** True if a single feature is enabled. */
export function useFeature(name: FeatureName): boolean {
  return Boolean(useFeatureFlags()[name]);
}
