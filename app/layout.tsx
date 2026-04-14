import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  Inter,
  Roboto_Mono,
  Silkscreen,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono-ui",
  weight: ["400", "500", "600"],
});

const retroDisplay = Silkscreen({
  subsets: ["latin"],
  variable: "--font-retro-display",
  weight: ["400", "700"],
});

const retroBody = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-retro-body",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Horizon",
  description: "The GPS for your career",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    title: "Horizon",
    statusBarStyle: "default",
    capable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable,
          display.variable,
          mono.variable,
          retroDisplay.variable,
          retroBody.variable,
        )}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
