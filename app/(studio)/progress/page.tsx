"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMirrorSnapshot } from "@/hooks/use-mirror-snapshot";
import { useGamificationStats } from "@/hooks/use-gamification";
import { useReadiness } from "@/hooks/use-portfolio";
import { usePortfolioArtifacts, usePortfolioProfile } from "@/hooks/use-portfolio";
import { useLocalQrCode } from "@/hooks/use-local-qr";
import { VeloProfileTab } from "@/components/mirror/velo-profile-tab";
import { PortfolioVaultTab } from "@/components/mirror/portfolio-vault-tab";
import { MomentumTab } from "@/components/mirror/momentum-tab";
import {
  Scan,
  Briefcase,
  Zap,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Info,
} from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import Link from "next/link";

// ─── status config ────────────────────────────────────────────────────────────

type MirrorStatus = "empty" | "running" | "ready" | "failed";

const statusConfig: Record<
  MirrorStatus,
  { label: string; variant: "default" | "secondary" | "destructive"; pulse?: boolean }
> = {
  ready: { label: "Analysis Ready", variant: "default" },
  running: { label: "Analyzing…", variant: "secondary", pulse: true },
  empty: { label: "Pending", variant: "secondary", pulse: true },
  failed: { label: "Analysis Failed", variant: "destructive" },
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ProgressHubPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const { data: mirrorData } = useMirrorSnapshot();
  const { totalPoints, level, currentStreak } = useGamificationStats();
  const { data: readiness } = useReadiness();
  const { data: profileData } = usePortfolioProfile();
  const { data: artifacts = [] } = usePortfolioArtifacts();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, router, user]);

  const mirrorStatus = (mirrorData?.status ?? "empty") as MirrorStatus;
  const statusCfg = statusConfig[mirrorStatus];

  const profile = profileData?.profile;
  const verifiedCount = artifacts.filter(
    (a) => a.verification_status === "verified" || a.verification_status === "human_verified",
  ).length;
  const featuredCount = artifacts.filter((a) => a.featured).length;

  const publicUrl = useMemo(() => {
    if (!profile?.slug || typeof window === "undefined") return "";
    return `${window.location.origin}/p/${profile.slug}`;
  }, [profile?.slug]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b bg-background">
        {/* Fine grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: [
              "repeating-linear-gradient(0deg, transparent, transparent 23px, currentColor 23px, currentColor 24px)",
              "repeating-linear-gradient(90deg, transparent, transparent 23px, currentColor 23px, currentColor 24px)",
            ].join(","),
          }}
        />

        <div className="relative px-6 pb-5 pt-6">
          <div className="flex flex-col gap-4">

            {/* Row 1: title + VELO brand */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className="flex cursor-pointer select-none items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 transition-colors hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50">
                        <Scan className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">
                          VELO
                        </span>
                        <Info className="h-3 w-3 text-blue-500 dark:text-blue-500" />
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80" align="start">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">Verification Engine for Learning Outcomes</p>
                        <p className="text-xs text-muted-foreground">
                          VELO uses AI to deeply analyse your resume — scoring ATS compatibility,
                          mapping skill gaps to your target role, rating each job and project entry
                          for impact, and generating a prioritised action plan to strengthen your profile.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Upload a resume to get your full analysis. Results update automatically
                          as you complete tasks and add portfolio evidence.
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Your Mirror</h1>
                <p className="text-sm text-muted-foreground">
                  Resume intelligence, verified evidence &amp; your momentum — all in one place.
                </p>
              </div>

              {/* Quick stats: readiness + XP + level + streak */}
              <div className="flex flex-wrap items-center gap-2">
                {readiness && (
                  <div className="flex min-w-[72px] flex-col items-center rounded-xl border bg-card px-3 py-2">
                    <span className="text-xl font-bold">{Math.round(readiness.score)}%</span>
                    <span className="text-[10px] text-muted-foreground">{readiness.label}</span>
                  </div>
                )}
                <div className="flex min-w-[64px] flex-col items-center rounded-xl border bg-card px-3 py-2">
                  <span className="text-xl font-bold">{totalPoints.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground">XP</span>
                </div>
                <div className="flex min-w-[64px] flex-col items-center rounded-xl border bg-card px-3 py-2">
                  <span className="text-xl font-bold">Lv {level}</span>
                  <span className="text-[10px] text-muted-foreground">Level</span>
                </div>
                {currentStreak > 0 && (
                  <div className="flex min-w-[64px] flex-col items-center rounded-xl border bg-card px-3 py-2">
                    <span className="text-xl font-bold">🔥 {currentStreak}</span>
                    <span className="text-[10px] text-muted-foreground">streak</span>
                  </div>
                )}
                <Badge variant={statusCfg.variant} className="self-center">
                  {statusCfg.pulse && (
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  )}
                  {statusCfg.label}
                </Badge>
              </div>
            </div>

            {/* Row 2: Horizon Verified Learner strip */}
            <HorizonVerifiedStrip
              verifiedCount={verifiedCount}
              featuredCount={featuredCount}
              profile={profile}
              publicUrl={publicUrl}
            />
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="velo" className="flex w-full flex-1 flex-col min-h-0">
        <div className="border-b bg-background px-6">
          <TabsList className="h-auto space-x-4 bg-transparent p-0">
            {[
              { value: "velo", label: "VELO Profile", icon: <Scan className="h-3.5 w-3.5" /> },
              {
                value: "portfolio",
                label: "Portfolio & Evidence",
                icon: <Briefcase className="h-3.5 w-3.5" />,
              },
              { value: "momentum", label: "Momentum", icon: <Zap className="h-3.5 w-3.5" /> },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 rounded-none px-1 pb-3 pt-3 font-medium text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="w-full flex-1 overflow-y-auto bg-muted/10">
          <TabsContent value="velo" className="mt-0 w-full outline-none focus-visible:ring-0">
            <VeloProfileTab />
          </TabsContent>
          <TabsContent
            value="portfolio"
            className="mt-0 w-full outline-none focus-visible:ring-0"
          >
            <PortfolioVaultTab />
          </TabsContent>
          <TabsContent
            value="momentum"
            className="mt-0 w-full outline-none focus-visible:ring-0"
          >
            <MomentumTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ─── Horizon Verified Learner strip ──────────────────────────────────────────

interface ProfileShape {
  slug?: string;
  is_public?: boolean;
  view_count?: number;
}

function HorizonVerifiedStrip({
  verifiedCount,
  featuredCount,
  profile,
  publicUrl,
}: {
  verifiedCount: number;
  featuredCount: number;
  profile: ProfileShape | undefined;
  publicUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const { qrDataUrl, qrError } = useLocalQrCode(publicUrl);

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 text-white dark:border-slate-700">
      {/* Left: verified learner badge */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
            Horizon Verified Learner
          </p>
          <p className="text-sm font-semibold text-white">
            {verifiedCount} verified artifact{verifiedCount !== 1 ? "s" : ""} ·{" "}
            {featuredCount} featured
          </p>
        </div>
      </div>

      {/* Right: share actions */}
      <div className="flex items-center gap-2">
        {profile?.is_public ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 border border-white/20 text-xs text-white/80 hover:bg-white/10 hover:text-white"
              onClick={copyLink}
              disabled={!publicUrl}
            >
              {copied ? (
                <Check className="mr-1.5 h-3 w-3 text-emerald-300" />
              ) : (
                <Copy className="mr-1.5 h-3 w-3" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 border border-white/20 text-xs text-white/80 hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href={publicUrl} target="_blank">
                <ExternalLink className="mr-1.5 h-3 w-3" />
                View public
              </Link>
            </Button>
            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 border border-white/20 p-0 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <QrCode className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Share your portfolio</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-1">
                  <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl border bg-muted/30">
                    {qrDataUrl ? (
                      <Image
                        src={qrDataUrl}
                        alt="Portfolio share QR code"
                        width={192}
                        height={192}
                        unoptimized
                        className="h-48 w-48 rounded-lg"
                      />
                    ) : (
                      <p className="px-4 text-center text-xs text-muted-foreground">
                        {qrError
                          ? "Could not generate QR code locally. Use copy link instead."
                          : "Enable your public portfolio to generate a QR code."}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={copyLink} disabled={!publicUrl}>
                      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy link"}
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/settings/portfolio">Manage sharing</Link>
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 border border-white/20 text-xs text-white/80 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href="/settings/portfolio">
              Enable public profile →
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
