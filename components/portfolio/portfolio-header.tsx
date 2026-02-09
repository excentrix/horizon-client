"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Award, FileCheck, Eye, TrendingUp } from "lucide-react";

interface PortfolioStatsProps {
  totalArtifacts: number;
  verifiedArtifacts: number;
  featuredCount: number;
  viewCount?: number;
  proficientCompetencies?: number;
  className?: string;
}

export function PortfolioHeader({
  totalArtifacts,
  verifiedArtifacts,
  featuredCount,
  viewCount = 0,
  proficientCompetencies = 0,
  className,
}: PortfolioStatsProps) {
  const verificationRate =
    totalArtifacts > 0 ? Math.round((verifiedArtifacts / totalArtifacts) * 100) : 0;

  const stats = [
    {
      label: "Total Artifacts",
      value: totalArtifacts,
      icon: FileCheck,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Verified",
      value: verifiedArtifacts,
      subtext: `${verificationRate}% verified`,
      icon: Award,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Featured",
      value: featuredCount,
      icon: TrendingUp,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Profile Views",
      value: viewCount,
      icon: Eye,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  return (
    <div className={className}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                    {stat.subtext && (
                      <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                    )}
                  </div>
                  <div className={`rounded-lg p-2.5 ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {proficientCompetencies > 0 && (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-3">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">{proficientCompetencies}</div>
                <p className="text-sm text-muted-foreground">
                  Competencies at proficient level or above
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
