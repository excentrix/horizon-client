"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { gamificationApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function HistoryTab() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, router, user]);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["gamification", "ledger", page],
    queryFn: () => gamificationApi.getLedger(page),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (error) {
      toast.error("We couldn't load your XP ledger.");
    }
  }, [error]);

  const entries = data?.entries ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">XP Ledger</h1>
          <p className="text-sm text-muted-foreground">Every point you&apos;ve earned, in order.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1 || isFetching}
          >
            Previous
          </Button>
          <Button
            onClick={() => setPage((prev) => prev + 1)}
            disabled={!data?.has_more || isFetching}
          >
            Next
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-6" />
              ))}
            </div>
          ) : entries.length ? (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id ?? entry.created_at}
                  className="flex items-center justify-between rounded-lg border px-4 py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{entry.reason}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    {entry.points >= 0 ? "+" : ""}{entry.points}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No XP entries yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
