"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LegacyAuditSessionRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get("step")) {
      params.set("step", "audit_session");
    }
    router.replace(`/onboarding?${params.toString()}`);
  }, [router, searchParams]);

  return <div className="p-6 text-sm text-muted-foreground">Redirecting to VELO audit session...</div>;
}

export default function LegacyAuditSessionRedirectPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <LegacyAuditSessionRedirectContent />
    </Suspense>
  );
}
