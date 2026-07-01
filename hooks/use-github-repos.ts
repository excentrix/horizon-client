"use client";

import { useState, useCallback } from "react";
import { authApi } from "@/lib/api";
import { trackFunnel, FUNNEL } from "@/lib/funnel";

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
    // Step 1: open the popup SYNCHRONOUSLY, inside the click gesture. Opening it
    // after an `await` trips browser popup blockers (empty window opens + closes).
    const popup = window.open("about:blank", "github_oauth", "width=620,height=720,scrollbars=yes");
    if (!popup) {
      setState((s) => ({ ...s, error: "Popup blocked — allow popups for this site and retry." }));
      return { success: false };
    }

    // Step 2: fetch the OAuth URL, then point the already-open popup at it.
    let authUrl: string;
    try {
      const data = await authApi.getGithubOAuthUrl();
      authUrl = data.auth_url;
    } catch (e: unknown) {
      popup.close();
      const msg = e instanceof Error ? e.message : "Failed to get OAuth URL";
      setState((s) => ({ ...s, error: msg }));
      return { success: false };
    }
    popup.location.href = authUrl;

    return new Promise<{ success: boolean; username?: string }>((resolve) => {
      let settled = false;
      const finish = (result: { success: boolean; username?: string }) => {
        if (settled) return;
        settled = true;
        window.removeEventListener("message", handler);
        clearInterval(pollClosed);
        if (result.success) trackFunnel(FUNNEL.GITHUB_CONNECTED);
        resolve(result);
      };

      const handler = (event: MessageEvent) => {
        if (event.data?.type !== "github_oauth") return;
        popup?.close();
        if (event.data.success) {
          fetchRepos().then(() => finish({ success: true, username: event.data.username }));
        } else {
          setState((s) => ({ ...s, error: event.data.error ?? "OAuth failed" }));
          finish({ success: false });
        }
      };

      window.addEventListener("message", handler);

      // When the popup closes, trust the BACKEND, not the timing. GitHub often
      // closes the popup instantly (already-authorized → no consent screen), so a
      // "closed" popup may actually be a successful connect. Re-check the server.
      const pollClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollClosed);
          setTimeout(async () => {
            try {
              const data = await authApi.getGithubRepos();
              if (data.connected) {
                setState({
                  connected: true,
                  username: data.username ?? "",
                  repos: data.repos ?? [],
                  isLoading: false,
                  error: data.error ?? null,
                });
                finish({ success: true, username: data.username });
                return;
              }
            } catch {
              // fall through to cancelled
            }
            finish({ success: false });
          }, 600);
        }
      }, 500);
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
