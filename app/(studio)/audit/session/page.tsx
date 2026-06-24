"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { telemetry } from "@/lib/telemetry";

function LegacyAuditSessionRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    telemetry.track("legacy_audit_session_redirected", {
      from: "/audit/session",
      to: "/verify",
      reason: "velo_verify_hub",
    });
    router.replace("/verify");
  }, [router, searchParams]);

  return <div className="p-6 text-sm text-muted-foreground">Redirecting to VELO verification…</div>;
}

export default function LegacyAuditSessionRedirectPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <LegacyAuditSessionRedirect />
    </Suspense>
  );
}
