"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { telemetry } from "@/lib/telemetry";

function OnboardingStartRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("legacy_route", "/onboarding/start");
    params.set("migration_reason", "canonical_onboarding_entry");
    telemetry.track("legacy_onboarding_redirected", {
      from: "/onboarding/start",
      to: "/onboarding",
      reason: "canonical_onboarding_entry",
    });
    router.replace(`/onboarding${params.toString() ? `?${params.toString()}` : ""}`);
  }, [router, searchParams]);

  return <div className="p-6 text-sm text-muted-foreground">Redirecting to onboarding...</div>;
}

export default function OnboardingStartRedirectPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <OnboardingStartRedirect />
    </Suspense>
  );
}

