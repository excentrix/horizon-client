"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VeloProfileTab } from "@/components/mirror/velo-profile-tab";

export default function AnalysisPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-2 p-6">
      <Link
        href="/verify"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to case file
      </Link>
      <VeloProfileTab embedded={false} />
    </div>
  );
}
