"use client";

import {
  Briefcase,
  BrainCircuit,
  Compass,
  MessageCircle,
  Radar,
  Trophy,
} from "lucide-react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { usePortfolioProfile } from "@/hooks/use-portfolio";
import { FloatingDock } from "@/components/ui/floating-dock";

type DockItem = {
  href: string;
  title: string;
  icon: React.ReactNode;
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

  const isSuperUser = user?.is_superuser;
  const isAdmin = profileData?.profile?.user_type === "admin";
  const isEducator = profileData?.profile?.user_type === "educator";

  const items = isSuperUser ? ADMIN_ITEMS : isAdmin ? ADMIN_ITEMS : isEducator ? EDU_ITEMS : STUDENT_ITEMS;

  const activeItems = items.map((item) => ({
    ...item,
    isActive: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));

  return (
    <FloatingDock
      items={activeItems}
      desktopClassName="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2"
      mobileClassName="fixed right-5 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50"
    />
  );
}
