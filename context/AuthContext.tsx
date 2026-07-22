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
import { telemetry } from "@/lib/telemetry";
import { captureAcquisitionSource, trackFunnel, FUNNEL } from "@/lib/funnel";
import { authApi } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";
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
  loginWithGoogle: () => Promise<void>;
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

// Routes viewable without a session — auth pages, OAuth callback, and the
// public shareable surfaces (VELO credentials, public portfolios). A logged-out
// recruiter opening a credential must NOT be bounced to /login.
const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
  "/audit/public",
  "/p/",
];
const isPublicPath = (p: string | null | undefined) =>
  !!p && PUBLIC_PREFIXES.some((prefix) => p.startsWith(prefix));

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
        if (!isPublicPath(pathname)) {
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
    // First-touch acquisition source (UTM / ref / referrer), captured once.
    captureAcquisitionSource();
    const accessToken = Cookies.get("accessToken");
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    fetchProfile().catch(() => {
      // handled in fetchProfile
    });
  }, [fetchProfile]);

  const syncSupabaseSession = useCallback(
    async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      if (!session) return;

      const currentAccess = Cookies.get("accessToken");
      const isGcalCallback =
        typeof window !== "undefined" && window.location.search.includes("gcal=connected");

      if (currentAccess && !isGcalCallback) return;

      let activeSession = session;
      if (!activeSession.access_token) {
        const {
          data: { session: refreshedSession },
        } = await supabase.auth.getSession();
        if (!refreshedSession?.access_token) {
          toast.error("Authentication Error", {
            description: "Could not retrieve a valid secure session.",
          });
          await supabase.auth.signOut();
          return;
        }
        activeSession = refreshedSession;
      }

      setIsLoading(true);

      try {
        const response = await authApi.loginWithGoogle({
          access_token: activeSession.access_token,
          refresh_token: activeSession.refresh_token,
          provider_token: activeSession.provider_token ?? undefined,
          provider_refresh_token: activeSession.provider_refresh_token ?? undefined,
          device_info: {
            device_type: "web",
            browser: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          },
        });

        const access = response.session.access_token ?? response.session.access ?? undefined;
        const refresh = response.session.refresh_token ?? response.session.refresh ?? undefined;

        setSessionTokens(access, refresh, true);
        setUser(response.user);

        telemetry.identify(response.user.id ?? response.user.email, {
          email: response.user.email,
          name: response.user.full_name,
          username: response.user.username,
        });

        telemetry.track("user_signed_in", {
          login_method: "google",
        });

        toast.success("Welcome back!", {
          description: response.user.full_name ?? response.user.email,
        });

        if (isGcalCallback) {
          toast.success("Google Calendar connected!", {
            description: "Your learning plan tasks will now sync automatically.",
          });
          router.push("/plans");
          return;
        }

        if (response.user.user_type === "student" && !response.user.onboarding_completed) {
          router.push("/onboarding");
        } else if (response.user.is_superuser) {
          router.push("/hq");
        } else if (
          response.user.user_type === "admin" ||
          response.user.user_type === "educator"
        ) {
          router.push("/institution/overview");
        } else {
          router.push("/dashboard");
        }
      } catch {
        toast.error("Login failed", {
          description: "Could not synchronize session.",
        });
        await supabase.auth.signOut();
        clearSessionTokens();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  // Listen for Supabase auth changes (handling Google Login redirect)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await syncSupabaseSession(session);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session && pathname?.startsWith("/auth/callback")) {
        await syncSupabaseSession(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, syncSupabaseSession]);

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
        telemetry.identify(response.user.id ?? response.user.email, {
          email: response.user.email,
          name: response.user.full_name,
          username: response.user.username,
        });

        // Capture login event
        telemetry.track('user_signed_in', {
          email: response.user.email,
          remember_me: Boolean(payload.remember_me),
        });

        toast.success("Welcome back!", {
          description: response.user.full_name ?? response.user.email,
        });
        const userType = response.user.user_type;
        if (
          response.user.user_type === "student" &&
          !response.user.onboarding_completed
        ) {
          router.push("/onboarding");
        } else if (response.user.is_superuser) {
          router.push("/hq");
        } else if (userType === "admin" || userType === "educator") {
          router.push("/institution/overview");
        } else {
          router.push("/dashboard");
        }
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

  const handleLoginWithGoogle = useCallback(async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                // Login needs identity only (email/profile, requested by default).
                // Do NOT request the sensitive Calendar scope here — that triggers
                // Google's "unverified app" warning and a scary permissions prompt.
                // Calendar access is requested separately, only when a user opts
                // into calendar sync (see plan-schedule-view.tsx).
            }
        });
        if (error) throw error;
    } catch (error) {
        toast.error("Google login failed", {
            description: error instanceof Error ? error.message : "Please try again."
        });
        throw error;
    }
  }, []);

  const handleRegister = useCallback(
    async (payload: RegisterPayload) => {
      setIsLoading(true);
      try {
        await authApi.register(payload);
        const loginResponse = await authApi.login({
          email: payload.email,
          password: payload.password,
          remember_me: true,
        });
        const access =
          loginResponse.session.access_token ??
          loginResponse.session.access ??
          undefined;
        const refresh =
          loginResponse.session.refresh_token ??
          loginResponse.session.refresh ??
          undefined;
        setSessionTokens(access, refresh, true);
        setUser(loginResponse.user);
        // Capture signup event
        telemetry.track('user_signed_up', {
          email: payload.email,
          username: payload.username,
        });
        trackFunnel(FUNNEL.SIGNED_UP, { method: "password" });

        toast.success("Account created.");
        if (
          loginResponse.user.user_type === "student" &&
          !loginResponse.user.onboarding_completed
        ) {
          router.push("/onboarding");
        } else if (
          loginResponse.user.user_type === "admin" ||
          loginResponse.user.user_type === "educator"
        ) {
          router.push("/institution/overview");
        } else {
          router.push("/dashboard");
        }
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

  useEffect(() => {
    if (!user || !pathname) return;
    if (user.user_type !== "student" || user.onboarding_completed) return;
    const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
    const isOnboardingPage = pathname.startsWith("/onboarding");
    const isMentorChat = pathname.startsWith("/chat");
    if (!isAuthPage && !isOnboardingPage && !isMentorChat && !isPublicPath(pathname)) {
      router.replace("/onboarding");
    }
  }, [pathname, router, user]);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Non-blocking; still clear local session
      telemetry.warn("Logout request failed", { error });
    } finally {
      // Capture logout event and reset PostHog
      telemetry.track('user_logged_out');
      telemetry.reset();
      
      try {
          await supabase.auth.signOut();
      } catch {
          // ignore
      }

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
      loginWithGoogle: handleLoginWithGoogle,
    }),
    [user, isLoading, handleLogin, handleRegister, handleLogout, refreshProfile, handleLoginWithGoogle],
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
