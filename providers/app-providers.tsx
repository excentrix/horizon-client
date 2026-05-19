'use client';

import { useEffect, useState, type ReactNode } from "react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/components/theme-provider";
import { DesignModeToggle } from "@/components/dev/design-mode-toggle";
import { Toaster } from "@/components/ui/sonner";

type AppProvidersProps = {
  children: ReactNode;
};

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 60 * 1000,
      },
      mutations: {
        retry: 1,
      },
    },
  });

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // SW registration is required for installable PWA / standalone behavior.
    navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(() => {
      // Non-fatal in unsupported/insecure local environments.
    });
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            {children}
            <Toaster richColors closeButton />
            {/* <DesignModeToggle /> */}
          </NotificationProvider>
        </AuthProvider>
        {/* {process.env.NODE_ENV === "development" ? (
           <ReactQueryDevtools initialIsOpen={false} />
         ) : null} */}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
