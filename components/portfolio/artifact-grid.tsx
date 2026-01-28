"use client";

import { useState } from "react";
import { ArtifactCard } from "./artifact-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Grid3x3, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface Artifact {
  id: string;
  title: string;
  description: string;
  artifact_type: "link" | "file" | "text" | "repo" | "case_study" | "project" | "demo";
  url?: string;
  verification_status: "pending" | "verified" | "human_verified" | "rejected" | "needs_revision";
  verification_score?: number;
  visibility: "private" | "mentors" | "employers" | "public";
  featured: boolean;
  tags?: string[];
  created_at: string;
}

interface ArtifactGridProps {
  artifacts: Artifact[];
  onArtifactClick?: (artifact: Artifact) => void;
  showFilters?: boolean;
}

export function ArtifactGrid({
  artifacts,
  onArtifactClick,
  showFilters = true,
}: ArtifactGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter artifacts
  const filteredArtifacts = artifacts.filter((artifact) => {
    const matchesSearch =
      artifact.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artifact.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || artifact.artifact_type === filterType;
    const matchesStatus =
      filterStatus === "all" || artifact.verification_status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort: featured first, then by created_at
  const sortedArtifacts = [...filteredArtifacts].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search artifacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Type" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="case_study">Case Study</SelectItem>
              <SelectItem value="demo">Demo</SelectItem>
              <SelectItem value="repo">Repository</SelectItem>
              <SelectItem value="link">Link</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="file">File</SelectItem>
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="human_verified">Human Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="needs_revision">Needs Revision</SelectItem>
            </SelectContent>
          </Select>

          {/* View mode toggle */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 px-3"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {sortedArtifacts.length} {sortedArtifacts.length === 1 ? "artifact" : "artifacts"}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Grid/List */}
      {sortedArtifacts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-2">No artifacts found</div>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search or filters"
              : "Create your first artifact to get started"}
          </p>
        </div>
      ) : (
        <div
          className={cn(
            viewMode === "grid" &&
              "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
            viewMode === "list" && "flex flex-col gap-3"
          )}
        >
          {sortedArtifacts.map((artifact) => (
            <ArtifactCard
              key={artifact.id}
              id={artifact.id}
              title={artifact.title}
              description={artifact.description}
              artifactType={artifact.artifact_type}
              url={artifact.url}
              verificationStatus={artifact.verification_status}
              verificationScore={artifact.verification_score}
              visibility={artifact.visibility}
              featured={artifact.featured}
              tags={artifact.tags}
              createdAt={artifact.created_at}
              onClick={() => onArtifactClick?.(artifact)}
              className={cn(viewMode === "list" && "hover:bg-accent/50")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
