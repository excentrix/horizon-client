import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { portfolioApi } from "@/lib/api";
import type { PortfolioArtifact } from "@/types";
import { telemetry } from "@/lib/telemetry";

const artifactsKey = ["portfolio-artifacts"];
const profileKey = ["portfolio-profile"];
const timelineKey = ["growth-timeline"];

export function usePortfolioArtifacts() {
  return useQuery<PortfolioArtifact[]>({
    queryKey: artifactsKey,
    queryFn: async () => {
      try {
        return await portfolioApi.listArtifacts();
      } catch (error) {
        telemetry.error("Failed to load portfolio artifacts", { error });
        telemetry.toastError("Couldn't load your artifacts right now.");
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

export function usePortfolioProfile() {
  return useQuery({
    queryKey: profileKey,
    queryFn: async () => {
      try {
        const response = await fetch("/api/portfolio/profiles/my_profile/", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch profile");
        return await response.json();
      } catch (error) {
        telemetry.error("Failed to load portfolio profile", { error });
        throw error;
      }
    },
    staleTime: 300_000, // 5 minutes
  });
}

export function useGrowthTimeline(days: number = 90) {
  return useQuery({
    queryKey: [...timelineKey, days],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/portfolio/timeline/chart_data/?days=${days}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch timeline");
        return await response.json();
      } catch (error) {
        telemetry.error("Failed to load growth timeline", { error });
        throw error;
      }
    },
    staleTime: 120_000, // 2 minutes
  });
}

export function useVerifyArtifact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (artifactId: string) => {
      const response = await fetch(`/api/portfolio/artifacts/${artifactId}/verify/`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Verification failed");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsKey });
      queryClient.invalidateQueries({ queryKey: timelineKey });
      telemetry.toastSuccess("Artifact verification started!");
    },
    onError: (error) => {
      telemetry.error("Failed to verify artifact", { error });
      telemetry.toastError("Verification failed. Please try again.");
    },
  });
}

export function useAddReflection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ artifactId, reflection }: { artifactId: string; reflection: string }) => {
      const response = await fetch(`/api/portfolio/artifacts/${artifactId}/add_reflection/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reflection }),
      });
      if (!response.ok) throw new Error("Failed to save reflection");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsKey });
      telemetry.toastSuccess("Reflection saved!");
    },
    onError: (error) => {
      telemetry.error("Failed to save reflection", { error });
      telemetry.toastError("Couldn't save reflection. Please try again.");
    },
  });
}

export function useSetVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ artifactId, visibility }: { artifactId: string; visibility: string }) => {
      const response = await fetch(`/api/portfolio/artifacts/${artifactId}/set_visibility/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ visibility }),
      });
      if (!response.ok) throw new Error("Failed to update visibility");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactsKey });
      telemetry.toastSuccess("Visibility updated!");
    },
    onError: (error) => {
      telemetry.error("Failed to update visibility", { error });
      telemetry.toastError("Couldn't update visibility.");
    },
  });
}

export function usePublicPortfolio(username: string) {
  return useQuery({
    queryKey: ["public-portfolio", username],
    queryFn: async () => {
      const response = await fetch(`/api/portfolio/public/${username}/`);
      if (!response.ok) {
        if (response.status === 404) throw new Error("Portfolio not found");
        if (response.status === 403) throw new Error("Portfolio is private");
        throw new Error("Failed to load portfolio");
      }
      return await response.json();
    },
    enabled: !!username,
    staleTime: 60_000,
  });
}

