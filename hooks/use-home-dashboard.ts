import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import type { HomeDashboard } from "@/types";

const homeKey = ["dashboard", "home"] as const;

export function useHomeDashboard() {
  return useQuery<HomeDashboard>({
    queryKey: homeKey,
    queryFn: async () => {
      try {
        return await dashboardApi.getHome();
      } catch (error) {
        telemetry.error("Failed to load dashboard home", { error });
        throw error;
      }
    },
    staleTime: 60_000, // 1 minute - dashboard data changes moderately
    refetchOnWindowFocus: true, // Refresh when user returns
  });
}

// Export query key for invalidation
export { homeKey };
