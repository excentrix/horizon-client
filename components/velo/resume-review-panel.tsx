"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ResumeReviewPanelProps {
  projects: Array<Record<string, unknown>>;
  onProjectsChange: (projects: Array<Record<string, unknown>>) => void;
  onUseFlagship: (project: Record<string, unknown>) => void;
}

export function ResumeReviewPanel({
  projects,
  onProjectsChange,
  onUseFlagship,
}: ResumeReviewPanelProps) {
  if (!projects.length) {
    return null;
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <p className="text-sm font-medium">Review extracted projects</p>
      {projects.slice(0, 3).map((project, index) => (
        <div key={`resume-project-${index}`} className="space-y-2 rounded-md border p-3">
          <Input
            value={String(project.title || "")}
            onChange={(event) =>
              onProjectsChange(
                projects.map((item, idx) =>
                  idx === index ? { ...item, title: event.target.value } : item
                )
              )
            }
            placeholder="Project title"
          />
          <Input
            value={String(project.repo_url || project.github_url || "")}
            onChange={(event) =>
              onProjectsChange(
                projects.map((item, idx) =>
                  idx === index ? { ...item, repo_url: event.target.value } : item
                )
              )
            }
            placeholder="GitHub / artifact URL"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onUseFlagship(project)}
          >
            Use as flagship
          </Button>
        </div>
      ))}
    </div>
  );
}
