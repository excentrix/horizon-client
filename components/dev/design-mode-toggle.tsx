"use client";

import { useEffect, useMemo, useState } from "react";
import { MonitorCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const STORAGE_KEY = "horizon-dev-design-mode";
type DesignMode = "classic" | "retro";

function applyDesignMode(mode: DesignMode) {
  const root = document.documentElement;
  root.classList.toggle("theme-retro", mode === "retro");
}

export function DesignModeToggle() {
  const isDev = useMemo(() => process.env.NODE_ENV === "development", []);
  const [mode, setMode] = useState<DesignMode>("classic");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isDev) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("design");
    if (fromQuery === "retro" || fromQuery === "classic") {
      applyDesignMode(fromQuery);
      setMode(fromQuery);
      localStorage.setItem(STORAGE_KEY, fromQuery);
      setIsReady(true);
      return;
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    const nextMode: DesignMode = saved === "retro" ? "retro" : "classic";
    applyDesignMode(nextMode);
    setMode(nextMode);
    setIsReady(true);
  }, [isDev]);

  if (!isDev || !isReady) {
    return null;
  }

  return (
    <Card className="fixed right-4 bottom-4 z-[120] w-72 border bg-background/95 p-3 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MonitorCog className="size-4" />
          <p className="text-sm font-semibold">Design Mode</p>
        </div>
        <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
          Dev
        </Badge>
      </div>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <div>
          <p className="text-xs font-medium">Bloom Retro Preview</p>
          <p className="text-[11px] text-muted-foreground">Reference-inspired theme layer</p>
        </div>
        <Switch
          aria-label="Toggle retro design preview"
          checked={mode === "retro"}
          onCheckedChange={(checked) => {
            const nextMode: DesignMode = checked ? "retro" : "classic";
            setMode(nextMode);
            applyDesignMode(nextMode);
            localStorage.setItem(STORAGE_KEY, nextMode);
          }}
        />
      </div>
    </Card>
  );
}
