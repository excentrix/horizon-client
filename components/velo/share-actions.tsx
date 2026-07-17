"use client";

import { useState } from "react";
import { Copy, Check, QrCode, MessageCircle, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLocalQrCode } from "@/hooks/use-local-qr";
import { trackFunnel, FUNNEL } from "@/lib/funnel";
import { toast } from "sonner";

/**
 * The single sharing surface for credentials and profiles — copy link, QR
 * (generated locally, works offline at a career fair), WhatsApp, LinkedIn.
 * Reused everywhere a link reaches a recruiter so sharing behaves identically
 * across the product.
 */
export function ShareActions({
  url,
  label = "Verified credential",
  shareText,
  trackId,
}: {
  url: string;
  label?: string;
  /** Message that precedes the link on WhatsApp. */
  shareText?: string;
  /** Funnel payload identifier (e.g. audit id or username). */
  trackId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { qrDataUrl } = useLocalQrCode(url);

  const track = () => trackFunnel(FUNNEL.CREDENTIAL_SHARED, { url, id: trackId });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track();
      toast.success("Link copied.");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(url);
    }
  };

  const waHref = `https://wa.me/?text=${encodeURIComponent(
    `${shareText ?? "My VELO-verified proof of work"} — ${url}`,
  )}`;
  const liHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" className="gap-1.5" onClick={copyLink}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1.5">
            <QrCode className="size-3.5" /> QR
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 text-center">
          <p className="eyebrow mb-3 flex items-center justify-center gap-2">
            <span className="eyebrow-dot" /> {label}
          </p>
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`QR code linking to ${label}`}
              className="mx-auto size-44 rounded-lg border border-border bg-white p-2"
            />
          ) : (
            <div className="mx-auto size-44 animate-pulse rounded-lg bg-muted" />
          )}
          <p className="caseline mt-3 break-all text-[10px]">{url.replace(/^https?:\/\//, "")}</p>
        </PopoverContent>
      </Popover>

      <Button size="sm" variant="outline" className="gap-1.5" asChild>
        <a href={waHref} target="_blank" rel="noreferrer" onClick={track}>
          <MessageCircle className="size-3.5" /> WhatsApp
        </a>
      </Button>

      <Button size="sm" variant="outline" className="gap-1.5" asChild>
        <a href={liHref} target="_blank" rel="noreferrer" onClick={track}>
          <Linkedin className="size-3.5" /> LinkedIn
        </a>
      </Button>
    </div>
  );
}
