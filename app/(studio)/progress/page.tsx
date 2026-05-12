"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Scan,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";

type MirrorStatus = "empty" | "running" | "ready" | "failed";

const statusConfig: Record<
  MirrorStatus,
  { label: string; tone: string; pulse?: boolean }
> = {
  ready: {
    label: "Analysis Ready",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
  running: {
    label: "Analyzing",
    tone: "border-amber-300 bg-amber-50 text-amber-700",
    pulse: true,
  },
  empty: {
    label: "Pending",
    tone: "border-slate-300 bg-slate-50 text-slate-700",
    pulse: true,
  },
  failed: {
    label: "Analysis Failed",
    tone: "border-red-300 bg-red-50 text-red-700",
  },
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
  const status = statusConfig[mirrorStatus];

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
    const withoutSourceTask = rawArtifacts.filter((a) => !a.source_task);
    return [...best.values(), ...withoutSourceTask];
  }, [rawArtifacts]);

  const verifiedCount = artifacts.filter(
    (a) =>
      a.verification_status === "verified" ||
      a.verification_status === "human_verified",
  ).length;
  const featuredCount = artifacts.filter((a) => a.featured).length;

  const publicUrl = useMemo(() => {
    if (!profile?.slug || typeof window === "undefined") return "";
    return `${window.location.origin}/p/${profile.slug}`;
  }, [profile?.slug]);

  const { qrDataUrl, qrError } = useLocalQrCode(publicUrl);
  const shareTitle = profile?.full_name
    ? `${profile.full_name} • Horizon Portfolio`
    : "Horizon Portfolio";
  const shareMessage =
    "I’m building verified skills on Horizon. Explore my public portfolio and create your own learning graph.";
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
    await navigator.clipboard.writeText(tracked);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const buildShareCardBlob = async () => {
    if (!qrDataUrl) return null;
    const cardW = 760;
    const cardH = 1000;
    const qrSize = 560;
    const canvas = document.createElement("canvas");
    canvas.width = cardW;
    canvas.height = cardH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FAEDCD";
    ctx.fillRect(0, 0, cardW, cardH);

    // Main vertical card frame (fills full exported image)
    const passX = 0;
    const passY = 0;
    const passW = cardW;
    const passH = cardH;
    ctx.fillStyle = "#FAEDCD";
    ctx.strokeStyle = "rgba(88,88,204,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(passX, passY, passW, passH, 34);
    ctx.fill();
    ctx.stroke();

    // Header shell
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.beginPath();
    ctx.roundRect(passX + 22, passY + 22, passW - 44, 220, 24);
    ctx.fill();
    // Logo
    const logo = new Image();
    await new Promise<void>((resolve, reject) => {
      logo.onload = () => resolve();
      logo.onerror = () => reject(new Error("Logo failed to load"));
      logo.src = "/icon.svg";
    });
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(passX + passW - 150, passY + 80, 96, 96, 26);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
    ctx.drawImage(logo, passX + passW - 134, passY + 98, 64, 64);
    ctx.restore();

    // Profile image
    const avatarUrl = profile?.avatar_url || "";
    const avatarCx = passX + 106;
    const avatarCy = passY + 126;
    const avatarR = 54;
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
        ctx.drawImage(
          avatar,
          avatarCx - avatarR,
          avatarCy - avatarR,
          avatarR * 2,
          avatarR * 2,
        );
        ctx.restore();
      } catch {
        // fallback to initials below
      }
    }
    if (!avatarUrl) {
      const initials = (profile?.full_name || usernameLabel)
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      ctx.fillStyle = "#5858CC";
      ctx.font = "700 34px Space Mono, monospace";
      ctx.fillText(initials || "H", avatarCx - 12, avatarCy + 11);
    }
    ctx.restore();

    // Identity lockup
    const titleColor = "#414141";
    const subtitleColor = "#5858CC";
    ctx.fillStyle = subtitleColor;
    ctx.font = "700 28px Space Mono, monospace";
    ctx.fillText("VELO", passX + 190, passY + 88);
    ctx.fillStyle = titleColor;
    ctx.font = "600 40px Space Mono, monospace";
    ctx.fillText(
      profile?.full_name || "Horizon Learner",
      passX + 190,
      passY + 138,
    );
    ctx.fillStyle = subtitleColor;
    ctx.font = "600 26px Space Mono, monospace";
    ctx.fillText(`@${usernameLabel}`, passX + 190, passY + 178);

    // QR area with no white background, only beige/purple treatment
    const qrFrameX = passX + 72;
    const qrFrameY = passY + 286;
    const qrFrameSize = 616;
    ctx.fillStyle = "#efe0c9";
    ctx.strokeStyle = "rgba(88,88,204,0.22)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(qrFrameX, qrFrameY, qrFrameSize, qrFrameSize, 24);
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
    const purple = { r: 88, g: 88, b: 204 };
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luma < 128) {
        pixels[i] = purple.r;
        pixels[i + 1] = purple.g;
        pixels[i + 2] = purple.b;
        pixels[i + 3] = 255;
      } else {
        pixels[i] = 239;
        pixels[i + 1] = 224;
        pixels[i + 2] = 201;
        pixels[i + 3] = 255;
      }
    }
    qrCtx.putImageData(qrImageData, 0, 0);
    ctx.drawImage(qrCanvas, qrFrameX + 28, qrFrameY + 28, qrSize, qrSize);

    ctx.fillStyle = "rgba(88,88,204,0.1)";
    ctx.strokeStyle = "rgba(88,88,204,0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(passX + 64, passY + passH - 84, passW - 128, 62, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#5858CC";
    ctx.font = "700 22px Space Mono, monospace";
    ctx.fillText("HORIZON // VELO PROFILE", passX + 88, passY + passH - 45);

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
  };

  const handleNativeShare = async () => {
    const trackedUrl = shareUrlFor("share") || publicUrl;
    if (!trackedUrl) return;
    if (typeof navigator === "undefined" || !navigator.share) {
      await handleCopy();
      return;
    }
    try {
      const cardBlob = await buildShareCardBlob();
      const file =
        cardBlob != null
          ? new File([cardBlob], "horizon-portfolio-card.png", {
              type: "image/png",
            })
          : null;
      const canShareFile =
        file != null &&
        "canShare" in navigator &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });
      await navigator.share({
        title: shareTitle,
        text: shareMessage,
        url: trackedUrl,
        ...(canShareFile ? { files: [file] } : {}),
      });
    } catch {
      // User cancellation / platform rejection can be ignored silently.
    }
  };

  const handleWhatsAppShare = () => {
    const trackedUrl = shareUrlFor("whatsapp") || publicUrl;
    if (!trackedUrl) return;
    const text = encodeURIComponent(`${shareMessage}\n\n${trackedUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleLinkedInShare = () => {
    const trackedUrl = shareUrlFor("linkedin") || publicUrl;
    if (!trackedUrl) return;
    const shareUrl = encodeURIComponent(trackedUrl);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleDownloadCard = async () => {
    const blob = await buildShareCardBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "horizon-portfolio-card.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let revokedUrl = "";
    const makePreview = async () => {
      if (!shareOpen || !qrDataUrl) return;
      setShareCardBusy(true);
      const blob = await buildShareCardBlob();
      if (!blob) {
        setShareCardBusy(false);
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      revokedUrl = objectUrl;
      setShareCardPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });
      setShareCardBusy(false);
    };
    void makePreview();
    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareOpen, qrDataUrl, usernameLabel]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--brand-indigo)]/35 bg-[color:var(--brand-indigo)]/10 px-2.5 py-1 text-[10px] font-mono-ui uppercase tracking-[0.14em] text-[color:var(--brand-indigo)]">
              <Scan className="h-3.5 w-3.5" />
              Mirror Workspace
            </div>
            <h1 className="font-display text-2xl leading-tight">
              Progress Mirror
            </h1>
            <p className="text-xs text-muted-foreground">
              Resume intelligence, verified proof, and momentum in one
              operational view.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`rounded-full text-[10px] ${status.tone}`}
            >
              {status.pulse ? (
                <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              ) : null}
              {status.label}
            </Badge>
            <StatPill
              label="Readiness"
              value={readiness ? `${Math.round(readiness.score)}%` : "--"}
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
            />
            <StatPill
              label="Level"
              value={`L${level}`}
              icon={<Sparkles className="h-3.5 w-3.5" />}
            />
            <StatPill
              label="XP"
              value={totalPoints.toLocaleString()}
              icon={<Trophy className="h-3.5 w-3.5" />}
            />
            <StatPill
              label="Streak"
              value={`${currentStreak}d`}
              icon={<Flame className="h-3.5 w-3.5" />}
            />
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)] lg:px-6">
        <main className="min-h-0 min-w-0 overflow-y-auto rounded-3xl border border-border bg-card/70 shadow-[var(--shadow-1)]">
          <Tabs defaultValue="velo" className="flex h-full min-h-0 flex-col">
            <div className="border-b border-border/80 px-4 pt-4">
              <TabsList className="h-auto w-full justify-start rounded-none bg-transparent p-0">
                <TabsTrigger
                  value="velo"
                  className="rounded-none border-b-2 border-transparent px-3 pb-3 pt-2 data-[state=active]:border-[color:var(--brand-indigo)] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Scan className="mr-1.5 h-3.5 w-3.5" /> VELO Profile
                </TabsTrigger>
                <TabsTrigger
                  value="portfolio"
                  className="rounded-none border-b-2 border-transparent px-3 pb-3 pt-2 data-[state=active]:border-[color:var(--brand-indigo)] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Briefcase className="mr-1.5 h-3.5 w-3.5" /> Portfolio &
                  Evidence
                </TabsTrigger>
                <TabsTrigger
                  value="momentum"
                  className="rounded-none border-b-2 border-transparent px-3 pb-3 pt-2 data-[state=active]:border-[color:var(--brand-indigo)] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Zap className="mr-1.5 h-3.5 w-3.5" /> Momentum
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <TabsContent
                value="velo"
                className="mt-0 min-h-0 outline-none focus-visible:ring-0"
              >
                <VeloProfileTab />
              </TabsContent>
              <TabsContent
                value="portfolio"
                className="mt-0 min-h-0 outline-none focus-visible:ring-0"
              >
                <PortfolioVaultTab />
              </TabsContent>
              <TabsContent
                value="momentum"
                className="mt-0 min-h-0 outline-none focus-visible:ring-0"
              >
                <MomentumTab />
              </TabsContent>
            </div>
          </Tabs>
        </main>

        <aside className="min-h-0 space-y-4 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-1)]">
            <h2 className="mb-3 font-display text-lg">Verification Snapshot</h2>
            <div className="grid grid-cols-2 gap-2">
              <SnapshotTile label="Verified" value={verifiedCount.toString()} />
              <SnapshotTile label="Featured" value={featuredCount.toString()} />
              <SnapshotTile
                label="Portfolio Views"
                value={`${profile?.view_count ?? 0}`}
              />
              <SnapshotTile
                label="Public"
                value={profile?.is_public ? "On" : "Off"}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-[var(--shadow-1)]">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg">Public Portfolio</h2>
                <p className="text-xs text-muted-foreground">
                  Share your verified learning graph
                </p>
              </div>
              <Badge variant="outline" className="rounded-full text-[10px]">
                <Globe2 className="mr-1 h-3.5 w-3.5" />
                {profile?.is_public ? "Live" : "Private"}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-background p-3">
                <p className="mb-1 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Portfolio URL
                </p>
                <p className="truncate text-xs text-foreground/85">
                  {publicUrl || "No public URL yet"}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <SnapshotTile
                  label="Profile"
                  value={`${Math.round(user?.profile_completion ?? 0)}%`}
                  compact
                />
                <SnapshotTile
                  label="Artifacts"
                  value={`${artifacts.length}`}
                  compact
                />
                <SnapshotTile
                  label="Verified %"
                  value={`${artifacts.length ? Math.round((verifiedCount / artifacts.length) * 100) : 0}%`}
                  compact
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs"
                  disabled={!publicUrl}
                >
                  <Link href={publicUrl || "#"} target="_blank">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
                  </Link>
                </Button>
                <Button
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setShareOpen(true)}
                  disabled={!publicUrl}
                >
                  <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
                </Button>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="flex flex-col max-h-[94vh] min-w-[min(98vw,600px)] max-w-none overflow-x-hidden overflow-y-auto p-0">
          <DialogHeader>
            <DialogTitle className="px-6 pt-6">Share Portfolio</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 px-6 pb-6">
            <div className="rounded-2xl border border-border bg-background p-3">
              <p className="mb-1 font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Public URL
              </p>
              <p className="truncate text-xs text-foreground/85">
                {shareUrlFor("share") || "No public URL"}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-2xl  p-2">
              {shareCardPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shareCardPreviewUrl}
                  alt="Horizon share card preview"
                  className="mx-auto h-auto max-h-[68vh] w-full rounded-xl object-contain"
                />
              ) : (
                <div className="grid h-56 place-items-center rounded-xl border border-border bg-card text-xs text-muted-foreground">
                  {qrError ??
                    (shareCardBusy
                      ? "Rendering share card..."
                      : "Preparing preview...")}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleCopy}
                      disabled={!publicUrl}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {copied ? "Copied" : "Copy URL"}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      onClick={handleNativeShare}
                      disabled={!publicUrl}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Device share</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleWhatsAppShare}
                      disabled={!publicUrl}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share on WhatsApp</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleLinkedInShare}
                      disabled={!publicUrl}
                    >
                      <Linkedin className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share on LinkedIn</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleDownloadCard}
                      disabled={!qrDataUrl}
                    >
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

function StatPill({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
      <span className="text-[color:var(--brand-indigo)]">{icon}</span>
      <span className="font-mono-ui text-[10px] text-muted-foreground">
        {label}
      </span>
      <span className="font-mono-ui text-[11px] font-semibold">{value}</span>
    </div>
  );
}

function SnapshotTile({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border border-border bg-background ${compact ? "px-2.5 py-2" : "px-3 py-2"}`}
    >
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-mono-ui font-semibold leading-none ${compact ? "text-base" : "text-lg"}`}
      >
        {value}
      </p>
    </article>
  );
}
