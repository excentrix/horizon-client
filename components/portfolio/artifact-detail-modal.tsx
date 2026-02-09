"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Lightbulb, Send } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface ArtifactDetail {
  id: string;
  title: string;
  description: string;
  artifact_type: string;
  url?: string;
  content?: string;
  verification_status: string;
  verification_score?: number;
  verification_summary?: {
    status: string;
    score: number;
    verified_at: string;
    strengths: string[];
    suggestions: string[];
  };
  demonstrated_competencies?: Array<{
    competency: {
      name: string;
      category: string;
    };
    demonstration_level: string;
    evidence_quality_score: number;
  }>;
  reflection?: string;
  reflection_prompt?: string;
  reflection_submitted_at?: string;
  visibility: string;
  featured: boolean;
  tags?: string[];
  created_at: string;
}

interface ArtifactDetailModalProps {
  artifact: ArtifactDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReflectionSubmit?: (artifactId: string, reflection: string) => Promise<void>;
}

export function ArtifactDetailModal({
  artifact,
  open,
  onOpenChange,
  onReflectionSubmit,
}: ArtifactDetailModalProps) {
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!artifact) return null;

  const handleReflectionSubmit = async () => {
    if (!reflection.trim()) {
      toast.error("Please write a reflection before submitting");
      return;
    }

    setSubmitting(true);
    try {
      await onReflectionSubmit?.(artifact.id, reflection);
      toast.success("Reflection saved successfully!");
      setReflection("");
    } catch {
      toast.error("Failed to save reflection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{artifact.title}</DialogTitle>
              <DialogDescription className="mt-2">
                {artifact.description || "No description provided"}
              </DialogDescription>
            </div>
            {artifact.featured && (
              <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500">
                ⭐ Featured
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Type: {artifact.artifact_type}</Badge>
            <Badge variant="outline">Visibility: {artifact.visibility}</Badge>
            {artifact.tags?.map((tag, i) => (
              <Badge key={i} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Verification Summary */}
          {artifact.verification_summary && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Verification Results</h3>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                >
                  Score: {Math.round(artifact.verification_summary.score * 100)}%
                </Badge>
              </div>

              {artifact.verification_summary.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">✓ Strengths</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {artifact.verification_summary.strengths.map((strength, i) => (
                      <li key={i}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {artifact.verification_summary.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">💡 Suggestions</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {artifact.verification_summary.suggestions.map((suggestion, i) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Competencies */}
          {artifact.demonstrated_competencies && artifact.demonstrated_competencies.length > 0 && (
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="font-semibold">Competencies Demonstrated</h3>
              <div className="grid gap-3">
                {artifact.demonstrated_competencies.map((comp, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{comp.competency.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {comp.competency.category}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {comp.demonstration_level}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {Math.round(comp.evidence_quality_score * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {artifact.url && (
            <div>
              <Link
                href={artifact.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View original artifact
              </Link>
            </div>
          )}

          <Separator />

          {/* Reflection Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold">Reflection</h3>
            </div>

            {artifact.reflection ? (
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm whitespace-pre-wrap">{artifact.reflection}</p>
                {artifact.reflection_submitted_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted on{" "}
                    {new Date(artifact.reflection_submitted_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {artifact.reflection_prompt && (
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-sm">
                    <p className="text-blue-900 dark:text-blue-200 italic">
                      {artifact.reflection_prompt}
                    </p>
                  </div>
                )}
                <Textarea
                  placeholder="Share what you learned, challenges you faced, and how you grew..."
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <Button
                  onClick={handleReflectionSubmit}
                  disabled={submitting || !reflection.trim()}
                  className="w-full sm:w-auto"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Saving..." : "Submit Reflection"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
