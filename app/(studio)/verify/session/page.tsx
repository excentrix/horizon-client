"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { VerificationSession } from "@/components/velo/verification-session";

// /verify/session?snapshot=<id>&project=<index>&title=<t>&repo=<url>
// Query-keyed (not path-keyed) because the backend's create_or_get is
// addressed by snapshot + project index; the route stays deep-linkable and
// refresh-safe either way.

function SessionInner() {
  const params = useSearchParams();
  const snapshotId = params?.get("snapshot") ?? "";
  const projectIndex = Number(params?.get("project") ?? "-1");
  const projectTitle = params?.get("title") ?? "";
  const initialRepoUrl = params?.get("repo") ?? undefined;

  if (!snapshotId || projectIndex < 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center">
        <div>
          <p className="text-sm font-medium">This session link is incomplete.</p>
          <a href="/verify" className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
            Back to your case file →
          </a>
        </div>
      </div>
    );
  }

  return (
    <VerificationSession
      snapshotId={snapshotId}
      projectIndex={projectIndex}
      projectTitle={projectTitle}
      initialRepoUrl={initialRepoUrl}
    />
  );
}

export default function VerificationSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SessionInner />
    </Suspense>
  );
}
