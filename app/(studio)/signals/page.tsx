"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SignalsPage() {
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
          Signals & alerts
        </h1>
        <p className="text-sm text-muted-foreground">
          Wellness pulses, competency insights, and notifications will surface
          here.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-6 text-muted-foreground">
        Intelligence feed scaffolding is underway.
      </div>
    </div>
  );
}
