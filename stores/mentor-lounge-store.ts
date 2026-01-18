"use client";

import { create } from "zustand";
import type { MentorAction, PlanUpdateEvent, UUID } from "@/types";
import { AgentRuntimeStep, InsightEvent, MissingInformationItem } from "@/types";

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

  // Runtime State
  agentRuntime: AgentRuntimeStep[];
  pushRuntimeStep: (step: AgentRuntimeStep) => void;
  clearRuntime: () => void;

  insights: InsightEvent[];
  pushInsight: (insight: InsightEvent) => void;

  missingInformation: MissingInformationItem[];
  pushMissingInfo: (info: MissingInformationItem) => void;
  resolveMissingInfo: (id: string) => void;

  // Plan Build Status
  planBuildStatus: "idle" | "queued" | "in_progress" | "warning" | "completed" | "failed";
  planBuildMessage: string | null;
  planBuildId: string | null; // The resulting Plan ID
  planBuildTitle: string | null;
  planSessionId: string | null; // The tracking Session ID
  lastPlanActivityAt: number | null; // Timestamp of last WS update
  setPlanBuildStatus: (status: "idle" | "queued" | "in_progress" | "warning" | "completed" | "failed", message?: string, planId?: string, planTitle?: string) => void;
  setPlanSessionId: (sessionId: string | null) => void;
  updateLastPlanActivity: () => void;
  resetPlanBuild: () => void;
}

export interface RoutingDecision {
  agent: string;
  confidence: number;
  reason: string;
  timestamp: string;
}

// Store implementation
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

  // Phase 3: Runtime Visualization
  agentRuntime: [],
  pushRuntimeStep: (step: AgentRuntimeStep) =>
    set((state) => ({
      agentRuntime: [step, ...state.agentRuntime].slice(0, 50),
    })),
  clearRuntime: () => set({ agentRuntime: [] }),

  insights: [],
  pushInsight: (insight: InsightEvent) =>
    set((state) => ({
      insights: [insight, ...state.insights].slice(0, 20),
    })),

  missingInformation: [],
  pushMissingInfo: (info: MissingInformationItem) =>
    set((state) => ({
      missingInformation: [...state.missingInformation, info],
    })),
  resolveMissingInfo: (id: string) =>
    set((state) => ({
      missingInformation: state.missingInformation.map((item) =>
        item.id === id ? { ...item, status: "resolved" } : item
      ),
    })),

  // Plan Build Status
  planBuildStatus: "idle",
  planBuildMessage: null,
  planBuildId: null,
  planBuildTitle: null,
  planSessionId: null,
  lastPlanActivityAt: null,
  setPlanBuildStatus: (status: "idle" | "queued" | "in_progress" | "warning" | "completed" | "failed", message?: string, planId?: string, planTitle?: string) =>
    set({
      planBuildStatus: status,
      planBuildMessage: message ?? null,
      planBuildId: planId ?? null,
      planBuildTitle: planTitle ?? null,
      lastPlanActivityAt: Date.now(),
    }),
  setPlanSessionId: (sessionId) => set({ planSessionId: sessionId, lastPlanActivityAt: Date.now() }),
  updateLastPlanActivity: () => set({ lastPlanActivityAt: Date.now() }),
  resetPlanBuild: () =>
    set({
      planBuildStatus: "idle",
      planBuildMessage: null,
      planBuildId: null,
      planBuildTitle: null,
      planSessionId: null,
      lastPlanActivityAt: null,
    }),
}));
