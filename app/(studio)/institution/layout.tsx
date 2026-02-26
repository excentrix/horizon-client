"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  Building2,
  FilePieChart,
  Settings,
  Users,
} from "lucide-react";

const ALL_TABS = [
  { href: "/institution/overview",  label: "Analytics",  icon: BarChart3,   adminOnly: false },
  { href: "/institution/cohorts",   label: "Cohorts",    icon: BookOpen,   adminOnly: false },
  { href: "/institution/members",   label: "Members",    icon: Users,       adminOnly: true  },
  { href: "/institution/invites",   label: "Invites",    icon: Building2,   adminOnly: true  },
  { href: "/institution/reports",   label: "Reports",    icon: FilePieChart, adminOnly: true  },
  { href: "/institution/settings",  label: "Settings",   icon: Settings,    adminOnly: true  },
] as const;

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isAdmin = user?.user_type === "admin";
  const tabs = ALL_TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="flex flex-col min-h-full">
      {/* Tab bar */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/institution/overview" && pathname.startsWith(href));
            return (
              <a
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        {children}
      </div>
    </div>
  );
}
