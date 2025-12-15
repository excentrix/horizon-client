"use client";

import { create } from "zustand";
import type { MentorAction, PlanUpdateEvent, UUID } from "@/types";

interface MentorLoungeState {
  selectedConversationId: UUID | null;
  setSelectedConversationId: (id: UUID | null) => void;
  composerDraft: string;
  setComposerDraft: (value: string) => void;
  mentorActions: MentorAction[];
  setMentorActions: (actions: MentorAction[]) => void;
  planUpdates: PlanUpdateEvent[];
  pushPlanUpdate: (update: PlanUpdateEvent) => void;
  clearPlanUpdates: () => void;
  activeAgent: { name: string; icon?: string } | null;
  setActiveAgent: (agent: { name: string; icon?: string } | null) => void;
  cortexRoutingHistory: RoutingDecision[];
  pushRoutingDecision: (decision: RoutingDecision) => void;
}

export interface RoutingDecision {
  agent: string;
  confidence: number;
  reason: string;
  timestamp: string;
}

export const useMentorLoungeStore = create<MentorLoungeState>((set) => ({
  selectedConversationId: null,
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  composerDraft: "",
  setComposerDraft: (composerDraft) => set({ composerDraft }),
  mentorActions: [],
  setMentorActions: (mentorActions) => set({ mentorActions }),
  planUpdates: [],
  pushPlanUpdate: (update) =>
    set((state) => ({
      planUpdates: [...state.planUpdates, update].slice(-8),
    })),
  clearPlanUpdates: () => set({ planUpdates: [] }),
  activeAgent: null,
  setActiveAgent: (activeAgent) => set({ activeAgent }),
  cortexRoutingHistory: [],
  pushRoutingDecision: (decision) =>
    set((state) => ({
      cortexRoutingHistory: [decision, ...state.cortexRoutingHistory].slice(0, 50),
    })),
}));
