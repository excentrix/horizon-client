"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Eye, LogOut, Settings, Sparkles } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useGamificationSummary } from "@/hooks/use-gamification";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { telemetry } from "@/lib/telemetry";

type ProfileMenuVariant = "default" | "compact";

function toTitleCase(name?: string | null) {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function ProfileMenu({ variant = "default" }: { variant?: ProfileMenuVariant } = {}) {
  const { user, logout } = useAuth();
  const { data: gamificationData } = useGamificationSummary({ enabled: !!user });
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!user) {
    return null;
  }

  const displayName = toTitleCase(user.full_name) || user.email;
  const initials =
    displayName?.split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || user.email.charAt(0).toUpperCase();
  const level = gamificationData?.profile?.level ?? 1;
  const totalXP = gamificationData?.profile?.total_points ?? 0;
  const xpProgressPct = Math.max(
    0,
    Math.min(100, gamificationData?.profile?.level_progress_percentage ?? 0),
  );
  const xpProgress = gamificationData?.profile?.level_progress ?? 0;
  const xpNeeded = gamificationData?.profile?.xp_for_next_level ?? 100;
  const profileCompletion = Math.round(
    Math.max(0, Math.min(100, user.profile_completion ?? 0)),
  );
  const identityRing = Math.max(xpProgressPct, profileCompletion);
  const ringState = identityRing >= 90 ? "stable" : identityRing >= 60 ? "growing" : "starting";

  const nextAction =
    profileCompletion < 80
      ? {
          label: "Complete profile",
          description: "Add key details in Settings to improve mentor personalization quality.",
          href: "/settings",
        }
      : xpProgressPct < 65
        ? {
            label: "Earn XP",
            description: "Run one focused mission block to push your XP bar to the next level.",
            href: "/plans",
          }
        : {
            label: "Mentor check-in",
            description: "Use Mentor for your next best move and close the loop with a reflection.",
            href: "/chat?context=dashboard",
          };

  const handleLogout = async () => {
    try {
      await logout();
      telemetry.info("User logged out");
    } catch (error) {
      telemetry.error("Logout failed", { error });
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          {variant === "compact" ? (
            <Button
              variant="ghost"
              className="h-12 w-auto min-w-[300px] max-w-[390px] rounded-2xl border border-border/80 bg-background px-2.5 shadow-[var(--shadow-1)] transition-all duration-300 hover:border-[color:var(--brand-indigo)]/35"
            >
              <TooltipProvider>
                <div className="flex w-full items-center gap-2.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="relative h-9 w-9 shrink-0 rounded-full p-[2px] transition-transform duration-300 data-[state=open]:scale-[1.03]"
                        style={{
                          background: `conic-gradient(var(--brand-indigo) ${identityRing}%, rgba(88,88,204,0.18) 0)`,
                        }}
                      >
                        <Avatar className="h-full w-full">
                          <AvatarImage src={user.avatar_url ?? undefined} alt={displayName} />
                          <AvatarFallback className="text-xs font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px] text-[11px]">
                      Identity ring: {Math.round(identityRing)}% ({ringState}).
                    </TooltipContent>
                  </Tooltip>
                  <span className="min-w-0 flex-1 text-left leading-tight">
                    <span className="block truncate font-medium">{displayName}</span>
                    <span className="block truncate font-mono-ui text-[10px] text-muted-foreground">
                      L{level} • {totalXP.toLocaleString()} XP • {profileCompletion}% profile
                    </span>
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="h-7 shrink-0 gap-1 border-[color:var(--brand-indigo)]/35 bg-[color:var(--brand-indigo)]/10 px-2 font-mono-ui text-[10px] text-[color:var(--brand-indigo)]"
                      >
                        <Sparkles className="h-3 w-3" />
                        {nextAction.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[240px] text-[11px]">
                      {nextAction.description}
                    </TooltipContent>
                  </Tooltip>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </TooltipProvider>
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="flex h-10 w-full items-center justify-between gap-3 rounded-full px-3 text-sm shadow-sm"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.avatar_url ?? undefined} alt={displayName} />
                <AvatarFallback className="text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-left leading-tight">
                <span className="block font-medium">
                  {displayName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {user.email}
                </span>
              </span>
              <Badge variant="outline" className="font-mono-ui text-[10px]">
                L{level}
              </Badge>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <Badge variant="outline" className="font-mono-ui text-[10px]">
              Level {level}
            </Badge>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>XP goal</span>
                <span className="font-mono-ui">{xpProgress}/{xpNeeded}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[color:var(--brand-indigo)] transition-all duration-300"
                  style={{ width: `${xpProgressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Profile completion</span>
                <span className="font-mono-ui">{profileCompletion}%</span>
              </div>
            </div>
            <div className="rounded-lg border border-[color:var(--brand-indigo)]/30 bg-[color:var(--brand-indigo)]/10 p-2">
              <p className="font-mono-ui text-[10px] text-[color:var(--brand-indigo)]">
                NEXT BEST ACTION
              </p>
              <p className="mt-1 text-xs text-foreground">{nextAction.description}</p>
              <Button
                size="sm"
                variant="accent"
                className="mt-2 h-7 w-full justify-between px-2 font-mono-ui text-[11px]"
                onClick={() => {
                  router.push(nextAction.href);
                  setOpen(false);
                }}
              >
                {nextAction.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            router.push("/settings");
            setOpen(false);
          }}
        >
          <Settings className="mr-2 h-4 w-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            router.push("/settings/portfolio");
            setOpen(false);
          }}
        >
          <Eye className="mr-2 h-4 w-4" /> Public Portfolio
        </DropdownMenuItem>
        <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
