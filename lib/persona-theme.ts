import { AIPersonality } from "@/types";

export interface PersonaTheme {
  containerBorder: string;
  accentBadgeBg: string;
  accentBadgeText: string;
  bubbleBg: string;
  bubbleText: string;
  conversationActive: string;
  statusBadgeBg: string;
  statusBadgeText: string;
}

const DEFAULT_THEME: PersonaTheme = {
  containerBorder: "border-slate-200",
  accentBadgeBg: "bg-slate-100",
  accentBadgeText: "text-slate-700",
  bubbleBg: "bg-slate-100",
  bubbleText: "text-slate-800",
  conversationActive: "border-slate-200 bg-slate-50",
  statusBadgeBg: "bg-slate-100",
  statusBadgeText: "text-slate-600",
};

const THEMES: Record<AIPersonality["type"] | "specialized", PersonaTheme> = {
  general: {
    containerBorder: "border-slate-200",
    accentBadgeBg: "bg-slate-100",
    accentBadgeText: "text-slate-700",
    bubbleBg: "bg-slate-100",
    bubbleText: "text-slate-900",
    conversationActive: "bg-slate-50 border-l-slate-500",
    statusBadgeBg: "bg-slate-100",
    statusBadgeText: "text-slate-600",
  },
  supportive: {
    containerBorder: "border-rose-200",
    accentBadgeBg: "bg-rose-100",
    accentBadgeText: "text-rose-700",
    bubbleBg: "bg-rose-50",
    bubbleText: "text-rose-800",
    conversationActive: "border-rose-200 bg-rose-50",
    statusBadgeBg: "bg-rose-100",
    statusBadgeText: "text-rose-700",
  },
  analytical: {
    containerBorder: "border-sky-200",
    accentBadgeBg: "bg-sky-100",
    accentBadgeText: "text-sky-700",
    bubbleBg: "bg-sky-50",
    bubbleText: "text-sky-800",
    conversationActive: "border-sky-200 bg-sky-50",
    statusBadgeBg: "bg-sky-100",
    statusBadgeText: "text-sky-700",
  },
  creative: {
    containerBorder: "border-violet-200",
    accentBadgeBg: "bg-violet-100",
    accentBadgeText: "text-violet-700",
    bubbleBg: "bg-violet-50",
    bubbleText: "text-violet-800",
    conversationActive: "border-violet-200 bg-violet-50",
    statusBadgeBg: "bg-violet-100",
    statusBadgeText: "text-violet-700",
  },
  practical: {
    containerBorder: "border-emerald-200",
    accentBadgeBg: "bg-emerald-100",
    accentBadgeText: "text-emerald-700",
    bubbleBg: "bg-emerald-50",
    bubbleText: "text-emerald-800",
    conversationActive: "border-emerald-200 bg-emerald-50",
    statusBadgeBg: "bg-emerald-100",
    statusBadgeText: "text-emerald-700",
  },
  socratic: {
    containerBorder: "border-indigo-200",
    accentBadgeBg: "bg-indigo-100",
    accentBadgeText: "text-indigo-700",
    bubbleBg: "bg-indigo-50",
    bubbleText: "text-indigo-800",
    conversationActive: "border-indigo-200 bg-indigo-50",
    statusBadgeBg: "bg-indigo-100",
    statusBadgeText: "text-indigo-700",
  },
  motivational: {
    containerBorder: "border-orange-200",
    accentBadgeBg: "bg-orange-100",
    accentBadgeText: "text-orange-700",
    bubbleBg: "bg-orange-50",
    bubbleText: "text-orange-800",
    conversationActive: "border-orange-200 bg-orange-50",
    statusBadgeBg: "bg-orange-100",
    statusBadgeText: "text-orange-700",
  },
  specialized: {
    containerBorder: "border-slate-300",
    accentBadgeBg: "bg-slate-100",
    accentBadgeText: "text-slate-700",
    bubbleBg: "bg-slate-50",
    bubbleText: "text-slate-800",
    conversationActive: "border-slate-300 bg-slate-50",
    statusBadgeBg: "bg-slate-100",
    statusBadgeText: "text-slate-600",
  },
};

export function getPersonaTheme(persona?: AIPersonality | null): PersonaTheme {
  if (!persona) {
    return DEFAULT_THEME;
  }

  if (persona.type && persona.type in THEMES) {
    return THEMES[persona.type as keyof typeof THEMES];
  }

  return DEFAULT_THEME;
}

export function getPersonaTagline(persona?: AIPersonality | null) {
  if (!persona) {
    return "Adaptive mentorship at your pace";
  }

  const taglines: Partial<Record<AIPersonality["type"] | "specialized", string>> = {
    supportive: "Steady encouragement meets actionable nudges",
    analytical: "Grounded analysis with a clear data story",
    creative: "Imaginative twists to unlock fresh ideas",
    practical: "Tactical moves tailored to your routine",
    socratic: "Curious prompts that sharpen your thinking",
    motivational: "Energy boosts to keep your streak alive",
    specialized: "Deep domain expertise for this journey",
  };

  return taglines[persona.type as keyof typeof taglines] ?? "Adaptive mentorship at your pace";
}
