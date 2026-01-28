"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Eye } from "lucide-react";
import Link from "next/link";

import { ArtifactGrid } from "@/components/portfolio/artifact-grid";
import { ArtifactDetailModal } from "@/components/portfolio/artifact-detail-modal";
import { CompetencyChart } from "@/components/portfolio/competency-chart";
import { GrowthTimeline } from "@/components/portfolio/growth-timeline";
import { PortfolioHeader } from "@/components/portfolio/portfolio-header";
import { EndorsementList } from "@/components/portfolio/endorsement-badge";

import {
  usePortfolioArtifacts,
  usePortfolioProfile,
  useGrowthTimeline,
  useAddReflection,
} from "@/hooks/use-portfolio";
import { useRouter } from "next/navigation";

export default function PortfolioPage() {
  const router = useRouter();
  const [selectedArtifact, setSelectedArtifact] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Queries
  const { data: artifacts = [], isLoading: artifactsLoading } = usePortfolioArtifacts();
  const { data: profileData, isLoading: profileLoading } = usePortfolioProfile();
  const { data: timelineData, isLoading: timelineLoading } = useGrowthTimeline(90);

  // Mutations
  const { mutateAsync: addReflection, isPending: reflectionPending } = useAddReflection();

  const handleArtifactClick = async (artifact: any) => {
    // Fetch full details if needed (for now using artifact data directly)
    setSelectedArtifact(artifact);
    setDetailModalOpen(true);
  };

  const handleReflectionSubmit = async (artifactId: string, reflection: string) => {
    await addReflection({ artifactId, reflection });
    // Refresh artifact details
    setDetailModalOpen(false);
  };

  const profile = profileData?.profile;
  const verifiedCount = artifacts.filter((a: any) =>
    ["verified", "human_verified"].includes(a.verification_status)
  ).length;
  const featuredCount = artifacts.filter((a: any) => a.featured).length;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">My Portfolio</h1>
          <p className="text-muted-foreground mt-2">
            Showcase your learning journey and achievements
          </p>
        </div>
        <div className="flex gap-2">
          {profile?.is_public && (
            <Button variant="outline" asChild>
              <Link href={`/p/${profile.slug}`} target="_blank">
                <Eye className="h-4 w-4 mr-2" />
                View Public
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/portfolio/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href="/portfolio/create">
              <Plus className="h-4 w-4 mr-2" />
              New Artifact
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <PortfolioHeader
        totalArtifacts={artifacts.length}
        verifiedArtifacts={verifiedCount}
        featuredCount={featuredCount}
        viewCount={profile?.view_count || 0}
        proficientCompetencies={profile?.verified_artifacts || 0}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="artifacts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="competencies">Competencies</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="endorsements">Endorsements</TabsTrigger>
        </TabsList>

        {/* Artifacts Tab */}
        <TabsContent value="artifacts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Artifacts</CardTitle>
              <CardDescription>
                Work products that demonstrate your skills and competencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {artifactsLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading artifacts...
                </div>
              ) : (
                <ArtifactGrid artifacts={artifacts} onArtifactClick={handleArtifactClick} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competencies Tab */}
        <TabsContent value="competencies" className="space-y-6">
          <CompetencyChart
            competencies={timelineData?.competency_chart?.competencies || []}
          />
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <GrowthTimeline milestones={timelineData?.timeline || []} />
        </TabsContent>

        {/* Endorsements Tab */}
        <TabsContent value="endorsements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skill Endorsements</CardTitle>
              <CardDescription>
                Recognition from AI mentors, peers, and human mentors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EndorsementList endorsements={[]} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Artifact Detail Modal */}
      <ArtifactDetailModal
        artifact={selectedArtifact}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onReflectionSubmit={handleReflectionSubmit}
      />
    </div>
  );
}
