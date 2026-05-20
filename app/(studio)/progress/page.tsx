"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMirrorSnapshot } from "@/hooks/use-mirror-snapshot";
import { useGamificationStats } from "@/hooks/use-gamification";
import {
  useReadiness,
  usePortfolioArtifacts,
  usePortfolioProfile,
} from "@/hooks/use-portfolio";
import { useLocalQrCode } from "@/hooks/use-local-qr";
import { portfolioApi } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { VeloProfileTab } from "@/components/mirror/velo-profile-tab";
import { PortfolioVaultTab } from "@/components/mirror/portfolio-vault-tab";
import { MomentumTab } from "@/components/mirror/momentum-tab";
import {
  Briefcase,
  Check,
  Copy,
  Download,
  ExternalLink,
  Flame,
  Globe2,
  Linkedin,
  MessageCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
  Activity,
  TrendingUp,
  Lock,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type MirrorStatus = "empty" | "running" | "ready" | "failed";

const STATUS_DOT: Record<MirrorStatus, { color: string; label: string; pulse?: boolean }> = {
  ready: { color: "bg-emerald-500", label: "Analysis Ready" },
  running: { color: "bg-amber-500", label: "Analyzing", pulse: true },
  empty: { color: "bg-slate-400", label: "Pending", pulse: true },
  failed: { color: "bg-red-500", label: "Analysis Failed" },
};

export default function ProgressHubPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const { data: mirrorData } = useMirrorSnapshot();
  const { totalPoints, level, currentStreak } = useGamificationStats();
  const { data: readiness } = useReadiness();
  const { data: profileData } = usePortfolioProfile();
  const { data: rawArtifacts = [] } = usePortfolioArtifacts();

  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCardPreviewUrl, setShareCardPreviewUrl] = useState("");
  const [shareCardBusy, setShareCardBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, router, user]);

  const mirrorStatus = (mirrorData?.status ?? "empty") as MirrorStatus;
  const statusDot = STATUS_DOT[mirrorStatus];
  const profile = profileData?.profile;

  const artifacts = useMemo(() => {
    const statusPriority: Record<string, number> = {
      verified: 4,
      human_verified: 3,
      needs_review: 2,
      needs_revision: 1,
      pending: 0,
    };
    const best = new Map<string, (typeof rawArtifacts)[number]>();
    for (const artifact of rawArtifacts) {
      const key = artifact.source_task ?? null;
      if (!key) continue;
      const existing = best.get(key);
      if (
        !existing ||
        (statusPriority[artifact.verification_status ?? "pending"] ?? 0) >
          (statusPriority[existing.verification_status ?? "pending"] ?? 0)
      ) {
        best.set(key, artifact);
      }
    }
    return [...best.values(), ...rawArtifacts.filter((a) => !a.source_task)];
  }, [rawArtifacts]);

  const verifiedCount = artifacts.filter(
    (a) => a.verification_status === "verified" || a.verification_status === "human_verified",
  ).length;

  const publicUrl = useMemo(() => {
    if (!profile?.slug || typeof window === "undefined") return "";
    return `${window.location.origin}/p/${profile.slug}`;
  }, [profile?.slug]);

  const { qrDataUrl, qrError } = useLocalQrCode(publicUrl);
  const shareTitle = profile?.full_name
    ? `${profile.full_name} • Horizon Portfolio`
    : "Horizon Portfolio";
  const shareMessage =
    "I'm building verified skills on Horizon. Explore my public portfolio and create your own learning graph.";
  const usernameLabel =
    profile?.username || profile?.slug || user?.full_name || "horizon-learner";

  const shareUrlFor = (source: "whatsapp" | "linkedin" | "share") => {
    if (!publicUrl) return "";
    const url = new URL(publicUrl);
    url.searchParams.set("utm_source", source);
    url.searchParams.set("utm_medium", "social");
    url.searchParams.set("utm_campaign", "portfolio_share");
    return url.toString();
  };

  const handleCopy = async () => {
    const tracked = shareUrlFor("share") || publicUrl;
    if (!tracked) return;
    try {
      await navigator.clipboard.writeText(tracked);
    } catch {
      // Fallback for mobile browsers that block clipboard API without HTTPS / user gesture
      const el = document.createElement("textarea");
      el.value = tracked;
      el.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const buildShareCardBlob = async () => {
    if (!qrDataUrl) return null;
    const cardW = 760, cardH = 1000, qrSize = 560;
    const canvas = document.createElement("canvas");
    canvas.width = cardW;
    canvas.height = cardH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FAEDCD";
    ctx.fillRect(0, 0, cardW, cardH);
    ctx.strokeStyle = "rgba(88,88,204,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, cardW, cardH, 34);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath();
    ctx.roundRect(22, 22, cardW - 44, 220, 24);
    ctx.fill();

    const logo = new Image();
    await new Promise<void>((resolve, reject) => {
      logo.onload = () => resolve();
      logo.onerror = () => reject(new Error("Logo failed to load"));
      logo.src = "/icon.svg";
    });
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardW - 150, 80, 96, 96, 26);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
    ctx.drawImage(logo, cardW - 134, 98, 64, 64);
    ctx.restore();

    const avatarUrl = profile?.avatar_url || "";
    const avatarCx = 106, avatarCy = 126, avatarR = 54;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(88,88,204,0.14)";
    ctx.fill();
    if (avatarUrl) {
      try {
        const avatar = new Image();
        avatar.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          avatar.onload = () => resolve();
          avatar.onerror = () => reject(new Error("Avatar failed to load"));
          avatar.src = avatarUrl;
        });
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarCx, avatarCy, avatarR - 4, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarCx - avatarR, avatarCy - avatarR, avatarR * 2, avatarR * 2);
        ctx.restore();
      } catch { /* fallback to initials */ }
    }
    if (!avatarUrl) {
      const initials = (profile?.full_name || usernameLabel)
        .split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
      ctx.fillStyle = "#5858CC";
      ctx.font = "700 34px Space Mono, monospace";
      ctx.fillText(initials || "H", avatarCx - 12, avatarCy + 11);
    }
    ctx.restore();

    ctx.fillStyle = "#5858CC";
    ctx.font = "700 28px Space Mono, monospace";
    ctx.fillText("VELO", 190, 88);
    ctx.fillStyle = "#414141";
    ctx.font = "600 40px Space Mono, monospace";
    ctx.fillText(profile?.full_name || "Horizon Learner", 190, 138);
    ctx.fillStyle = "#5858CC";
    ctx.font = "600 26px Space Mono, monospace";
    ctx.fillText(`@${usernameLabel}`, 190, 178);

    ctx.fillStyle = "#efe0c9";
    ctx.strokeStyle = "rgba(88,88,204,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(72, 286, 616, 616, 24);
    ctx.fill();
    ctx.stroke();

    const qr = new Image();
    qr.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      qr.onload = () => resolve();
      qr.onerror = () => reject(new Error("QR image failed to load"));
      qr.src = qrDataUrl;
    });
    const qrCanvas = document.createElement("canvas");
    qrCanvas.width = qrSize;
    qrCanvas.height = qrSize;
    const qrCtx = qrCanvas.getContext("2d");
    if (!qrCtx) return null;
    qrCtx.drawImage(qr, 0, 0, qrSize, qrSize);
    const qrImageData = qrCtx.getImageData(0, 0, qrSize, qrSize);
    const pixels = qrImageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const luma = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      if (luma < 128) { pixels[i] = 88; pixels[i + 1] = 88; pixels[i + 2] = 204; pixels[i + 3] = 255; }
      else { pixels[i] = 239; pixels[i + 1] = 224; pixels[i + 2] = 201; pixels[i + 3] = 255; }
    }
    qrCtx.putImageData(qrImageData, 0, 0);
    ctx.drawImage(qrCanvas, 100, 314, qrSize, qrSize);

    ctx.fillStyle = "rgba(88,88,204,0.1)";
    ctx.strokeStyle = "rgba(88,88,204,0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(64, cardH - 84, cardW - 128, 62, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#5858CC";
    ctx.font = "700 22px Space Mono, monospace";
    ctx.fillText("HORIZON // VELO PROFILE", 88, cardH - 45);

    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  };

  const handleNativeShare = async () => {
    const trackedUrl = shareUrlFor("share") || publicUrl;
    if (!trackedUrl) return;
    if (typeof navigator === "undefined" || !navigator.share) { await handleCopy(); return; }
    // Build share data — try to attach the card image but never let it block the share
    let shareData: ShareData = { title: shareTitle, text: shareMessage, url: trackedUrl };
    try {
      const cardBlob = await buildShareCardBlob();
      if (cardBlob) {
        const file = new File([cardBlob], "horizon-portfolio-card.png", { type: "image/png" });
        if ("canShare" in navigator && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
          shareData = { ...shareData, files: [file] };
        }
      }
    } catch { /* card generation failed — share without image */ }
    try {
      await navigator.share(shareData);
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") await handleCopy();
    }
  };

  const handleWhatsAppShare = async () => {
    const t = shareUrlFor("whatsapp") || publicUrl;
    if (!t) return;
    // On mobile: use native share with the card image (opens OS sheet → user picks WhatsApp)
    if (typeof navigator !== "undefined" && navigator.share && "canShare" in navigator) {
      try {
        const cardBlob = await buildShareCardBlob();
        if (cardBlob) {
          const file = new File([cardBlob], "horizon-portfolio-card.png", { type: "image/png" });
          if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: shareTitle, text: `${shareMessage}\n\n${t}`, files: [file] });
            return;
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        // blob failed — fall through to text link
      }
    }
    // Desktop fallback: text-only WhatsApp link (images can't be sent via URL scheme)
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareMessage}\n\n${t}`)}`, "_blank", "noopener,noreferrer");
  };

  const handleLinkedInShare = () => {
    const t = shareUrlFor("linkedin") || publicUrl;
    if (!t) return;
    // shareArticle?mini=true pre-fills title + summary even when LinkedIn can't scrape the page
    const params = new URLSearchParams({
      mini: "true",
      url: t,
      title: shareTitle,
      summary: shareMessage,
    });
    window.open(`https://www.linkedin.com/shareArticle?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const handleDownloadCard = async () => {
    const blob = await buildShareCardBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "horizon-portfolio-card.png"; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let revokedUrl = "";
    const makePreview = async () => {
      if (!shareOpen || !qrDataUrl) return;
      setShareCardBusy(true);
      const blob = await buildShareCardBlob();
      if (!blob) { setShareCardBusy(false); return; }
      const objectUrl = URL.createObjectURL(blob);
      revokedUrl = objectUrl;
      setShareCardPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return objectUrl; });
      setShareCardBusy(false);
    };
    void makePreview();
    return () => { if (revokedUrl) URL.revokeObjectURL(revokedUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareOpen, qrDataUrl, usernameLabel]);

  const atsScore = (mirrorData?.mirror?.deep_analysis as Record<string, unknown> | undefined)
    ?.ats_score as number | undefined;

  return (
    <div className="h-full min-h-0 w-full overflow-x-hidden overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:pb-8">
      <div className="mx-auto mt-4 flex min-h-full max-w-[1720px] flex-col gap-0 ">

        {/* ── Hero banner ──────────────────────────────────────────────────── */}
        <div className="relative mb-4 overflow-hidden border-b border-border/60 bg-white rounded-2xl px-4 py-6 sm:px-6 xl:px-8">
          {/* Decorative orb */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full  blur-3xl" />

          <div className="relative flex flex-col gap-5">
            {/* Title row */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand-indigo)] text-white">
                  <Activity className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-xl font-semibold leading-tight sm:text-2xl">
                      Progress Mirror
                    </h1>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full",
                          statusDot.color,
                          statusDot.pulse && "animate-pulse",
                        )}
                      />
                      <span className="text-[11px] text-muted-foreground">{statusDot.label}</span>
                    </div>
                  </div>
                </div>
                {/* Scroll-to-profile — mobile only */}
                <button
                  className="xl:hidden ml-1 flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                  onClick={() => document.getElementById("public-profile-card")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <ArrowDown className="h-3 w-3" />
                  My Profile
                </button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="hidden h-8 text-xs sm:flex"
                onClick={() => router.push("/chat?context=mirror_review")}
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                Ask mentor
              </Button>
            </div>

            {/* Stats strip — horizontal scroll on mobile */}
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 xl:-mx-8 xl:px-8">
              <StatTile
                icon={<TrendingUp className="h-4 w-4" />}
                label="ATS Score"
                value={atsScore !== undefined ? String(atsScore) : "--"}
                accent="indigo"
              />
              <StatTile
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Readiness"
                value={readiness ? `${Math.round(readiness.score)}%` : "--"}
                accent="emerald"
              />
              <StatTile
                icon={<Sparkles className="h-4 w-4" />}
                label="Level"
                value={`L${level}`}
                accent="violet"
              />
              <StatTile
                icon={<Trophy className="h-4 w-4" />}
                label="XP"
                value={totalPoints.toLocaleString()}
                accent="amber"
              />
              <StatTile
                icon={<Flame className="h-4 w-4" />}
                label="Streak"
                value={`${currentStreak}d`}
                accent="orange"
              />
              <StatTile
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Verified"
                value={String(verifiedCount)}
                accent="teal"
              />
            </div>
          </div>
        </div>

        {/* ── Page body ────────────────────────────────────────────────────── */}
        <div className="grid flex-1 grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_280px]">

          {/* Main — tabs */}
          <div className="min-w-0 border-r border-border/60">
            <Tabs defaultValue="velo">
              {/* Tab bar */}
              <div className="border-b border-border/60 bg-muted/30">
                <div className="overflow-x-auto px-4 sm:px-6">
                  <TabsList className="h-auto w-max min-w-full justify-start rounded-none bg-transparent p-0">
                    {[
                      { value: "velo", label: "VELO Profile", mobileLabel: "VELO", icon: <Activity className="h-3.5 w-3.5" /> },
                      { value: "portfolio", label: "Portfolio", mobileLabel: "Portfolio", icon: <Briefcase className="h-3.5 w-3.5" /> },
                      { value: "momentum", label: "Momentum", mobileLabel: "Momentum", icon: <Zap className="h-3.5 w-3.5" /> },
                    ].map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="group relative shrink-0 rounded-none border-b-2 border-transparent px-3 pb-3 pt-3.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-[color:var(--brand-indigo)] data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none sm:px-4"
                      >
                        <span className="flex items-center gap-1.5">
                          {tab.icon}
                          <span className="sm:hidden">{tab.mobileLabel}</span>
                          <span className="hidden sm:inline">{tab.label}</span>
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>

              <TabsContent value="velo" className="mt-0 outline-none focus-visible:ring-0">
                <VeloProfileTab />
              </TabsContent>
              <TabsContent value="portfolio" className="mt-0 outline-none focus-visible:ring-0">
                <PortfolioVaultTab />
              </TabsContent>
              <TabsContent value="momentum" className="mt-0 outline-none focus-visible:ring-0">
                <MomentumTab />
              </TabsContent>
            </Tabs>
          </div>

          {/* Aside — stacks below tabs on mobile, right column on xl */}
          <aside id="public-profile-card" className="order-last border-t border-border/60 xl:order-none xl:border-t-0 xl:border-l xl:border-border/60">
            <div className="xl:sticky xl:top-0 xl:max-h-screen xl:overflow-y-auto">
              <PublicProfileCard
                profile={profile}
                user={user}
                publicUrl={publicUrl}
                usernameLabel={usernameLabel}
                verifiedCount={verifiedCount}
                artifactCount={artifacts.length}
                copied={copied}
                onCopy={handleCopy}
                onShare={() => setShareOpen(true)}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* ── Share dialog ───────────────────────────────────────────────────── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="flex max-h-[94vh] min-w-[min(98vw,600px)] max-w-none flex-col overflow-x-hidden overflow-y-auto p-0">
          <DialogHeader>
            <DialogTitle className="px-6 pt-6">Share Portfolio</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 px-6 pb-6">
            <div className="overflow-hidden rounded-xl border bg-muted/30 px-4 py-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Public URL
              </p>
              <p className="truncate text-xs">{shareUrlFor("share") || "No public URL"}</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl p-2">
              {shareCardPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shareCardPreviewUrl}
                  alt="Horizon share card preview"
                  className="mx-auto h-auto max-h-[68vh] w-full rounded-xl object-contain"
                />
              ) : (
                <div className="grid h-56 place-items-center rounded-xl border bg-card text-xs text-muted-foreground">
                  {qrError ?? (shareCardBusy ? "Rendering share card..." : "Preparing preview...")}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="lg" variant="outline" onClick={handleCopy} disabled={!publicUrl}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? "Copied" : "Copy URL"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="lg" onClick={handleNativeShare} disabled={!publicUrl}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Device share</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="lg" variant="outline" onClick={handleWhatsAppShare} disabled={!publicUrl}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share on WhatsApp</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="lg" variant="outline" onClick={handleLinkedInShare} disabled={!publicUrl}>
                      <Linkedin className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share on LinkedIn</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="lg" variant="outline" onClick={handleDownloadCard} disabled={!qrDataUrl}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download share card</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ACCENT_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  indigo: {
    bg: "bg-[color:var(--brand-indigo)]/10",
    text: "text-[color:var(--brand-indigo)]",
    border: "border-[color:var(--brand-indigo)]/25",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/25",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-900/40",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/25",
    text: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-900/40",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/25",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-900/40",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/25",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-900/40",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-950/25",
    text: "text-teal-700 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-900/40",
  },
};

function StatTile({
  icon,
  label,
  value,
  accent = "indigo",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  const a = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.indigo;
  return (
    <div
      className={cn(
        "flex min-w-[100px] shrink-0 flex-col gap-2 rounded-2xl border px-4 py-3 sm:min-w-[120px]",
        a.bg,
        a.border,
      )}
    >
      <span className={cn("flex items-center gap-1.5 text-[11px] font-medium", a.text)}>
        {icon}
        {label}
      </span>
      <span className="font-display text-2xl font-bold leading-none tabular-nums text-foreground sm:text-3xl">
        {value}
      </span>
    </div>
  );
}

function PublicProfileCard({
  profile,
  user,
  publicUrl,
  usernameLabel,
  verifiedCount,
  artifactCount,
  copied,
  onCopy,
  onShare,
}: {
  profile: { id?: string; full_name?: string; slug?: string; avatar_url?: string; is_public?: boolean; view_count?: number } | undefined;
  user: { profile_completion?: number; full_name?: string } | null | undefined;
  publicUrl: string;
  usernameLabel: string;
  verifiedCount: number;
  artifactCount: number;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
}) {
  const [isPublic, setIsPublic] = useState(Boolean(profile?.is_public));
  const [savingVisibility, setSavingVisibility] = useState(false);

  useEffect(() => {
    setIsPublic(Boolean(profile?.is_public));
  }, [profile?.is_public]);

  const updateVisibility = async (next: boolean) => {
    if (!profile?.id || savingVisibility) return;
    const prev = isPublic;
    setIsPublic(next);
    setSavingVisibility(true);
    try {
      await portfolioApi.updateProfile(profile.id, { is_public: next });
      toast.success(next ? "Portfolio is now public." : "Portfolio is now private.");
    } catch {
      setIsPublic(prev);
      toast.error("Could not update portfolio visibility.");
    } finally {
      setSavingVisibility(false);
    }
  };

  const completion = Math.round(user?.profile_completion ?? 0);
  const initials = (profile?.full_name || user?.full_name || usernameLabel)
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const stats = [
    { label: "Verified", value: verifiedCount },
    { label: "Items", value: artifactCount },
    { label: "Views", value: profile?.view_count ?? 0 },
  ];

  return (
    <div className="flex flex-col p-4 sm:p-5">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Public Profile
        </p>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
            isPublic
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/25 dark:text-emerald-400"
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          {isPublic ? (
            <><Globe2 className="h-2.5 w-2.5" /> Live</>
          ) : (
            <><Lock className="h-2.5 w-2.5" /> Private</>
          )}
        </span>
      </div>

      {/* Visibility switch */}
      <div className="mb-4 flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2.5">
        <div>
          <p className="text-xs font-medium">Public portfolio</p>
          <p className="text-[10px] text-muted-foreground">
            {isPublic ? "Anyone with the link can view it." : "Only you can view it."}
          </p>
        </div>
        <Switch checked={isPublic} onCheckedChange={updateVisibility} disabled={!profile?.id || savingVisibility} />
      </div>

      {/* Identity block */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-indigo)]/10 text-[13px] font-bold text-[color:var(--brand-indigo)]">
          {initials || "H"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {profile?.full_name || user?.full_name || usernameLabel}
          </p>
          {publicUrl ? (
            <button
              onClick={onCopy}
              className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="truncate">/p/{profile?.slug || usernameLabel}</span>
              {copied
                ? <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                : <Copy className="h-3 w-3 shrink-0" />
              }
            </button>
          ) : (
            <p className="text-[11px] text-muted-foreground">No public URL yet</p>
          )}
        </div>
      </div>

      {/* Profile completion */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Profile completion</span>
          <span className="text-[11px] font-semibold tabular-nums">{completion}%</span>
        </div>
        <Progress value={completion} className="h-1.5" />
      </div>

      {/* Stats row */}
      <div className="mb-4 flex divide-x divide-border/60 overflow-hidden rounded-xl border bg-muted/30">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-1 flex-col items-center py-3">
            <span className="font-display text-lg font-bold tabular-nums leading-none text-foreground">
              {s.value}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <Button
          size="sm"
          variant="cta"
          className="h-9 w-full text-xs"
          onClick={onShare}
          disabled={!publicUrl}
        >
          <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share Portfolio
        </Button>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-9 w-full text-xs"
          disabled={!publicUrl}
        >
          <Link href={publicUrl || "#"} target="_blank">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open Public Page
          </Link>
        </Button>
      </div>
    </div>
  );
}
