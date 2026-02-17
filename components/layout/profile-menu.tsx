"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, LogOut, Settings, Shield } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChangePasswordDialog } from "@/components/profile/change-password-dialog";
import { cn } from "@/lib/utils";
import { telemetry } from "@/lib/telemetry";

export function ProfileMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!user) {
    return null;
  }

  const initials =
    user.full_name?.split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || user.email.charAt(0).toUpperCase();

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
            className="flex h-10 w-full items-center justify-between gap-3 rounded-full px-3 text-sm shadow-sm"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "hidden flex-1 text-left leading-tight md:block"
              )}
            >
              <span className="block font-medium">
                {user.full_name ?? user.email}
              </span>
              <span className="block text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
            <span className="ml-auto hidden text-xs text-muted-foreground md:inline">
              Account
            </span>
          </Button>
        </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {user.full_name ?? user.email}
            </p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            router.push("/dashboard");
            setOpen(false);
          }}
        >
          <Settings className="mr-2 h-4 w-4" /> Studio overview
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            router.push("/portfolio/settings");
            setOpen(false);
          }}
        >
          <Eye className="mr-2 h-4 w-4" /> Edit public profile
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setShowChangePassword(true);
            setOpen(false);
          }}
        >
            <Shield className="mr-2 h-4 w-4" /> Change password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />
    </>
  );
}
