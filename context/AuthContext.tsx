'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { toast } from "sonner";
import posthog from "posthog-js";
import { telemetry } from "@/lib/telemetry";
import { authApi } from "@/lib/api";
import type {
  LoginPayload,
  RegisterPayload,
  UserSummary,
} from "@/types";

interface AuthContextValue {
  user: UserSummary | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function setSessionTokens(
  access?: string,
  refresh?: string,
  remember = false
) {
  const cookieOptions = {
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { expires: 14 } : {}),
  };

  if (access) {
    Cookies.set("accessToken", access, cookieOptions);
  }
  if (refresh) {
    Cookies.set("refreshToken", refresh, cookieOptions);
  }
}

function clearSessionTokens() {
  Cookies.remove("accessToken");
  Cookies.remove("refreshToken");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await authApi.me();
      setUser(profile);
    } catch (error) {
      const status =
        (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        clearSessionTokens();
        setUser(null);
        if (pathname && !pathname.startsWith("/login")) {
          router.replace("/login");
        }
      } else {
        telemetry.warn("Profile fetch failed; keeping session", { error });
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    const accessToken = Cookies.get("accessToken");
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    fetchProfile().catch(() => {
      // handled in fetchProfile
    });
  }, [fetchProfile]);

  const handleLogin = useCallback(
    async (payload: LoginPayload) => {
      setIsLoading(true);
      try {
        const response = await authApi.login(payload);
        const access =
          response.session.access_token ?? response.session.access ?? undefined;
        const refresh =
          response.session.refresh_token ?? response.session.refresh ?? undefined;
        setSessionTokens(access, refresh, Boolean(payload.remember_me));
        setUser(response.user);

        // Identify user in PostHog
        posthog.identify(response.user.id ?? response.user.email, {
          email: response.user.email,
          name: response.user.full_name,
          username: response.user.username,
        });

        // Capture login event
        posthog.capture('user_signed_in', {
          email: response.user.email,
          remember_me: Boolean(payload.remember_me),
        });

        toast.success("Welcome back!", {
          description: response.user.full_name ?? response.user.email,
        });
        router.push("/dashboard");
      } catch (error) {
        toast.error("Unable to sign in", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
        clearSessionTokens();
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const handleRegister = useCallback(
    async (payload: RegisterPayload) => {
      setIsLoading(true);
      try {
        await authApi.register(payload);

        // Capture signup event
        posthog.capture('user_signed_up', {
          email: payload.email,
          username: payload.username,
        });

        toast.success("Account created! Sign in to continue.");
        router.push("/login");
      } catch (error) {
        toast.error("Registration failed", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Non-blocking; still clear local session
      telemetry.warn("Logout request failed", { error });
    } finally {
      // Capture logout event and reset PostHog
      posthog.capture('user_logged_out');
      posthog.reset();

      clearSessionTokens();
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    await fetchProfile();
  }, [fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      refreshProfile,
    }),
    [user, isLoading, handleLogin, handleRegister, handleLogout, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
