"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { telemetry } from "@/lib/telemetry";

function LegacyAuditRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("legacy_route", "/audit");
    params.set("migration_reason", "unified_onboarding_flow");
    telemetry.track("legacy_onboarding_redirected", {
      from: "/audit",
      to: "/onboarding",
      reason: "unified_onboarding_flow",
    });
    router.replace(`/onboarding${params.toString() ? `?${params.toString()}` : ""}`);
  }, [router, searchParams]);

  return <div className="p-6 text-sm text-muted-foreground">Redirecting to onboarding...</div>;
}

export default function LegacyAuditRedirectPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <LegacyAuditRedirect />
    </Suspense>
  );
}
