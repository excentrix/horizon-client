"use client";

import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type BannerTone = "info" | "success" | "error";

interface StatusBannerProps {
  tone?: BannerTone;
  message: string;
}

export function StatusBanner({ tone = "info", message }: StatusBannerProps) {
  if (!message) return null;
  const palette =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : tone === "error"
        ? "border-rose-300 bg-rose-50 text-rose-800"
        : "border-sky-300 bg-sky-50 text-sky-800";
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : Info;
  return (
    <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", palette)}>
      <Icon className="mt-0.5 h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}
