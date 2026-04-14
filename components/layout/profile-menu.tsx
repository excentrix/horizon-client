"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Eye, LogOut, Settings } from "lucide-react";

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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
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
          <Button
            variant="ghost"
            className={cn(
              "flex items-center justify-between gap-3 rounded-full px-3 text-sm shadow-sm",
              variant === "compact" ? "h-10 w-auto min-w-[220px] max-w-[320px]" : "h-10 w-full",
            )}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "flex-1 text-left leading-tight"
              )}
            >
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
        </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <Badge variant="outline" className="mt-1 font-mono-ui text-[10px]">
              Level {level}
            </Badge>
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
