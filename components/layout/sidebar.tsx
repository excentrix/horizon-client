"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrainCircuit,
  Briefcase,
  Compass,
  FolderOpen,
  MessageCircle,
  Radar,
  Trophy,
  QrCode,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnalysisProgressPanel } from "@/components/progress/AnalysisProgressPanel";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePortfolioProfile } from "@/hooks/use-portfolio";
import { useMemo, useState } from "react";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Compass,
    description: "Studio overview & quick stats",
  },
  {
    href: "/chat",
    label: "Mentor Lounge",
    icon: MessageCircle,
    description: "Converse with your adaptive mentor",
  },
  {
    href: "/plans",
    label: "Plan Workbench",
    icon: BrainCircuit,
    description: "Active learning campaigns",
  },
  {
    href: "/artifacts",
    label: "Artifacts",
    icon: Briefcase,
    description: "Submitted, verified, and promoted work",
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: FolderOpen,
    description: "Your professional portfolio showcase",
  },
  {
    href: "/progress",
    label: "Progress Mural",
    icon: Trophy,
    description: "Milestones, streaks, and wins",
  },
  {
    href: "/signals",
    label: "Signals & Alerts",
    icon: Radar,
    description: "Wellness & intelligence feed",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: profileData } = usePortfolioProfile();
  const [qrOpen, setQrOpen] = useState(false);
  const [badgeCopied, setBadgeCopied] = useState(false);
  const profile = profileData?.profile;
  const publicUrl = useMemo(() => {
    if (!profile?.slug || typeof window === "undefined") return "";
    return `${window.location.origin}/p/${profile.slug}`;
  }, [profile?.slug]);

  return (
    <aside className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground shadow">
              HS
            </span>
            <span>Horizon Studio</span>
          </Link>
          <Dialog open={qrOpen} onOpenChange={setQrOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
                <span className="sr-only">Share profile</span>
                <QrCode className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Share your portfolio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="mx-auto flex w-full max-w-[240px] items-center justify-center rounded-2xl border border-border bg-muted/40 p-4">
                  {publicUrl ? (
                    <img
                      alt="Portfolio QR"
                      className="h-48 w-48"
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                        publicUrl
                      )}`}
                    />
                  ) : (
                    <div className="text-center text-xs text-muted-foreground">
                      Enable your public portfolio to generate a QR code.
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  {publicUrl || "Enable your public portfolio to generate a share link."}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={!publicUrl}
                    onClick={async () => {
                      if (!publicUrl) return;
                      await navigator.clipboard.writeText(publicUrl);
                      setBadgeCopied(true);
                      setTimeout(() => setBadgeCopied(false), 2000);
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {badgeCopied ? "Copied" : "Copy link"}
                  </Button>
                  <Button size="sm" variant="outline" asChild disabled={!publicUrl}>
                    <Link href={publicUrl || "#"} target="_blank">
                      Open public
                    </Link>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3 text-sm font-medium lg:px-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <AnalysisProgressPanel />

        <div className="mt-auto space-y-4 p-4">
          <Card>
            <CardHeader className="p-2 pt-0 md:p-4">
              <CardTitle>Invite a friend</CardTitle>
              <CardDescription>
                Unlock bonus mentor styles when a friend joins your studio.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
              <Button size="sm" className="w-full">
                Share Link
              </Button>
            </CardContent>
          </Card>
          <ProfileMenu />
        </div>
        {/* Global progress panel */}
      </div>
    </aside>
  );
}
