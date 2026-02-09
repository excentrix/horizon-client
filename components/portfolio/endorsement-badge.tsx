"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Endorsement {
  id: string;
  competency_name: string;
  endorser_display: string;
  endorser_type: "ai_mentor" | "human_mentor" | "peer" | "self" | "system";
  proficiency_endorsed: string;
  endorsement_strength: number;
  created_at: string;
}

interface EndorsementBadgeProps {
  endorsement: Endorsement;
  className?: string;
}

const endorserTypeColors = {
  ai_mentor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  human_mentor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  peer: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  self: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  system: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const endorserTypeIcons = {
  ai_mentor: "🤖",
  human_mentor: "👤",
  peer: "🤝",
  self: "🪞",
  system: "⚙️",
};

export function EndorsementBadge({ endorsement, className }: EndorsementBadgeProps) {
  const strengthPercentage = Math.round(endorsement.endorsement_strength * 100);
  const icon = endorserTypeIcons[endorsement.endorser_type];

  return (
    <Card className={cn("group hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-tight truncate">
                {endorsement.competency_name}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {endorsement.proficiency_endorsed}
              </p>
            </div>
            <div className="text-lg flex-shrink-0">{icon}</div>
          </div>

          {/* Endorser */}
          <div>
            <Badge
              variant="secondary"
              className={cn("text-xs", endorserTypeColors[endorsement.endorser_type])}
            >
              {endorsement.endorser_display}
            </Badge>
          </div>

          {/* Strength indicator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Endorsement strength</span>
              <span className="font-medium">{strengthPercentage}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all rounded-full",
                  strengthPercentage >= 80 && "bg-gradient-to-r from-green-400 to-green-600",
                  strengthPercentage >= 60 &&
                    strengthPercentage < 80 &&
                    "bg-gradient-to-r from-blue-400 to-blue-600",
                  strengthPercentage < 60 && "bg-gradient-to-r from-amber-400 to-amber-600"
                )}
                style={{ width: `${strengthPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface EndorsementListProps {
  endorsements: Endorsement[];
  className?: string;
}

export function EndorsementList({ endorsements, className }: EndorsementListProps) {
  if (endorsements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No endorsements yet. Keep building your skills!
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {endorsements.map((endorsement) => (
        <EndorsementBadge key={endorsement.id} endorsement={endorsement} />
      ))}
    </div>
  );
}
