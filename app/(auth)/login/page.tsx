"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember_me: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loginWithGoogle, isLoading } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember_me: true,
    },
  });

  useEffect(() => {
    if (user) {
      if (user.is_superuser) router.replace("/hq");
      else router.replace("/dashboard");
    }
  }, [router, user]);

  const onSubmit = async (values: LoginFormValues) => {
    await login({
      email: values.email,
      password: values.password,
      remember_me: values.remember_me,
    });
  };

  return (
    <div className="grid w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-3)] lg:grid-cols-[1.05fr_1fr]">
      <AuthBrandPanel />

      <div className="p-8 sm:p-10">
        <div className="mb-7 space-y-2">
          <p className="eyebrow flex items-center gap-2">
            <span className="eyebrow-dot" />
            Welcome back
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[color:var(--brand-ink)]">
            Sign in to verify your work
          </h1>
          <p className="text-sm text-muted-foreground">
            Defend the projects you claim and earn a shareable proof-of-work
            credential. New here?{" "}
            <Link
              href="/register"
              className="font-medium text-(--brand-tangerine) underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="alex@campus.edu"
                      autoComplete="email"
                    />
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
                      autoComplete="current-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end text-xs">
              <Link
                href="/forgot-password"
                className="text-(--brand-tangerine) underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <FormField
              control={form.control}
              name="remember_me"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Keep me signed in
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                      className="data-[state=checked]:bg-(--brand-tangerine) data-[state=unchecked]:bg-foreground"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              size="lg"
              className="w-full bg-(--brand-tangerine) text-accent-foreground hover:opacity-90"
              disabled={isLoading || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              className="w-full"
              onClick={() => loginWithGoogle()}
              disabled={isLoading}
            >
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                ></path>
              </svg>
              Sign in with Google
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
