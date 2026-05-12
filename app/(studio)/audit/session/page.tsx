"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { telemetry } from "@/lib/telemetry";

function LegacyAuditSessionRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("legacy_route", "/audit/session");
    params.set("migration_reason", "unified_onboarding_flow");
    if (!params.get("step")) {
      params.set("step", "audit_session");
    }
    telemetry.track("legacy_onboarding_redirected", {
      from: "/audit/session",
      to: "/onboarding",
      reason: "unified_onboarding_flow",
      step: params.get("step"),
    });
    router.replace(`/onboarding?${params.toString()}`);
  }, [router, searchParams]);

  return <div className="p-6 text-sm text-muted-foreground">Redirecting to VELO audit session...</div>;
}

export default function LegacyAuditSessionRedirectPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <LegacyAuditSessionRedirect />
    </Suspense>
  );
}
