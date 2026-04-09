"use client";

import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/lib/api";

export type MirrorData = Awaited<ReturnType<typeof auditApi.getMirrorLatest>>;

export function useMirrorSnapshot() {
  return useQuery({
    queryKey: ["mirror-snapshot"],
    queryFn: () => auditApi.getMirrorLatest(),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "running" || status === "empty" ? 2500 : false;
    },
    staleTime: 30_000,
  });
}
