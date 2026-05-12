"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Rocket, Mail, Lock, User, Globe } from "lucide-react";
import { authApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getApiUrl() {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured");
  }
  return API_URL;
}

export default function FinalizePage() {
  const router = useRouter();
  const { loginWithGoogle, isLoading: isAuthLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validation
    if (!formData.email || !formData.password) {
      setError("Email and password are required");
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    setLoading(true);
    
    try {
      const sessionKey = localStorage.getItem("onboarding_session_key");
      if (!sessionKey) {
        router.push("/onboarding");
        return;
      }
      
      const response = await fetch(`${getApiUrl()}/onboarding/complete/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_key: sessionKey,
          account_data: {
            email: formData.email,
            password: formData.password,
            display_name: formData.displayName || formData.email.split("@")[0],
            timezone: formData.timezone
          }
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to complete onboarding");
      }

      // Identify user in PostHog after account creation
      if (data.user?.id || formData.email) {
        posthog.identify(data.user?.id ?? formData.email, {
          email: formData.email,
          name: formData.displayName || formData.email.split("@")[0],
          timezone: formData.timezone,
        });
      }

      // Capture onboarding completed event
      posthog.capture('onboarding_completed', {
        email: formData.email,
        timezone: formData.timezone,
        has_display_name: Boolean(formData.displayName),
      });

      // Log in immediately so mentor lounge can load personalities and conversations
      try {
        const loginResponse = await authApi.login({
          email: formData.email,
          password: formData.password,
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

        const cookieOptions = {
          sameSite: "lax" as const,
          secure: process.env.NODE_ENV === "production",
          expires: 14,
        };
        if (access) Cookies.set("accessToken", access, cookieOptions);
        if (refresh) Cookies.set("refreshToken", refresh, cookieOptions);
      } catch (loginError) {
        console.warn("Auto-login after onboarding failed", loginError);
      }

      // Redirect to mentor intake (or dashboard if plan already done)
      router.push(data.redirect_url || "/dashboard");
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f4ff] dark:bg-[#0b0b0f] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-2 border-black bg-white shadow-[10px_10px_0_0_#000]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-black bg-[#fcd34d]">
            <Rocket className="h-7 w-7 text-black" />
          </div>
          <CardTitle className="text-2xl font-extrabold">Almost There!</CardTitle>
          <CardDescription className="text-gray-700">
            Create your account to save your personalized learning plan and start your journey.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                Display Name
              </Label>
              <Input
                id="displayName"
                placeholder="What should we call you?"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="border-2 border-black shadow-[3px_3px_0_0_#000]"
              />
            </div>
            
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="border-2 border-black shadow-[3px_3px_0_0_#000]"
              />
            </div>
            
            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-500" />
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                required
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="border-2 border-black shadow-[3px_3px_0_0_#000]"
              />
            </div>
            
            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="border-2 border-black shadow-[3px_3px_0_0_#000]"
              />
            </div>
            
            {/* Timezone (auto-detected) */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                Timezone
              </Label>
              <Input
                id="timezone"
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                className="border-2 border-black shadow-[3px_3px_0_0_#000]"
              />
              <p className="text-xs text-gray-500">Auto-detected. We use this to schedule your daily tasks.</p>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="rounded-md border-2 border-black bg-red-100 p-3 text-sm font-semibold text-red-700 shadow-[3px_3px_0_0_#000]">
                {error}
              </div>
            )}
            
            {/* Submit */}
            <Button type="submit" className="w-full h-11 text-base bg-black text-white shadow-[4px_4px_0_0_#000] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Start My Learning Journey
                </>
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              className="w-full border-2 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition"
              onClick={() => loginWithGoogle()}
              disabled={loading || isAuthLoading}
            >
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Sign up with Google
            </Button>
          </form>
          
          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
