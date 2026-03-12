"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { http } from "@/lib/http-client";

type InboxNotification = {
  id: number;
  notif_type: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
};

const TYPE_ICONS: Record<string, string> = {
  badge_earned: "🏅",
  level_completed: "🎉",
  streak_alert: "🔥",
  task_reminder: "📋",
  plan_ready: "🗺️",
  intervention: "💬",
  system: "🔔",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCountChange?: (count: number) => void;
}

export function NotificationDrawer({ open, onOpenChange, onCountChange }: NotificationDrawerProps) {
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get("/notifications/inbox/");
      setNotifications(data.results ?? []);
      const unread = (data.results ?? []).filter((n: InboxNotification) => !n.is_read).length;
      onCountChange?.(unread);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const markRead = async (notif: InboxNotification) => {
    if (notif.is_read) {
      if (notif.link) { router.push(notif.link); onOpenChange(false); }
      return;
    }
    setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
    const newUnread = notifications.filter((n) => n.id !== notif.id && !n.is_read).length;
    onCountChange?.(newUnread);
    await http.post(`/notifications/inbox/${notif.id}/read/`);
    if (notif.link) { router.push(notif.link); onOpenChange(false); }
  };

  const markAll = async () => {
    setMarkingAll(true);
    await http.post("/notifications/inbox/read_all/");
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    onCountChange?.(0);
    setMarkingAll(false);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[440px] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold">
              Notifications {unreadCount > 0 && <span className="ml-2 rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5">{unreadCount}</span>}
            </SheetTitle>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAll} disabled={markingAll} className="h-7 text-xs">
                {markingAll ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCheck className="h-3 w-3 mr-1" />}
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <span className="text-4xl">🔔</span>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n)}
                className={cn(
                  "w-full text-left px-5 py-4 border-b last:border-b-0 hover:bg-muted/40 transition-colors flex gap-3",
                  !n.is_read && "bg-primary/5"
                )}
              >
                <span className="text-xl mt-0.5 shrink-0">{TYPE_ICONS[n.notif_type] ?? "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm leading-snug", !n.is_read && "font-semibold")}>{n.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                </div>
                {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />}
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
