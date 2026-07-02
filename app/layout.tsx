import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  Geist_Mono,
  Instrument_Sans,
  Roboto_Mono,
  Silkscreen,
} from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { AppProviders } from "@/providers/app-providers";
import { cn } from "@/lib/utils";

// Brand stack shared with horizon-web ("first light"): Instrument Sans (body),
// Bricolage Grotesque (display), Geist Mono (mono).
const inter = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-ui",
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
  applicationName: "Horizon",
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
    statusBarStyle: "black-translucent",
    capable: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#5858cc",
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
