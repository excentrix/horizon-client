/**
 * Feature flags — read from the backend single source of truth.
 *
 * The backend (`/api/config/features/`) owns the truth. This module fetches it
 * and falls back to DEFAULTS if the backend is unreachable, so the UI never
 * crashes on a flag lookup. Toggle features in the backend, not here.
 */

export type FeatureName =
  | "velo"
  | "chat"
  | "intelligence"
  | "portfolio"
  | "institutions"
  | "dashboard"
  | "onboarding"
  | "plans"
  | "roadmap"
  | "progress"
  | "simulations"
  | "gamification"
  | "knowledge_graph"
  | "semantic_memory";

export type FeatureFlags = Record<FeatureName, boolean>;

// Safe fallback if the backend is unreachable. Mirrors backend DEFAULTS.
export const DEFAULT_FLAGS: FeatureFlags = {
  velo: true,
  chat: true,
  intelligence: true,
  portfolio: true,
  institutions: true,
  dashboard: true,
  onboarding: true,
  plans: false,
  roadmap: false,
  progress: false,
  simulations: false,
  gamification: false,
  knowledge_graph: false,
  semantic_memory: false,
};

function flagsEndpoint(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
  return `${base.replace(/\/$/, "")}/config/features/`;
}

/** Fetch the live flag map from the backend. Falls back to DEFAULT_FLAGS. */
export async function fetchFeatureFlags(): Promise<FeatureFlags> {
  try {
    const res = await fetch(flagsEndpoint(), {
      // Short revalidation so a backend toggle propagates within a minute.
      next: { revalidate: 60 },
    });
    if (!res.ok) return DEFAULT_FLAGS;
    const data = (await res.json()) as { features?: Partial<FeatureFlags> };
    return { ...DEFAULT_FLAGS, ...(data.features ?? {}) };
  } catch {
    return DEFAULT_FLAGS;
  }
}

export function isEnabled(flags: FeatureFlags, name: FeatureName): boolean {
  return Boolean(flags[name]);
}
