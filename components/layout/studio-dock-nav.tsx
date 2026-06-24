"use client";

import { useState } from "react";
import { useEffect, useRef } from "react";
import {
  BarChart3,
  ClipboardList,
  Compass,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  Route,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
  MessagesSquare,
  Layers3,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

import { useAuth } from "@/context/AuthContext";
import { usePortfolioProfile } from "@/hooks/use-portfolio";
import { useFeatureFlags } from "@/hooks/use-features";
import type { FeatureName } from "@/lib/feature-flags";
import { FloatingDock } from "@/components/ui/floating-dock";
import { MentorInbox } from "@/components/intelligence/MentorInbox";
import { Button } from "@/components/ui/button";

type DockItem = {
  href?: string;
  title: string;
  icon: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  /** When set, the item only shows if this feature flag is enabled. */
  feature?: FeatureName;
};

type IconProps = {
  className?: string;
};

const DashboardIcon = ({ className }: IconProps) => <LayoutDashboard className={className} />;
const MentorIcon = ({ className }: IconProps) => <MessagesSquare className={className} />;
const PlansIcon = ({ className }: IconProps) => <ClipboardList className={className} />;
const RoadmapIcon = ({ className }: IconProps) => <Route className={className} />;
const ProgressIcon = ({ className }: IconProps) => <TrendingUp className={className} />;
const SimLabIcon = ({ className }: IconProps) => <FlaskConical className={className} />;
const InboxIcon = ({ className }: IconProps) => <Inbox className={className} />;
const OverviewIcon = ({ className }: IconProps) => <Compass className={className} />;
const AuditIcon = ({ className }: IconProps) => <ShieldCheck className={className} />;
const StudentsIcon = ({ className }: IconProps) => <Users className={className} />;
const ReportsIcon = ({ className }: IconProps) => <BarChart3 className={className} />;
const CohortsIcon = ({ className }: IconProps) => <Layers3 className={className} />;

const STUDENT_ITEMS: DockItem[] = [
  { href: "/dashboard", title: "Dashboard", icon: <DashboardIcon className="h-full w-full" />, feature: "dashboard" },
  { href: "/verify", title: "Verify", icon: <AuditIcon className="h-full w-full" />, feature: "velo" },
  { href: "/chat", title: "Mentor", icon: <MentorIcon className="h-full w-full" />, feature: "chat" },
  { href: "/plans", title: "Plans", icon: <PlansIcon className="h-full w-full" />, feature: "plans" },
  { href: "/roadmap", title: "Roadmap", icon: <RoadmapIcon className="h-full w-full" />, feature: "roadmap" },
  { href: "/progress", title: "Progress", icon: <ProgressIcon className="h-full w-full" />, feature: "progress" },
];

const EDU_ITEMS: DockItem[] = [
  { href: "/institution/overview", title: "Overview", icon: <OverviewIcon className="h-full w-full" />, feature: "institutions" },
  { href: "/audit/admin/dashboard", title: "Audit", icon: <AuditIcon className="h-full w-full" />, feature: "velo" },
  { href: "/institution/students", title: "Students", icon: <StudentsIcon className="h-full w-full" />, feature: "institutions" },
  { href: "/institution/reports", title: "Reports", icon: <ReportsIcon className="h-full w-full" />, feature: "institutions" },
];

const ADMIN_ITEMS: DockItem[] = [
  { href: "/institution/overview", title: "Overview", icon: <OverviewIcon className="h-full w-full" />, feature: "institutions" },
  { href: "/institution/cohorts", title: "Cohorts", icon: <CohortsIcon className="h-full w-full" />, feature: "institutions" },
  { href: "/institution/students", title: "Students", icon: <StudentsIcon className="h-full w-full" />, feature: "institutions" },
  { href: "/institution/reports", title: "Reports", icon: <ReportsIcon className="h-full w-full" />, feature: "institutions" },
];

export function StudioDockNav() {
  const isDev = process.env.NODE_ENV === "development";
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { data: profileData } = usePortfolioProfile();
  const flags = useFeatureFlags();
  const [inboxOpen, setInboxOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inboxPopupRef = useRef<HTMLDivElement | null>(null);

  const isSuperUser = user?.is_superuser;
  const isAdmin = profileData?.profile?.user_type === "admin";
  const isEducator = profileData?.profile?.user_type === "educator";

  const studentItems: DockItem[] = isDev
    ? [
        ...STUDENT_ITEMS,
        { href: "/simulations", title: "Sim Lab", icon: <SimLabIcon className="h-full w-full" /> },
      ]
    : STUDENT_ITEMS;

  const baseItems: DockItem[] = isSuperUser
    ? ADMIN_ITEMS
    : isAdmin
      ? ADMIN_ITEMS
      : isEducator
        ? EDU_ITEMS
        : studentItems;
  const items: DockItem[] =
    !isSuperUser && !isAdmin && !isEducator && !isMobile
      ? [
          ...baseItems,
          {
            title: "Inbox",
            icon: <InboxIcon className="h-full w-full" />,
            onClick: () => setInboxOpen((prev) => !prev),
            isActive: inboxOpen,
          },
        ]
      : baseItems;

  const visibleItems = items.filter(
    (item: DockItem) => !item.feature || flags[item.feature],
  );

  const activeItems = visibleItems.map((item: DockItem) => ({
    ...item,
    isActive:
      item.isActive ??
      (item.href ? pathname === item.href || pathname.startsWith(`${item.href}/`) : false),
  }));

  const autoHide= !pathname.includes("dashboard")
  const isChatThreadOpen =
    pathname === "/chat" && Boolean(searchParams?.get("conversation"));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 767px)");
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (isMobile && inboxOpen) {
      setInboxOpen(false);
    }
  }, [isMobile, inboxOpen]);

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
        mobileClassName={cn(
          "fixed inset-x-0 bottom-0 z-50",
          isChatThreadOpen && "hidden",
        )}
        autohide={autoHide}
      />
    </>
  );
}
