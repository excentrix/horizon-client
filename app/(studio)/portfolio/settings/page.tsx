"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { usePortfolioProfile } from "@/hooks/use-portfolio";
import { portfolioApi } from "@/lib/api";
import { toast } from "sonner";

export default function PortfolioSettingsPage() {
  const { data: profileData, isLoading } = usePortfolioProfile();
  const profile = profileData?.profile;

  const [formData, setFormData] = useState({
    headline: profile?.headline || "",
    bio: profile?.bio || "",
    github_url: profile?.github_url || "",
    linkedin_url: profile?.linkedin_url || "",
    portfolio_url: profile?.portfolio_url || "",
    twitter_url: profile?.twitter_url || "",
    is_public: profile?.is_public || false,
    show_competency_chart: profile?.show_competency_chart ?? true,
    show_growth_timeline: profile?.show_growth_timeline ?? true,
    show_learning_stats: profile?.show_learning_stats ?? true,
  });

  const [saving, setSaving] = useState(false);
  const publicUrl = useMemo(() => {
    if (!profile?.slug || typeof window === "undefined") return "";
    return `${window.location.origin}/p/${profile.slug}`;
  }, [profile?.slug]);

  useEffect(() => {
    if (!profile) return;
    setFormData({
      headline: profile.headline || "",
      bio: profile.bio || "",
      github_url: profile.github_url || "",
      linkedin_url: profile.linkedin_url || "",
      portfolio_url: profile.portfolio_url || "",
      twitter_url: profile.twitter_url || "",
      is_public: profile.is_public || false,
      show_competency_chart: profile.show_competency_chart ?? true,
      show_growth_timeline: profile.show_growth_timeline ?? true,
      show_learning_stats: profile.show_learning_stats ?? true,
    });
  }, [profile?.id]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!profile?.id) {
        throw new Error("Missing profile id");
      }
      await portfolioApi.updateProfile(profile.id, formData);

      toast.success("Portfolio settings saved!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/portfolio">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Settings</h1>
          <p className="text-muted-foreground">
            Customize your professional portfolio
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="ml-auto">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Your headline and bio will be displayed on your public portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headline">Professional Headline</Label>
            <Input
              id="headline"
              placeholder="e.g., Full-Stack Developer | React & Node.js Specialist"
              value={formData.headline}
              onChange={(e) => handleChange("headline", e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {formData.headline.length}/100 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell employers about yourself, your skills, and what you're looking for..."
              value={formData.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {formData.bio.length}/500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
          <CardDescription>
            Connect your professional profiles to showcase your work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="github">GitHub Profile</Label>
            <Input
              id="github"
              type="url"
              placeholder="https://github.com/username"
              value={formData.github_url}
              onChange={(e) => handleChange("github_url", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn Profile</Label>
            <Input
              id="linkedin"
              type="url"
              placeholder="https://linkedin.com/in/username"
              value={formData.linkedin_url}
              onChange={(e) => handleChange("linkedin_url", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio">Personal Portfolio</Label>
            <Input
              id="portfolio"
              type="url"
              placeholder="https://yoursite.com"
              value={formData.portfolio_url}
              onChange={(e) => handleChange("portfolio_url", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter/X Profile</Label>
            <Input
              id="twitter"
              type="url"
              placeholder="https://twitter.com/username"
              value={formData.twitter_url}
              onChange={(e) => handleChange("twitter_url", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Visibility</CardTitle>
          <CardDescription>
            Control who can see your portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public">Public Portfolio</Label>
              <p className="text-sm text-muted-foreground">
                Make your portfolio visible to anyone with the link
              </p>
            </div>
            <Switch
              id="public"
              checked={formData.is_public}
              onCheckedChange={(checked) => handleChange("is_public", checked)}
            />
          </div>

          {formData.is_public && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>Your public portfolio URL:</strong>
                <br />
                <code className="text-xs">
                  {publicUrl || "Enable public portfolio to generate link"}
                </code>
              </p>
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Display Sections</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-competencies">Skills & Competencies Chart</Label>
                <p className="text-sm text-muted-foreground">
                  Show your skill progression radar chart
                </p>
              </div>
              <Switch
                id="show-competencies"
                checked={formData.show_competency_chart}
                onCheckedChange={(checked) =>
                  handleChange("show_competency_chart", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-timeline">Growth Timeline</Label>
                <p className="text-sm text-muted-foreground">
                  Display your learning milestones and achievements
                </p>
              </div>
              <Switch
                id="show-timeline"
                checked={formData.show_growth_timeline}
                onCheckedChange={(checked) => handleChange("show_growth_timeline", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-stats">Learning Statistics</Label>
                <p className="text-sm text-muted-foreground">
                  Show completion stats and engagement metrics
                </p>
              </div>
              <Switch
                id="show-stats"
                checked={formData.show_learning_stats}
                onCheckedChange={(checked) => handleChange("show_learning_stats", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO & Advanced */}
      <Card>
        <CardHeader>
          <CardTitle>SEO & Sharing</CardTitle>
          <CardDescription>
            Optimize how your portfolio appears when shared
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            SEO optimization features will be available soon. Your portfolio will automatically
            use your headline and bio for meta descriptions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
