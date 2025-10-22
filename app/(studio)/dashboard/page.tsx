"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
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
          Welcome back{user?.first_name ? `, ${user.first_name}` : ""} 👋
        </h1>
        <p className="text-muted-foreground">
          Your mentorship studio at a glance — plans, progress, and signals.
        </p>
      </div>
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Studio dashboard widgets coming soon.
      </div>
    </div>
  );
}
