"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PathSelectionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding/form");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
    </div>
  );
}
