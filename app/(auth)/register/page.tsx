"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_AUTH_REFRESH_ENDPOINT?.replace(
  "/token/refresh/",
  ""
) ?? "http://localhost:8000/api";

const registerSchema = z
  .object({
    email: z.string().email(),
    username: z.string().min(3).max(30),
    password: z.string().min(8),
    password_confirm: z.string().min(8),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    terms_accepted: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms.",
    }),
    privacy_policy_accepted: z.boolean().refine((val) => val === true, {
      message: "You must accept the privacy policy.",
    }),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Inner component so useSearchParams is inside Suspense ─────────────────────
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, register, loginWithGoogle, isLoading } = useAuth();

  // Waitlist invite state
  const inviteToken = searchParams.get("invite") ?? "";
  const inviteEmail = searchParams.get("email") ?? "";
  const fromWaitlist = searchParams.get("from") === "waitlist" || !!inviteToken;

  const [inviteData, setInviteData] = useState<{
    valid: boolean;
    tokens?: number;
    name?: string;
    college?: string;
    checked: boolean;
  }>({ valid: false, checked: false });
  const [showEmailSignup, setShowEmailSignup] = useState(false);
  const [signupEmail, setSignupEmail] = useState(inviteEmail || "");
  const [formError, setFormError] = useState("");

  // Verify the invite token with the backend
  useEffect(() => {
    if (!inviteToken || !inviteEmail) {
      setInviteData((d) => ({ ...d, checked: true }));
      return;
    }
    fetch(
      `${API_URL}/auth/verify-invite/?invite=${encodeURIComponent(inviteToken)}&email=${encodeURIComponent(inviteEmail)}`
    )
      .then((r) => r.json())
      .then((data) => setInviteData({ ...data, checked: true }))
      .catch(() => setInviteData({ valid: false, checked: true }));
  }, [inviteToken, inviteEmail]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: inviteEmail || "",
      username: "",
      password: "",
      password_confirm: "",
      first_name: "",
      last_name: "",
      terms_accepted: false,
      privacy_policy_accepted: false,
    },
  });

  // Pre-fill email once invite is verified
  useEffect(() => {
    if (inviteEmail && inviteData.valid) {
      form.setValue("email", inviteEmail);
    }
  }, [inviteEmail, inviteData.valid, form]);

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [router, user]);

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError("");
    try {
      await register({
        ...values,
        ...(inviteToken ? { invite_token: inviteToken } : {}),
      });
    } catch (error) {
      const payload = (error as { response?: { data?: Record<string, unknown> } })?.response?.data || {};
      const fieldMap: Record<string, keyof RegisterFormValues> = {
        email: "email",
        username: "username",
        password: "password",
        password_confirm: "password_confirm",
      };
      let mappedFieldError = false;

      Object.entries(fieldMap).forEach(([apiField, formField]) => {
        const value = payload[apiField];
        if (!value) return;
        const message = Array.isArray(value) ? String(value[0]) : String(value);
        form.setError(formField, { type: "server", message });
        mappedFieldError = true;
      });

      const nonField =
        (Array.isArray(payload.non_field_errors) && payload.non_field_errors[0]) ||
        (Array.isArray(payload.detail) && payload.detail[0]) ||
        payload.detail ||
        payload.error;
      if (nonField) {
        setFormError(String(nonField));
      } else if (!mappedFieldError) {
        setFormError("Signup failed. Please check your details and try again.");
      }
    }
  };

  const isInviteValid = inviteData.checked && inviteData.valid;
  const isInviteInvalid = inviteToken && inviteData.checked && !inviteData.valid;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-2xl border bg-card/80 p-8 shadow-xl backdrop-blur">

      {/* ── Waitlist invite banner ────────────────────────────────────── */}
      {inviteToken && !inviteData.checked && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground animate-pulse">
          Verifying your invite…
        </div>
      )}

      {isInviteValid && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-emerald-400">
            ✓ Waitlist invite verified!
          </p>
          <p className="text-sm text-muted-foreground">
            Welcome back{inviteData.name ? `, ${inviteData.name}` : ""}!
            {(inviteData.tokens ?? 0) > 0 && (
              <>
                {" "}
                Your{" "}
                <span className="font-semibold text-amber-400">
                  {inviteData.tokens} waitlist tokens
                </span>{" "}
                will be added to your account.
              </>
            )}
          </p>
        </div>
      )}

      {isInviteInvalid && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          ⚠ This invite link is invalid or has already been used. Please check
          your email or{" "}
          <Link href="/login" className="underline">
            log in
          </Link>{" "}
          instead.
        </div>
      )}
      {/* ──────────────────────────────────────────────────────────────── */}

      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          {fromWaitlist ? "Claim your Horizon spot" : "Join the mentorship studio"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline">
            Sign in
          </Link>
        </p>
      </div>

      <div className="space-y-3 rounded-xl border bg-background p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input
            type="email"
            placeholder="you@college.edu"
            value={signupEmail}
            onChange={(e) => {
              const value = e.target.value;
              setSignupEmail(value);
              form.setValue("email", value, { shouldValidate: true });
            }}
            autoComplete="email"
          />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Button
            type="button"
            onClick={() => {
              form.setValue("email", signupEmail, { shouldValidate: true });
              setShowEmailSignup(true);
            }}
            disabled={isLoading}
          >
            Continue with email
          </Button>
          <Button
            variant="outline"
            onClick={() => loginWithGoogle()}
            disabled={isLoading}
            type="button"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        </div>
      </div>

      {showEmailSignup ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-6 md:grid-cols-2"
          >
          {formError ? (
            <div className="md:col-span-2 flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          ) : null}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="alex@campus.edu"
                    autoComplete="email"
                    readOnly={isInviteValid}
                    className={isInviteValid ? "opacity-70 cursor-not-allowed" : ""}
                  />
                </FormControl>
                {isInviteValid && (
                  <p className="text-xs text-muted-foreground">
                    Email is locked to your invite.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="alex" autoComplete="username" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Alex" autoComplete="given-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Johnson" autoComplete="family-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password_confirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terms_accepted"
            render={({ field }) => (
              <FormItem className="md:col-span-2 flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    I agree to the{" "}
                    <Link href="/terms" className="text-primary underline">
                      Terms of Service
                    </Link>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="privacy_policy_accepted"
            render={({ field }) => (
              <FormItem className="md:col-span-2 flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    I agree to the{" "}
                    <Link href="/privacy" className="text-primary underline">
                      Privacy Policy
                    </Link>
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="md:col-span-2 w-full"
            disabled={isLoading}
          >
            {isLoading ? "Creating account…" : "Create account"}
          </Button>
          </form>
        </Form>
      ) : null}
    </div>
  );
}

// ── Page wrapper: Suspense boundary for useSearchParams ───────────────────────
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-2xl border bg-card/80 p-8 shadow-xl backdrop-blur animate-pulse">
          <div className="h-8 w-64 rounded bg-muted mx-auto" />
          <div className="h-10 w-full rounded bg-muted" />
          <div className="h-10 w-full rounded bg-muted" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
