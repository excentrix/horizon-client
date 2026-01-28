import { useQuery } from "@tanstack/react-query";
import { portfolioApi } from "@/lib/api";
import type { PortfolioArtifact } from "@/types";
import { telemetry } from "@/lib/telemetry";

const artifactsKey = ["portfolio-artifacts"];

export function usePortfolioArtifacts() {
  return useQuery<PortfolioArtifact[]>({
    queryKey: artifactsKey,
    queryFn: async () => {
      try {
        return await portfolioApi.listArtifacts();
      } catch (error) {
        telemetry.error("Failed to load portfolio artifacts", { error });
        throw error;
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        return false;
      }
      return failureCount < 1;
    },
  });
}
