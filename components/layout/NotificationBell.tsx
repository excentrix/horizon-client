"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationDrawer } from "./NotificationDrawer";
import { cn } from "@/lib/utils";

import { http } from "@/lib/http-client";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnread = async () => {
    try {
      const { data } = await http.get("/notifications/inbox/unread_count/");
      setUnreadCount(data.count ?? 0);
    } catch {
      // Silently ignore — non-critical feature
    }
  };


  useEffect(() => {
    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, 30_000); // poll every 30s
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Recount when drawer closes (user may have read notifications)
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) fetchUnread();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="relative h-9 w-9"
        aria-label="Open notification center"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white leading-none"
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      <NotificationDrawer
        open={open}
        onOpenChange={handleOpenChange}
        onCountChange={setUnreadCount}
      />
    </>
  );
}
