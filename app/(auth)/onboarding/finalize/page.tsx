"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Rocket, Mail, Lock, User, Globe } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export default function FinalizePage() {
  const router = useRouter();
  
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
      
      const response = await fetch(`${API_URL}/onboarding/complete/`, {
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

      // Success! Clear session key and redirect to generating page
      // localStorage.removeItem("onboarding_session_key"); // Keep for generating page

      // Redirect to generating page (or dashboard if plan already done)
      router.push(data.redirect_url || '/dashboard');
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
            <Rocket className="h-7 w-7 text-violet-600" />
          </div>
          <CardTitle className="text-2xl">Almost There!</CardTitle>
          <CardDescription>
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
                className="bg-gray-50 dark:bg-gray-900"
              />
              <p className="text-xs text-gray-500">Auto-detected. We use this to schedule your daily tasks.</p>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            
            {/* Submit */}
            <Button type="submit" className="w-full h-11 text-base bg-violet-600 hover:bg-violet-700" disabled={loading}>
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
          </form>
          
          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
