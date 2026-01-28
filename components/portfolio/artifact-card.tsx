"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileText, Link as LinkIcon, Code, BookOpen, Award, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ArtifactCardProps {
  id: string;
  title: string;
  description: string;
  artifactType: "link" | "file" | "text" | "repo" | "case_study" | "project" | "demo";
  url?: string;
  verificationStatus: "pending" | "verified" | "human_verified" | "rejected" | "needs_revision";
  verificationScore?: number;
  visibility: "private" | "mentors" | "employers" | "public";
  featured: boolean;
  tags?: string[];
  createdAt: string;
  className?: string;
  onClick?: () => void;
}

const artifactTypeIcons = {
  link: LinkIcon,
  file: FileText,
  text: FileText,
  repo: Code,
  case_study: BookOpen,
  project: Award,
  demo: Code,
};

const verificationColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  verified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  human_verified: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  needs_revision: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const visibilityIcons = {
  private: "🔒",
  mentors: "👥",
  employers: "💼",
  public: "🌐",
};

export function ArtifactCard({
  id,
  title,
  description,
  artifactType,
  url,
  verificationStatus,
  verificationScore,
  visibility,
  featured,
  tags = [],
  createdAt,
  className,
  onClick,
}: ArtifactCardProps) {
  const Icon = artifactTypeIcons[artifactType];
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]",
        featured && "ring-2 ring-primary ring-offset-2",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Featured badge */}
      {featured && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500">
            ⭐ Featured
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {title}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-muted-foreground">{formattedDate}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs">{visibilityIcons[visibility]}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {description || "No description provided."}
        </p>

        {/* Verification status */}
        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="secondary"
            className={cn("text-xs font-medium", verificationColors[verificationStatus])}
          >
            {verificationStatus === "verified" && "✓ AI Verified"}
            {verificationStatus === "human_verified" && "✓ Human Verified"}
            {verificationStatus === "pending" && "⏳ Pending"}
            {verificationStatus === "rejected" && "✗ Rejected"}
            {verificationStatus === "needs_revision" && "⚠ Needs Revision"}
          </Badge>
          {verificationScore !== undefined && verificationScore > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-24 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                  style={{ width: `${verificationScore * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {Math.round(verificationScore * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 4}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      {url && (
        <CardFooter className="pt-0">
          <Link
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View artifact
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
