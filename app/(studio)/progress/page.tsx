"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProgressPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Progress mural
        </h1>
        <p className="text-sm text-muted-foreground">
          Visualize your streaks, milestones, and mood across the mentorship
          journey.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-6 text-muted-foreground">
        Progress mural components are under construction.
      </div>
    </div>
  );
}
