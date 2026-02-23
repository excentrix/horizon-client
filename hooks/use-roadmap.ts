import { useQuery } from "@tanstack/react-query";
import { roadmapApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import type { RoadmapResponse } from "@/types";

const roadmapKey = ["roadmap", "current"] as const;

export function useRoadmap() {
  return useQuery<RoadmapResponse>({
    queryKey: roadmapKey,
    queryFn: async () => {
      try {
        return await roadmapApi.getRoadmap();
      } catch (error) {
        telemetry.error("Failed to load roadmap", { error });
        throw error;
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

export { roadmapKey };
