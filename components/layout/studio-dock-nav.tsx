"use client";

import { useState } from "react";
import { useEffect, useRef } from "react";
import {
  Briefcase,
  BrainCircuit,
  Compass,
  FlaskConical,
  Inbox,
  MessageCircle,
  Radar,
  Trophy,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import { useAuth } from "@/context/AuthContext";
import { usePortfolioProfile } from "@/hooks/use-portfolio";
import { FloatingDock } from "@/components/ui/floating-dock";
import { MentorInbox } from "@/components/intelligence/MentorInbox";
import { Button } from "@/components/ui/button";

type DockItem = {
  href?: string;
  title: string;
  icon: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
};

const STUDENT_ITEMS: DockItem[] = [
  { href: "/dashboard", title: "Dashboard", icon: <Compass className="h-full w-full" /> },
  { href: "/chat", title: "Mentor", icon: <MessageCircle className="h-full w-full" /> },
  { href: "/plans", title: "Plans", icon: <BrainCircuit className="h-full w-full" /> },
  { href: "/roadmap", title: "Roadmap", icon: <Compass className="h-full w-full" /> },
  { href: "/progress", title: "Mirror", icon: <Trophy className="h-full w-full" /> },
];

const EDU_ITEMS: DockItem[] = [
  { href: "/institution/overview", title: "Overview", icon: <Radar className="h-full w-full" /> },
  { href: "/audit/admin/dashboard", title: "Audit", icon: <Briefcase className="h-full w-full" /> },
  { href: "/institution/students", title: "Students", icon: <BrainCircuit className="h-full w-full" /> },
  { href: "/institution/reports", title: "Reports", icon: <Trophy className="h-full w-full" /> },
];

const ADMIN_ITEMS: DockItem[] = [
  { href: "/institution/overview", title: "Overview", icon: <Briefcase className="h-full w-full" /> },
  { href: "/institution/cohorts", title: "Cohorts", icon: <Compass className="h-full w-full" /> },
  { href: "/institution/students", title: "Students", icon: <BrainCircuit className="h-full w-full" /> },
  { href: "/institution/reports", title: "Reports", icon: <Trophy className="h-full w-full" /> },
];

export function StudioDockNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: profileData } = usePortfolioProfile();
  const [inboxOpen, setInboxOpen] = useState(false);
  const inboxPopupRef = useRef<HTMLDivElement | null>(null);

  const isSuperUser = user?.is_superuser;
  const isAdmin = profileData?.profile?.user_type === "admin";
  const isEducator = profileData?.profile?.user_type === "educator";

  const studentItems = isDev
    ? [
        ...STUDENT_ITEMS,
        { href: "/simulations", title: "Sim Lab", icon: <FlaskConical className="h-full w-full" /> },
      ]
    : STUDENT_ITEMS;

  const baseItems = isSuperUser
    ? ADMIN_ITEMS
    : isAdmin
      ? ADMIN_ITEMS
      : isEducator
        ? EDU_ITEMS
        : studentItems;
  const items =
    !isSuperUser && !isAdmin && !isEducator
      ? [
          ...baseItems,
          {
            title: "Inbox",
            icon: <Inbox className="h-full w-full" />,
            onClick: () => setInboxOpen((prev) => !prev),
            isActive: inboxOpen,
          },
        ]
      : baseItems;

  const activeItems = items.map((item) => ({
    ...item,
    isActive:
      item.isActive ??
      (item.href ? pathname === item.href || pathname.startsWith(`${item.href}/`) : false),
  }));

  const autoHide= !pathname.includes("dashboard")

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem("horizon_inbox_open");
    setInboxOpen(saved === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem("horizon_inbox_open", String(inboxOpen));
  }, [inboxOpen]);

  useEffect(() => {
    if (!inboxOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setInboxOpen(false);
      }
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element | null;
      if (!target) return;

      const clickedInsidePopup = !!inboxPopupRef.current?.contains(target);
      const clickedInboxDockButton = !!target.closest(
        '[data-dock-item="true"][data-dock-title="Inbox"]',
      );
      if (!clickedInsidePopup && !clickedInboxDockButton) {
        setInboxOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [inboxOpen]);

  return (
    <>
      <AnimatePresence>
        {inboxOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Dismiss inbox overlay"
              onClick={() => setInboxOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 z-45 hidden bg-black/10 backdrop-blur-[1px] md:block"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-24 z-50 mx-auto w-[min(92vw,520px)]"
            >
              <div
                ref={inboxPopupRef}
                className="rounded-2xl border border-border bg-card/95 p-2 shadow-[var(--shadow-1)] backdrop-blur"
              >
                <div className="mb-2 flex items-center justify-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setInboxOpen(false)}
                    aria-label="Close inbox"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <MentorInbox />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FloatingDock
        items={activeItems}
        desktopClassName="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2"
        mobileClassName="fixed inset-x-0 bottom-0 z-50"
        autohide={autoHide}
      />
    </>
  );
}
  const isDev = process.env.NODE_ENV === "development";
