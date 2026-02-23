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
  
  // Listen for Supabase auth changes (handling Google Login redirect)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger: console.log("Supabase Auth Event:", event);
      if (event === 'SIGNED_IN' && session) {
        // We are signed in with Supabase, now sync with Backend
        // Check if we already have a backend session (to avoid double login loops if possible, though strict sync is better)
        const currentAccess = Cookies.get("accessToken");
        if (currentAccess) return; // Already logged in to backend?
        
        // Defensive check: Ensure we have an access token
        const token = session.access_token;
        if (!token) {
            console.warn("No access token in Supabase session, attempting refresh...");
            const { data: { session: refreshedSession } } = await supabase.auth.getSession();
            if (!refreshedSession?.access_token) {
                console.error("Failed to retrieve valid session with access token.");
                toast.error("Authentication Error", { description: "Could not retrieve secure session." });
                await supabase.auth.signOut();
                return;
            }
            // Use refreshed session
            session = refreshedSession;
        }

        try {
          // Sync with backend
          // We need to pass the Supabase tokens to the backend
          const payload = {
             access_token: session.access_token,
             refresh_token: session.refresh_token,
             device_info: {
                 device_type: "web",
                 browser: navigator.userAgent,
             }
          };
          
          console.log("Syncing with backend, payload:", { 
              ...payload, 
              access_token: payload.access_token?.substring(0, 10) + '...',
              refresh_token: payload.refresh_token?.substring(0, 10) + '...'
          });

          const response = await authApi.loginWithGoogle(payload);
          
          console.log("Backend sync response:", response);

          const access = response.session.access_token ?? response.session.access ?? undefined;
          const refresh = response.session.refresh_token ?? response.session.refresh ?? undefined;
          
          setSessionTokens(access, refresh, true); // persistent by default for social login
          setUser(response.user);
          
          telemetry.identify(response.user.id ?? response.user.email, {
             email: response.user.email,
             name: response.user.full_name,
             username: response.user.username,
          });
          
          telemetry.track('user_signed_in', {
             login_method: 'google',
          });
          
          toast.success("Welcome back!", {
            description: response.user.full_name ?? response.user.email,
          });
          
          router.push("/dashboard");
          
        } catch (error) {
           console.error("Backend sync failed", error);
           toast.error("Login failed", { description: "Could not synchronize session." });
           // If backend sync fails, we might want to sign out of Supabase too to keep states clean
           await supabase.auth.signOut();
        }
      } else if (event === 'SIGNED_OUT') {
         // Optionally handle remote sign out
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

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

  const handleLoginWithGoogle = useCallback(async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline', // ensures we get a refresh token
                    prompt: 'consent',
                }
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

        // Capture signup event
        telemetry.track('user_signed_up', {
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
