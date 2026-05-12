"use client";

import { ReactNode, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface SceneStageProps {
  activeIndex: number;
  totalScenes: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (index: number) => void;
  canPrev: boolean;
  canNext: boolean;
  hideFooter?: boolean;
  children: ReactNode;
}

export function SceneStage({
  activeIndex,
  totalScenes,
  onPrev,
  onNext,
  onJump,
  canPrev,
  canNext,
  hideFooter = false,
  children,
}: SceneStageProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = 0;
    }
  }, [activeIndex]);

  return (
    <section className="flex min-h-0 flex-col gap-2">
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl p-0.5">
        <div className="flex h-full w-full items-stretch justify-center">
          <div
            ref={viewportRef}
            className="h-full w-full overflow-y-auto rounded-lg bg-white shadow-xl"
          >
            {children}
          </div>
        </div>
      </div>

      {!hideFooter ? <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-2 py-1.5">
        <Button variant="outline" size="sm" className="h-8" disabled={!canPrev} onClick={onPrev}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Previous scene
        </Button>
        <div className="flex gap-1.5">
          {Array.from({ length: totalScenes }).map((_, i) => (
            <button
              key={`dot-${i}`}
              className={`h-2.5 w-2.5 rounded-full ${i === activeIndex ? "bg-violet-600" : "bg-slate-300"}`}
              onClick={() => onJump(i)}
              aria-label={`Go to scene ${i + 1}`}
            />
          ))}
        </div>
        <Button size="sm" className="h-8" disabled={!canNext} onClick={onNext}>
          Next scene
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div> : null}
    </section>
  );
}
