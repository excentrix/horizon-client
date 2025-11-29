"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrainCircuit,
  Compass,
  MessageCircle,
  Radar,
  Trophy,
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
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
            <span className="sr-only">Notifications</span>
            <Radar className="h-4 w-4" />
          </Button>
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
