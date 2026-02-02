import { toast } from "sonner";
import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";

// Initialize PostHog
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_DISABLED !== 'true') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    person_profiles: 'identified_only',
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
  });
}

type LogLevel = "info" | "warn" | "error";

const formatMessage = (message: unknown) => {
  if (typeof message === "string") {
    return message;
  }
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
};

export const telemetry = {
  // Core logging (console + PostHog + Sentry)
  log(level: LogLevel, message: unknown, meta?: Record<string, unknown>) {
    const formatted = formatMessage(message);
    const payload = meta ? `${formatted} ${JSON.stringify(meta)}` : formatted;

    if (level === "error") {
      console.error(payload);
      
      // Send to PostHog
      posthog.capture("error_logged", { message: formatted, ...meta });
      
      // Send to Sentry
      if (message instanceof Error) {
        Sentry.captureException(message, {
          extra: meta,
        });
      } else {
        Sentry.captureMessage(formatted, {
          level: "error",
          extra: meta,
        });
      }
    } else if (level === "warn") {
      console.warn(payload);
    } else {
      console.info(payload);
    }
  },
  
  info(message: unknown, meta?: Record<string, unknown>) {
    this.log("info", message, meta);
  },
  
  warn(message: unknown, meta?: Record<string, unknown>) {
    this.log("warn", message, meta);
  },
  
  error(message: unknown, meta?: Record<string, unknown>) {
    this.log("error", message, meta);
  },

  // Toast helpers
  toast(message: string, description?: string) {
    toast(message, description ? { description } : undefined);
    this.info(message, description ? { description } : undefined);
  },
  
  toastError(message: string, description?: string) {
    toast.error(message, description ? { description } : undefined);
    this.error(message, description ? { description } : undefined);
  },
  
  toastSuccess(message: string, description?: string) {
    toast.success(message, description ? { description } : undefined);
    this.info(message, description ? { description } : undefined);
  },
  
  toastInfo(message: string, description?: string) {
    toast.info(message, description ? { description } : undefined);
    this.info(message, description ? { description } : undefined);
  },

  // Analytics tracking
  track(eventName: string, properties?: Record<string, unknown>) {
    if (typeof window !== "undefined") {
      posthog.capture(eventName, properties);
    }
  },

  identify(userId: string, properties?: Record<string, unknown>) {
    if (typeof window !== "undefined") {
      posthog.identify(userId, properties);
      
      // Set Sentry user context
      Sentry.setUser({
        id: userId,
        email: properties?.email as string,
        username: properties?.username as string,
      });
    }
  },

  reset() {
    if (typeof window !== "undefined") {
      posthog.reset();
      Sentry.setUser(null);
    }
  },

  // Page tracking
  pageView(pageName: string, properties?: Record<string, unknown>) {
    if (typeof window !== "undefined") {
      posthog.capture("$pageview", { page_name: pageName, ...properties });
    }
  },
};

// Export posthog instance for advanced usage
export { posthog };
