/**
 * VELO acquisition funnel — one canonical place for every funnel event so the
 * names never drift, plus first-touch source attribution.
 *
 * Funnel (top → bottom), measured in PostHog:
 *   signed_up → resume_uploaded | github_connected → analysis_ready
 *     → verification_started → verification_completed → credential_shared
 *     → credential_viewed (the recruiter/peer who opens the share link)
 *
 * `trackFunnel` attaches the stored acquisition source to every event, so you
 * can break the whole funnel down by where a user came from (post, club, email).
 */
import { telemetry } from "@/lib/telemetry";

export const FUNNEL = {
  SIGNED_UP: "velo_signed_up",
  RESUME_UPLOADED: "velo_resume_uploaded",
  GITHUB_CONNECTED: "velo_github_connected",
  ANALYSIS_READY: "velo_analysis_ready",
  VERIFICATION_STARTED: "velo_verification_started",
  VERIFICATION_COMPLETED: "velo_verification_completed",
  CREDENTIAL_SHARED: "velo_credential_shared",
  CREDENTIAL_VIEWED: "velo_credential_viewed",
} as const;

export type AcquisitionSource = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  ref?: string; // custom ?ref= — e.g. a college-club code or a specific post
  referrer?: string;
  landing_path?: string;
  captured_at?: string;
};

const SOURCE_KEY = "velo_acquisition_source";

/** Capture the acquisition source ONCE (first touch wins). Call on app entry. */
export function captureAcquisitionSource(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(SOURCE_KEY)) return; // first-touch is sticky
    const p = new URLSearchParams(window.location.search);
    const referrer = document.referrer || "";
    const external = referrer && !referrer.includes(window.location.host);
    const src: AcquisitionSource = {
      utm_source: p.get("utm_source") || undefined,
      utm_medium: p.get("utm_medium") || undefined,
      utm_campaign: p.get("utm_campaign") || undefined,
      ref: p.get("ref") || undefined,
      referrer: external ? referrer : undefined,
      landing_path: window.location.pathname,
      captured_at: new Date().toISOString(),
    };
    if (!src.utm_source && !src.ref && !src.referrer) {
      src.utm_source = "direct";
    }
    localStorage.setItem(SOURCE_KEY, JSON.stringify(src));
  } catch {
    /* localStorage unavailable — skip silently */
  }
}

export function getAcquisitionSource(): AcquisitionSource {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SOURCE_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Fire a funnel event with the acquisition source attached. */
export function trackFunnel(
  event: (typeof FUNNEL)[keyof typeof FUNNEL],
  props?: Record<string, unknown>,
): void {
  telemetry.track(event, { ...getAcquisitionSource(), ...props });
}
