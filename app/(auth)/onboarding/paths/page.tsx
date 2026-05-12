"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { telemetry } from "@/lib/telemetry";

function PathSelectionRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("legacy_route", "/onboarding/paths");
    params.set("migration_reason", "canonical_onboarding_entry");
    telemetry.track("legacy_onboarding_redirected", {
      from: "/onboarding/paths",
      to: "/onboarding/form",
      reason: "canonical_onboarding_entry",
    });
    router.replace(`/onboarding/form?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
    </div>
  );
}

export default function PathSelectionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <PathSelectionRedirect />
    </Suspense>
  );
}
