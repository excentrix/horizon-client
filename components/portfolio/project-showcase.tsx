"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Star, GitFork, Code2, Github } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ProjectShowcaseProps {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  github_url?: string;
  demo_url?: string;
  tech_stack?: string[];
  github_stats?: {
    stars: number;
    forks: number;
    language: string;
  };
  featured: boolean;
  onClick?: () => void;
}

export function ProjectShowcaseCard({
  title,
  description,
  thumbnail,
  github_url,
  demo_url,
  tech_stack = [],
  github_stats,
  featured,
  onClick,
}: ProjectShowcaseProps) {
  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all hover:shadow-xl hover:scale-[1.02]",
        featured && "ring-2 ring-primary ring-offset-2",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      {/* Thumbnail */}
      {thumbnail ? (
        <div className="relative aspect-video overflow-hidden bg-muted">
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {featured && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                ⭐ Featured
              </Badge>
            </div>
          )}
        </div>
      ) : (
        <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Code2 className="h-16 w-16 text-muted-foreground opacity-20" />
          {featured && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                ⭐ Featured
              </Badge>
            </div>
          )}
        </div>
      )}

      <CardContent className="p-5 space-y-4">
        {/* Title & Description */}
        <div>
          <h3 className="font-semibold text-lg leading-tight mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        </div>

        {/* GitHub Stats */}
        {github_stats && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-current text-yellow-500" />
              <span>{github_stats.stars}</span>
            </div>
            <div className="flex items-center gap-1">
              <GitFork className="h-3.5 w-3.5" />
              <span>{github_stats.forks}</span>
            </div>
            {github_stats.language && (
              <>
                <span>•</span>
                <span className="font-medium">{github_stats.language}</span>
              </>
            )}
          </div>
        )}

        {/* Tech Stack */}
        {tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tech_stack.slice(0, 4).map((tech, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tech}
              </Badge>
            ))}
            {tech_stack.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{tech_stack.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {github_url && (
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link
                href={github_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Github className="h-4 w-4 mr-1.5" />
                Code
              </Link>
            </Button>
          )}
          {demo_url && (
            <Button size="sm" asChild className="flex-1">
              <Link
                href={demo_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Demo
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ProjectShowcaseGridProps {
  projects: Array<Omit<ProjectShowcaseProps, "onClick">>;
  onProjectClick?: (project: Omit<ProjectShowcaseProps, "onClick">) => void;
  className?: string;
}

export function ProjectShowcaseGrid({
  projects,
  onProjectClick,
  className,
}: ProjectShowcaseGridProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No projects yet</p>
        <p className="text-sm mt-1">Build and showcase your work</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
      {projects.map((project) => (
        <ProjectShowcaseCard
          key={project.id}
          {...project}
          onClick={() => onProjectClick?.(project)}
        />
      ))}
    </div>
  );
}
