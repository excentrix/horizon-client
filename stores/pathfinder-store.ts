"use client";

import { create } from "zustand";

interface PathfinderState {
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  composerDraft: string;
  setComposerDraft: (value: string) => void;
  isGeneratingReport: boolean;
  setIsGeneratingReport: (value: boolean) => void;
}

export const usePathfinderStore = create<PathfinderState>((set) => ({
  activeSessionId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),
  composerDraft: "",
  setComposerDraft: (value) => set({ composerDraft: value }),
  isGeneratingReport: false,
  setIsGeneratingReport: (value) => set({ isGeneratingReport: value }),
}));
