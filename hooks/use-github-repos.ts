"use client";

import { useState, useCallback } from "react";
import { authApi } from "@/lib/api";

export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  pushed_at: string;
  private: boolean;
  fork: boolean;
  topics: string[];
};

export type GithubConnectionState = {
  connected: boolean;
  username: string;
  repos: GithubRepo[];
  isLoading: boolean;
  error: string | null;
};

const INITIAL: GithubConnectionState = {
  connected: false,
  username: "",
  repos: [],
  isLoading: false,
  error: null,
};

export function useGithubRepos() {
  const [state, setState] = useState<GithubConnectionState>(INITIAL);

  const fetchRepos = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const data = await authApi.getGithubRepos();
      setState({
        connected: data.connected,
        username: data.username ?? "",
        repos: data.repos ?? [],
        isLoading: false,
        error: data.error ?? null,
      });
    } catch (e: unknown) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: e instanceof Error ? e.message : "Failed to load repos",
      }));
    }
  }, []);

  const connectGithub = useCallback(async (): Promise<{ success: boolean; username?: string }> => {
    // Step 1: get the GitHub OAuth URL from the backend (authenticated API call)
    let authUrl: string;
    try {
      const data = await authApi.getGithubOAuthUrl();
      authUrl = data.auth_url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to get OAuth URL";
      setState((s) => ({ ...s, error: msg }));
      return { success: false };
    }

    // Step 2: open GitHub in a popup
    const popup = window.open(authUrl, "github_oauth", "width=620,height=720,scrollbars=yes");

    return new Promise<{ success: boolean; username?: string }>((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data?.type !== "github_oauth") return;
        window.removeEventListener("message", handler);
        clearInterval(pollClosed);
        popup?.close();

        if (event.data.success) {
          fetchRepos().then(() =>
            resolve({ success: true, username: event.data.username })
          );
        } else {
          setState((s) => ({ ...s, error: event.data.error ?? "OAuth failed" }));
          resolve({ success: false });
        }
      };

      window.addEventListener("message", handler);

      // If user closes popup manually
      const pollClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollClosed);
          window.removeEventListener("message", handler);
          resolve({ success: false });
        }
      }, 800);
    });
  }, [fetchRepos]);

  const disconnect = useCallback(async () => {
    try {
      await authApi.disconnectGithub();
      setState(INITIAL);
    } catch {
      // ignore
    }
  }, []);

  return { ...state, fetchRepos, connectGithub, disconnect };
}
