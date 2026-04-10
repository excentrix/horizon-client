"use client";

import { useState, useEffect } from "react";
import { http } from "@/lib/http-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Globe, Github, Linkedin, Twitter, ExternalLink, Eye, EyeOff,
  Save, Loader2, Copy, Check, ArrowLeft, Palette, BarChart3,
} from "lucide-react";

interface PortfolioProfile {
  id: string;
  slug: string;
  headline: string;
  bio: string;
  theme: string;
  show_competency_chart: boolean;
  show_growth_timeline: boolean;
  show_learning_stats: boolean;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  twitter_url: string;
  is_public: boolean;
  allow_downloads: boolean;
  view_count: number;
  last_viewed_at: string | null;
}

const THEMES = [
  { value: "default",      label: "Default",      description: "Clean and modern" },
  { value: "minimal",      label: "Minimal",      description: "Content-first, distraction-free" },
  { value: "professional", label: "Professional", description: "Formatted for recruiters" },
  { value: "creative",     label: "Creative",     description: "Bold and expressive" },
];

export default function PortfolioSettingsPage() {
  const [profile, setProfile] = useState<PortfolioProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/p/${profile?.slug ?? ""}`
    : `/p/${profile?.slug ?? ""}`;

  useEffect(() => {
    http.get("/portfolio/profiles/my_profile/")
      .then((r) => setProfile(r.data?.profile ?? null))
      .catch(() => toast.error("Failed to load portfolio profile"))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof PortfolioProfile, value: PortfolioProfile[keyof PortfolioProfile]) =>
    setProfile((prev) => prev ? { ...prev, [key]: value } : prev);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { data } = await http.patch(`/portfolio/profiles/${profile.id}/`, {
        headline: profile.headline,
        bio: profile.bio,
        theme: profile.theme,
        show_competency_chart: profile.show_competency_chart,
        show_growth_timeline: profile.show_growth_timeline,
        show_learning_stats: profile.show_learning_stats,
        linkedin_url: profile.linkedin_url,
        github_url: profile.github_url,
        portfolio_url: profile.portfolio_url,
        twitter_url: profile.twitter_url,
        is_public: profile.is_public,
        allow_downloads: profile.allow_downloads,
      });
      setProfile(data);
      toast.success("Portfolio settings saved");
    } catch {
      toast.error("Failed to save portfolio settings");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Portfolio profile not found. Complete onboarding to create one.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <a href="/settings" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2 w-fit">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Settings
          </a>
          <h1 className="text-2xl font-bold tracking-tight">Public Portfolio</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Control your public presence and what recruiters and peers see
          </p>
        </div>

        {/* Visibility badge + link */}
        <div className="flex items-center gap-2">
          {profile.is_public ? (
            <Badge variant="default" className="gap-1">
              <Eye className="h-3 w-3" /> Public
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <EyeOff className="h-3 w-3" /> Private
            </Badge>
          )}
          {profile.is_public && (
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View Portfolio
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Analytics strip (when public) */}
      {profile.is_public && profile.view_count > 0 && (
        <div className="rounded-lg border bg-card px-4 py-3 flex items-center gap-6 text-sm">
          <div>
            <span className="font-semibold text-lg">{profile.view_count}</span>
            <span className="text-muted-foreground ml-1.5">portfolio views</span>
          </div>
          {profile.last_viewed_at && (
            <div className="text-muted-foreground">
              Last viewed {new Date(profile.last_viewed_at).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Visibility & sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> Visibility & Sharing
          </CardTitle>
          <CardDescription>Control whether your portfolio is publicly accessible</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Make portfolio public</p>
              <p className="text-xs text-muted-foreground">Anyone with the link can view your portfolio</p>
            </div>
            <Switch checked={profile.is_public} onCheckedChange={(v) => set("is_public", v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Allow PDF download</p>
              <p className="text-xs text-muted-foreground">Visitors can download your portfolio as a PDF</p>
            </div>
            <Switch checked={profile.allow_downloads} onCheckedChange={(v) => set("allow_downloads", v)} disabled={!profile.is_public} />
          </div>

          {profile.is_public && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Your portfolio link</Label>
                <div className="flex gap-2">
                  <Input value={publicUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={copyLink}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Headline & bio */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Content</CardTitle>
          <CardDescription>What visitors see on your portfolio page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Professional Headline</Label>
            <Input
              value={profile.headline}
              onChange={(e) => set("headline", e.target.value)}
              placeholder="Full-Stack Developer · AI Enthusiast · Final Year @ IIT"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{(profile.headline ?? "").length}/200</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Bio / Summary</Label>
            <Textarea
              rows={5}
              value={profile.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="A short paragraph about who you are, what you're working on, and what you're looking for…"
            />
          </div>
        </CardContent>
      </Card>

      {/* Social links */}
      <Card>
        <CardHeader>
          <CardTitle>Social & Contact Links</CardTitle>
          <CardDescription>Shown on your public profile and synced to account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "linkedin_url",   label: "LinkedIn",        icon: Linkedin,   placeholder: "https://linkedin.com/in/yourname" },
            { key: "github_url",     label: "GitHub",          icon: Github,     placeholder: "https://github.com/yourname" },
            { key: "twitter_url",    label: "X / Twitter",     icon: Twitter,    placeholder: "https://twitter.com/yourhandle" },
            { key: "portfolio_url",  label: "Personal Website", icon: Globe,     placeholder: "https://yoursite.dev" },
          ].map(({ key, label, icon: Icon, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" /> {label}
              </Label>
              <Input
                value={(profile[key as keyof PortfolioProfile] as string) ?? ""}
                onChange={(e) => set(key as keyof PortfolioProfile, e.target.value)}
                placeholder={placeholder}
                type="url"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Theme & sections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4" /> Appearance & Sections
          </CardTitle>
          <CardDescription>Customise the look and what sections to show</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Theme</Label>
            <div className="grid sm:grid-cols-2 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => set("theme", t.value)}
                  className={cn(
                    "rounded-lg border-2 p-3 text-left transition-colors",
                    profile.theme === t.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40"
                  )}
                >
                  <p className="font-medium text-sm">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" /> Visible Sections
            </p>
            {[
              { key: "show_competency_chart", label: "Competency Radar Chart", description: "AI-analysed skill levels across domains" },
              { key: "show_growth_timeline",   label: "Growth Timeline",        description: "Milestones and learning progress over time" },
              { key: "show_learning_stats",    label: "Learning Statistics",    description: "Tasks completed, streaks, plans finished" },
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={profile[key as keyof PortfolioProfile] as boolean}
                  onCheckedChange={(v) => set(key as keyof PortfolioProfile, v)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          {saving
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
            : <><Save className="mr-2 h-4 w-4" />Save Portfolio Settings</>}
        </Button>
      </div>
    </div>
  );
}
