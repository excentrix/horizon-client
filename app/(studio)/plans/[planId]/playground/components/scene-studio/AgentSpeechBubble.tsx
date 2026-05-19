"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AgentRole } from "@/types";

// ── Agent visual config ───────────────────────────────────────────────────────

const AGENT_META: Record<
  AgentRole,
  {
    label: string;
    accent: string;
    bg: string;
    border: string;
    initials: string;
  }
> = {
  teacher: {
    label: "Aria",
    accent: "#EC5B13",
    bg: "bg-orange-50",
    border: "border-orange-200",
    initials: "DN",
  },
  peer_curious: {
    label: "Alex",
    accent: "#6366f1",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    initials: "AL",
  },
  peer_skeptic: {
    label: "Morgan",
    accent: "#0ea5e9",
    bg: "bg-sky-50",
    border: "border-sky-200",
    initials: "MG",
  },
  narrator: {
    label: "Narrator",
    accent: "#64748b",
    bg: "bg-slate-50",
    border: "border-slate-200",
    initials: "NA",
  },
};

// ── Per-agent TTS voice config ────────────────────────────────────────────────

const AGENT_VOICE_HINTS: Record<
  AgentRole,
  { rate: number; pitch: number; femalePreferred: boolean }
> = {
  teacher: { rate: 0.92, pitch: 1.0, femalePreferred: true },
  peer_curious: { rate: 1.05, pitch: 1.15, femalePreferred: true },
  peer_skeptic: { rate: 0.95, pitch: 0.82, femalePreferred: false },
  narrator: { rate: 0.9, pitch: 1.0, femalePreferred: true },
};

function pickVoice(agent: AgentRole): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const { femalePreferred } = AGENT_VOICE_HINTS[agent];
  const en = voices.filter((v) => v.lang.startsWith("en"));
  const femaleKeywords = [
    "female",
    "woman",
    "zira",
    "samantha",
    "victoria",
    "susan",
    "karen",
    "moira",
  ];
  const maleKeywords = [
    "male",
    "man",
    "david",
    "daniel",
    "alex",
    "tom",
    "fred",
    "ralph",
  ];
  const keywords = femalePreferred ? femaleKeywords : maleKeywords;
  const matched = en.filter((v) =>
    keywords.some((kw) => v.name.toLowerCase().includes(kw)),
  );
  return matched[0] ?? en[0] ?? voices[0] ?? null;
}

// ── Voice waveform (animated bars while speaking) ─────────────────────────────

function VoiceWaveform({ active, color }: { active: boolean; color: string }) {
  const bars = [3, 5, 8, 5, 3, 7, 4, 6, 3, 5];
  return (
    <div className="flex items-center gap-[2px]" aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn(
            "inline-block w-[3px] rounded-full transition-all",
            active ? "animate-pulse" : "opacity-30",
          )}
          style={{
            height: active ? `${h}px` : "3px",
            backgroundColor: color,
            animationDelay: `${i * 60}ms`,
            animationDuration: `${600 + (i % 3) * 150}ms`,
          }}
        />
      ))}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AgentSpeechBubbleProps {
  agent: AgentRole;
  text: string;
  /** True while text is still being streamed */
  streaming?: boolean;
  /** Highlighted whiteboard element IDs (shown as pill badges) */
  highlightIds?: string[];
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AgentSpeechBubble({
  agent,
  text,
  streaming = false,
  highlightIds,
  className,
}: AgentSpeechBubbleProps) {
  const meta = AGENT_META[agent] ?? AGENT_META.teacher;
  const endRef = useRef<HTMLSpanElement>(null);
  const [ttsActive, setTtsActive] = useState(false);

  // Auto-scroll as text streams in
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [text]);

  // TTS via Web Speech API — per-agent voice selection
  useEffect(() => {
    if (!text || !streaming) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    // Debounce — speak once streaming settles
    const id = setTimeout(() => {
      const hints = AGENT_VOICE_HINTS[agent];
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = hints.rate;
      utter.pitch = hints.pitch;
      const voice = pickVoice(agent);
      if (voice) utter.voice = voice;
      utter.onstart = () => setTtsActive(true);
      utter.onend = () => setTtsActive(false);
      utter.onerror = () => setTtsActive(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }, 800);

    return () => clearTimeout(id);
  }, [streaming, text, agent]);

  // Stop TTS on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4 transition-all duration-300",
        meta.bg,
        meta.border,
        streaming && "shadow-md",
        className,
      )}
    >
      {/* Avatar */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold text-white shadow-sm"
        style={{ backgroundColor: meta.accent, borderColor: meta.accent }}
      >
        {meta.initials}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header row */}
        <div className="mb-1.5 flex items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: meta.accent }}
          >
            {meta.label}
          </span>
          {agent === "peer_curious" && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
              Curious
            </span>
          )}
          {agent === "peer_skeptic" && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-600">
              Skeptic
            </span>
          )}
          <div className="ml-auto">
            <VoiceWaveform
              active={streaming || ttsActive}
              color={meta.accent}
            />
          </div>
        </div>

        {/* Speech text */}
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
          {text}
          {streaming && (
            <span
              className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse rounded-sm align-middle"
              style={{ backgroundColor: meta.accent }}
            />
          )}
          <span ref={endRef} />
        </p>

        {/* Highlight pill badges */}
        {highlightIds && highlightIds.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {highlightIds.map((id) => (
              <span
                key={id}
                className="rounded-full border px-2 py-0.5 text-[10px] font-mono font-medium"
                style={{
                  borderColor: meta.accent,
                  color: meta.accent,
                  backgroundColor: `${meta.accent}12`,
                }}
              >
                #{id}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
