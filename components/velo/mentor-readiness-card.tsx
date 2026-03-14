"use client";

import { Button } from "@/components/ui/button";

interface MentorReadinessCardProps {
  mentorContextStatus: string;
  roadmapEligibility: string;
  canGenerateRoadmap: boolean;
  onOpenMentor: () => void;
  onGenerateRoadmap: () => void;
}

export function MentorReadinessCard({
  mentorContextStatus,
  roadmapEligibility,
  canGenerateRoadmap,
  onOpenMentor,
  onGenerateRoadmap,
}: MentorReadinessCardProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1 text-sm">
        <p>
          Mentor context status: <span className="font-medium">{mentorContextStatus}</span>
        </p>
        <p>
          Roadmap eligibility: <span className="font-medium">{roadmapEligibility}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onOpenMentor}>Open Mentor Chat</Button>
        <Button
          variant="outline"
          disabled={!canGenerateRoadmap}
          onClick={onGenerateRoadmap}
        >
          Generate roadmap in chat
        </Button>
      </div>
    </div>
  );
}
