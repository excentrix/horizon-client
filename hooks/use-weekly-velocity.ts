import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http-client";

export interface WeeklyVelocityPoint {
  week: string;         // "Feb 03"
  completed: number;
  scheduled: number;
  completion_rate: number; // 0-100
}

export function useWeeklyVelocity(weeks = 8) {
  return useQuery<WeeklyVelocityPoint[]>({
    queryKey: ["weekly-velocity", weeks],
    queryFn: async () => {
      const res = await http.get<WeeklyVelocityPoint[]>(`/api/plans/weekly_velocity/?weeks=${weeks}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
