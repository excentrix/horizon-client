"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Link2, FileText, Github, Globe, Search, ShieldCheck, Clock, Filter
} from "lucide-react";
import type { PortfolioArtifact } from "@/types";
import { formatDistanceToNow } from "date-fns";

interface ProofGalleryProps {
  artifacts: PortfolioArtifact[];
  isLoading?: boolean;
  className?: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  link:       <Link2 className="h-4 w-4" />,
  file:       <FileText className="h-4 w-4" />,
  github:     <Github className="h-4 w-4" />,
  demo:       <Globe className="h-4 w-4" />,
  text:       <FileText className="h-4 w-4" />,
};

const VERIFICATION_STYLES: Record<string, { label: string; className: string }> = {
  verified:       { label: "Verified",       className: "border-emerald-400 bg-emerald-50 text-emerald-700" },
  human_verified: { label: "Expert Verified",className: "border-violet-400 bg-violet-50 text-violet-700"   },
  pending:        { label: "Pending",        className: "border-amber-400 bg-amber-50 text-amber-700"     },
  rejected:       { label: "Rejected",       className: "border-red-400 bg-red-50 text-red-700"           },
  unverified:     { label: "Unverified",     className: "border-slate-300 bg-slate-50 text-slate-600"     },
};

type FilterType = "all" | "verified" | "unverified";

export function ProofGallery({ artifacts, isLoading, className }: ProofGalleryProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = artifacts.filter((a) => {
    const matchesQuery =
      !query ||
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      (a.description?.toLowerCase().includes(query.toLowerCase()) ?? false) ||
      (a.tags?.some((s: string) =>
        s.toLowerCase().includes(query.toLowerCase())
      ) ?? false);

    const matchesFilter =
      filter === "all" ||
      (filter === "verified" &&
        ["verified", "human_verified"].includes(a.verification_status ?? "")) ||
      (filter === "unverified" &&
        !["verified", "human_verified"].includes(a.verification_status ?? ""));

    return matchesQuery && matchesFilter;
  });

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Proof Gallery
        </CardTitle>
        <CardDescription>
          {artifacts.length} verified work artifact{artifacts.length === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, skill…"
              className="pl-9 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(["all", "verified", "unverified"] as FilterType[]).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                className="capitalize text-xs h-8 px-3"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Filter className="h-8 w-8 opacity-40" />
            <p className="text-sm">
              {artifacts.length === 0
                ? "Submit task proofs to build your gallery."
                : "No artifacts match your filter."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((artifact) => {
              const vs = VERIFICATION_STYLES[artifact.verification_status ?? "unverified"] ?? VERIFICATION_STYLES.unverified;
              const icon = TYPE_ICONS[artifact.artifact_type ?? "file"] ?? TYPE_ICONS.file;
              const isVerified = ["verified", "human_verified"].includes(
                artifact.verification_status ?? ""
              );

              return (
                <a
                  key={artifact.id}
                  href={artifact.url || undefined}
                  target={artifact.url ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className={`group flex flex-col gap-2 rounded-lg border p-3 transition-all hover:shadow-md ${
                    isVerified
                      ? "border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white hover:border-emerald-300"
                      : "border-border hover:border-violet-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-muted-foreground ${isVerified ? "text-emerald-600" : ""}`}>
                        {icon}
                      </span>
                      <p className="line-clamp-1 text-sm font-medium group-hover:text-violet-700">
                        {artifact.title}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${vs.className}`}>
                      {vs.label}
                    </span>
                  </div>

                  {artifact.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {artifact.description}
                    </p>
                  )}

                  {/* Tags / Skills */}
                  {artifact.tags?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {artifact.tags.slice(0, 3).map((s: string) => (
                        <span
                          key={s}
                          className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {artifact.created_at && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(artifact.created_at), { addSuffix: true })}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
