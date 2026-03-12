"use client";

import type { ReactNode } from "react";

export function VeloShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-green-100 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="border-[3px] border-green-500 p-6">
          <p className="text-[10px] uppercase tracking-[0.4em] text-green-400">
            VELO
          </p>
          <h1 className="text-2xl font-semibold tracking-[0.2em] uppercase">
            Verification & Evidence Layer
          </h1>
          <p className="mt-2 text-sm text-green-300">
            Standalone audit surface powered by Horizon.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
