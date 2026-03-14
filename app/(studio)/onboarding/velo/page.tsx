"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VeloOnboardingRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(`/onboarding${q ? `?${q}` : ""}`);
  }, [router, searchParams]);

  return <div className="p-6 text-sm text-muted-foreground">Redirecting to onboarding...</div>;
}
