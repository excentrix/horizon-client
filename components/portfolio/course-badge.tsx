"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Award, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseBadge {
  id: string;
  title: string;
  category: string; // "frontend", "backend", "ui_design", "cloud", "database", etc.
  completed_at: string;
  badge_type: "completion" | "excellence" | "verified";
  total_hours?: number;
  certificate_url?: string;
}

interface CourseBadgeCardProps {
  badge: CourseBadge;
  onClick?: () => void;
  className?: string;
}

const categoryColors = {
  frontend: "from-blue-500 to-cyan-500",
  backend: "from-green-500 to-emerald-500",
  ui_design: "from-purple-500 to-pink-500",
  cloud: "from-orange-500 to-amber-500",
  database: "from-red-500 to-rose-500",
  fullstack: "from-indigo-500 to-violet-500",
  default: "from-gray-500 to-slate-500",
};

const badgeTypeIcons = {
  completion: CheckCircle2,
  excellence: Trophy,
  verified: Award,
};

export function CourseBadgeCard({ badge, onClick, className }: CourseBadgeCardProps) {
  const Icon = badgeTypeIcons[badge.badge_type];
  const colorClass = categoryColors[badge.category as keyof typeof categoryColors] || categoryColors.default;
  
  const formattedDate = new Date(badge.completed_at).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all hover:shadow-lg hover:scale-105 cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Gradient background */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10", colorClass)} />
      
      <CardContent className="relative p-6">
        <div className="flex items-start gap-4">
          {/* Badge icon */}
          <div className={cn("rounded-full p-3 bg-gradient-to-br shadow-lg", colorClass)}>
            <Icon className="h-6 w-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="font-semibold text-lg leading-tight mb-1">
              {badge.title}
            </h3>

            {/* Category badge */}
            <Badge variant="secondary" className="mb-2 capitalize">
              {badge.category.replace("_", " ")}
            </Badge>

            {/* Meta info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
              <span>Completed {formattedDate}</span>
              {badge.total_hours && (
                <>
                  <span>•</span>
                  <span>{badge.total_hours}h</span>
                </>
              )}
            </div>

            {/* Certificate badge */}
            {badge.certificate_url && (
              <div className="mt-3">
                <Badge variant="outline" className="text-xs">
                  <Award className="h-3 w-3 mr-1" />
                  Certificate Available
                </Badge>
              </div>
            )}
          </div>

          {/* Verified checkmark */}
          {badge.badge_type === "verified" && (
            <div className="absolute top-2 right-2">
              <div className="rounded-full bg-blue-500 p-1">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CourseBadgeGridProps {
  badges: CourseBadge[];
  onBadgeClick?: (badge: CourseBadge) => void;
  className?: string;
}

export function CourseBadgeGrid({ badges, onBadgeClick, className }: CourseBadgeGridProps) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No course completions yet</p>
        <p className="text-sm mt-1">Complete learning plans to earn badges</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {badges.map((badge) => (
        <CourseBadgeCard
          key={badge.id}
          badge={badge}
          onClick={() => onBadgeClick?.(badge)}
        />
      ))}
    </div>
  );
}

// Compact badge list for hero section
export function CourseBadgeList({ badges, max = 5 }: { badges: CourseBadge[]; max?: number }) {
  const displayBadges = badges.slice(0, max);
  const remaining = badges.length - max;

  return (
    <div className="flex flex-wrap gap-2">
      {displayBadges.map((badge) => {
        const colorClass = categoryColors[badge.category as keyof typeof categoryColors] || categoryColors.default;
        const Icon = badgeTypeIcons[badge.badge_type];
        
        return (
          <div
            key={badge.id}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-sm font-medium bg-gradient-to-r shadow-sm",
              colorClass
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {badge.title}
          </div>
        );
      })}
      {remaining > 0 && (
        <Badge variant="secondary" className="px-3 py-1.5">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}
