"use client";

import { useQuery } from "@tanstack/react-query";
import { pathfinderApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

/** Whether the current user's school has Pathfinder enabled. Only queries when logged in — on a
 * public/logged-out page this stays disabled rather than firing an unauthenticated request. */
export function usePathfinderEntitlementQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pathfinder-entitlement", user?.id],
    queryFn: () => pathfinderApi.getEntitlement(),
    enabled: Boolean(user),
    staleTime: 60_000,
    retry: false,
  });
}
