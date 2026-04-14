"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, Link2, Mic, Type, X, Send,
  FileText, ImageIcon, Sparkles, CheckCircle2,
  StopCircle, Calendar, Zap, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
type ItemType = "file" | "image" | "link" | "audio" | "text";
type Mode = "idle" | "dragover" | "typing" | "recording" | "preview" | "analyzing" | "done";

interface InboxItem {
  id: string;
  type: ItemType;
  label: string;
  size?: string;
  preview?: string; // data URL for images
}

// ─── Per-type analysis hint sequences ─────────────────────────────────────────
const HINTS: Record<ItemType, string[]> = {
  file: [
    "Scanning document…",
    "Detecting content type…",
    "Identified: Exam schedule — 3 dates found",
    "Checking calendar for conflicts…",
    "Mentor recommendation ready ✓",
  ],
  image: [
    "Processing image…",
    "Extracting text and layout…",
    "Detected: Timetable or schedule",
    "Mapping dates and subjects…",
    "Mentor recommendation ready ✓",
  ],
  link: [
    "Fetching page content…",
    "Analysing structure and metadata…",
    "Classifying context…",
    "Matching to your learning plan…",
    "Mentor recommendation ready ✓",
  ],
  audio: [
    "Transcribing recording…",
    "Identifying key topics…",
    "Extracting dates and tasks…",
    "Matching to your plan…",
    "Mentor recommendation ready ✓",
  ],
  text: [
    "Processing note…",
    "Extracting dates and keywords…",
    "Matching context to your plan…",
    "Generating recommendation…",
    "Mentor recommendation ready ✓",
  ],
};

const RESPONSES: Record<ItemType, { title: string; body: string; actions: string[] }> = {
  file: {
    title: "Exam Mode Detected",
    body: "I found an exam on May 12. Want me to enable Exam Mode and reschedule your practice tasks for the next 2 weeks?",
    actions: ["Enable Exam Mode", "View Schedule"],
  },
  image: {
    title: "Timetable Added",
    body: "I identified 4 subjects and their schedules. Should I add these to your Learning Plan and adjust your calendar?",
    actions: ["Update Plan", "Review Changes"],
  },
  link: {
    title: "Resource Captured",
    body: "This looks relevant to your current Python module. Want me to add it to your study materials and queue it for this week?",
    actions: ["Add to Plan", "Save for Later"],
  },
  audio: {
    title: "Hackathon Detected",
    body: "I heard you mention a hackathon on April 20. Should I create a 5-day prep plan and block time on your calendar?",
    actions: ["Create Prep Plan", "Block Calendar"],
  },
  text: {
    title: "Note Captured",
    body: "Got it. I've noted this thought. Should I create a reminder, or add this as a task to your current plan?",
    actions: ["Add as Task", "Set Reminder"],
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function MentorInbox() {
  const [mode, setMode] = useState<Mode>("idle");
  const [item, setItem] = useState<InboxItem | null>(null);
  const [typingValue, setTypingValue] = useState("");
  const [linkValue, setLinkValue] = useState("");
  const [inputKind, setInputKind] = useState<"text" | "link" | null>(null);
  const [hintsShown, setHintsShown] = useState<string[]>([]);
  const [recSeconds, setRecSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Drag & drop ────────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setMode("dragover");
  }, []);

  const handleDragLeave = useCallback(() => {
    if (mode === "dragover") setMode("idle");
  }, [mode]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) { setMode("idle"); return; }
    const type: ItemType = file.type.startsWith("image/") ? "image" : "file";
    const preview = type === "image" ? URL.createObjectURL(file) : undefined;
    setItem({ id: crypto.randomUUID(), type, label: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, preview });
    setMode("preview");
  }, []);

  // ─── File picker ─────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type: ItemType = file.type.startsWith("image/") ? "image" : "file";
    const preview = type === "image" ? URL.createObjectURL(file) : undefined;
    setItem({ id: crypto.randomUUID(), type, label: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, preview });
    setMode("preview");
  };

  // ─── Paste (links or images) ─────────────────────────────────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (mode !== "idle" && mode !== "dragover") return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (text.startsWith("http://") || text.startsWith("https://")) {
        setItem({ id: crypto.randomUUID(), type: "link", label: text.slice(0, 60) + (text.length > 60 ? "…" : "") });
        setMode("preview");
        return;
      }
      const imgFile = Array.from(e.clipboardData?.files ?? []).find(f => f.type.startsWith("image/"));
      if (imgFile) {
        setItem({ id: crypto.randomUUID(), type: "image", label: "Pasted image", preview: URL.createObjectURL(imgFile) });
        setMode("preview");
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [mode]);

  // ─── Voice recording ─────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.start();
      setMode("recording");
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch {
      // mic permission denied — silently fall back
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    const mins = String(Math.floor(recSeconds / 60)).padStart(2, "0");
    const secs = String(recSeconds % 60).padStart(2, "0");
    setItem({ id: crypto.randomUUID(), type: "audio", label: `Voice note — ${mins}:${secs}` });
    setMode("preview");
  };

  // ─── Analysis sequence ───────────────────────────────────────────────────────
  const startAnalysis = useCallback(() => {
    if (!item) return;
    setMode("analyzing");
    setHintsShown([]);
    const hints = HINTS[item.type];
    let idx = 0;
    hintTimerRef.current = setInterval(() => {
      idx += 1;
      setHintsShown(hints.slice(0, idx));
      if (idx >= hints.length) {
        clearInterval(hintTimerRef.current!);
        setTimeout(() => setMode("done"), 600);
      }
    }, 700);
  }, [item]);

  // Cleanup on reset
  const reset = () => {
    if (hintTimerRef.current) clearInterval(hintTimerRef.current);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setMode("idle");
    setItem(null);
    setTypingValue("");
    setLinkValue("");
    setInputKind(null);
    setHintsShown([]);
    setRecSeconds(0);
  };

  const submitText = () => {
    const val = inputKind === "link" ? linkValue : typingValue;
    if (!val.trim()) return;
    const type: ItemType = inputKind === "link" ? "link" : "text";
    setItem({ id: crypto.randomUUID(), type, label: val.trim().slice(0, 80) });
    setMode("preview");
    setInputKind(null);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={`
        rounded-2xl border shadow-[var(--shadow-1)] transition-all duration-300 overflow-hidden
        ${mode === "dragover"
          ? "border-[color:var(--brand-indigo)] bg-[color:var(--brand-indigo)]/5 shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-indigo)_20%,transparent)]"
          : "border-border bg-[color:var(--surface)]"
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} accept="*/*" />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <p className="font-display text-base">Horizon Inbox</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Drop anything — Mentor figures it out</p>
        </div>
        {mode !== "idle" && mode !== "dragover" && (
          <button onClick={reset} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted/60 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── IDLE STATE ─────────────────────────────────────────────────────── */}
      {(mode === "idle" || mode === "dragover") && !inputKind && (
        <div className="px-4 pb-4 space-y-3">
          {/* Drop zone */}
          <div className={`
            relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all duration-200 cursor-pointer
            ${mode === "dragover"
              ? "border-[color:var(--brand-indigo)] bg-[color:var(--brand-indigo)]/8"
              : "border-border hover:border-[color:var(--brand-indigo)]/60 hover:bg-muted/20"
            }
          `}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`rounded-full p-3 transition-all duration-200 ${mode === "dragover" ? "bg-[color:var(--brand-indigo)]/20 scale-110" : "bg-muted/60"}`}>
              <Upload className={`h-5 w-5 transition-colors ${mode === "dragover" ? "text-[color:var(--brand-indigo)]" : "text-muted-foreground"}`} />
            </div>
            <div className="text-center">
              <p className={`text-sm font-medium transition-colors ${mode === "dragover" ? "text-[color:var(--brand-indigo)]" : "text-foreground"}`}>
                {mode === "dragover" ? "Drop it here" : "Drop files or click to browse"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">PDF, image, doc, any file type</p>
            </div>
          </div>

          {/* Quick-action row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setInputKind("link")}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background p-3 text-muted-foreground hover:border-[color:var(--brand-indigo)]/50 hover:text-foreground hover:bg-muted/20 transition-all"
            >
              <Link2 className="h-4 w-4" />
              <span className="text-[10px] font-medium">Paste Link</span>
            </button>
            <button
              onClick={startRecording}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background p-3 text-muted-foreground hover:border-red-400/50 hover:text-red-500 hover:bg-red-500/5 transition-all"
            >
              <Mic className="h-4 w-4" />
              <span className="text-[10px] font-medium">Record</span>
            </button>
            <button
              onClick={() => setInputKind("text")}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background p-3 text-muted-foreground hover:border-[color:var(--brand-indigo)]/50 hover:text-foreground hover:bg-muted/20 transition-all"
            >
              <Type className="h-4 w-4" />
              <span className="text-[10px] font-medium">Type Note</span>
            </button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/60">
            Or press <kbd className="rounded border border-border bg-muted px-1 font-mono text-[9px]">⌘V</kbd> to paste a link or image
          </p>
        </div>
      )}

      {/* ── TEXT / LINK INPUT ───────────────────────────────────────────────── */}
      {(mode === "idle" || mode === "dragover") && inputKind && (
        <div className="px-4 pb-4 space-y-2">
          <textarea
            autoFocus
            value={inputKind === "link" ? linkValue : typingValue}
            onChange={e => inputKind === "link" ? setLinkValue(e.target.value) : setTypingValue(e.target.value)}
            placeholder={inputKind === "link" ? "Paste a URL here…" : "What's on your mind? Hackathon, exam, idea…"}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-indigo)]/40 min-h-[96px]"
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitText(); } }}
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 font-mono text-[9px]">⌘↵</kbd> to send
            </p>
            <Button size="sm" variant="cta" className="h-7 px-3 text-[11px]" onClick={submitText}>
              <Send className="mr-1.5 h-3 w-3" /> Send
            </Button>
          </div>
        </div>
      )}

      {/* ── RECORDING ───────────────────────────────────────────────────────── */}
      {mode === "recording" && (
        <div className="px-4 pb-4 flex flex-col items-center gap-4">
          {/* Waveform bars */}
          <div className="flex items-end gap-1 h-10">
            {Array.from({ length: 16 }).map((_, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-red-500"
                style={{
                  height: "100%",
                  animation: `waveBar 0.8s ease-in-out ${(i * 0.06).toFixed(2)}s infinite alternate`,
                  opacity: 0.7 + (i % 3) * 0.1,
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes waveBar {
              from { transform: scaleY(0.15); }
              to   { transform: scaleY(1); }
            }
          `}</style>
          <p className="font-mono-ui text-2xl font-bold tabular-nums text-red-500">{fmt(recSeconds)}</p>
          <Button
            variant="outline"
            size="sm"
            className="border-red-400/50 text-red-500 hover:bg-red-500/10"
            onClick={stopRecording}
          >
            <StopCircle className="mr-1.5 h-3.5 w-3.5" /> Stop Recording
          </Button>
        </div>
      )}

      {/* ── PREVIEW ─────────────────────────────────────────────────────────── */}
      {mode === "preview" && item && (
        <div className="px-4 pb-4 space-y-3">
          {/* Item card */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
            <div className="shrink-0 rounded-lg bg-muted/60 p-2.5">
              {item.type === "image" && item.preview
                ? <img src={item.preview} alt="" className="h-8 w-8 rounded object-cover" />
                : item.type === "audio"
                  ? <Mic className="h-5 w-5 text-red-500" />
                  : item.type === "link"
                    ? <Link2 className="h-5 w-5 text-[color:var(--brand-indigo)]" />
                    : item.type === "image"
                      ? <ImageIcon className="h-5 w-5 text-blue-400" />
                      : <FileText className="h-5 w-5 text-muted-foreground" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.label}</p>
              {item.size && <p className="text-[10px] text-muted-foreground font-mono-ui">{item.size}</p>}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Mentor will analyse this and suggest actions.
          </p>
          <Button variant="cta" size="sm" className="w-full h-9 font-mono-ui text-[11px]" onClick={startAnalysis}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Analyse with Mentor
          </Button>
        </div>
      )}

      {/* ── ANALYSING ───────────────────────────────────────────────────────── */}
      {mode === "analyzing" && item && (
        <div className="px-4 pb-5 space-y-3">
          <div className="flex items-center gap-3">
            {/* Spinner orb */}
            <div className="relative shrink-0 h-9 w-9 rounded-full bg-[color:var(--brand-indigo)]/20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-[color:var(--brand-indigo)]/30 border-t-[color:var(--brand-indigo)] animate-spin" />
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--brand-indigo)]" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mentor is analysing</p>
              <p className="text-xs font-medium truncate max-w-[200px]">{item.label}</p>
            </div>
          </div>

          <div className="space-y-1.5 pl-1">
            {HINTS[item.type].map((hint, i) => {
              const shown = i < hintsShown.length;
              const isLast = i === HINTS[item.type].length - 1;
              return (
                <div
                  key={hint}
                  className={`flex items-center gap-2 transition-all duration-300 ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 transition-colors ${shown ? (isLast ? "bg-green-500" : "bg-[color:var(--brand-indigo)]") : "bg-muted"}`} />
                  <p className={`text-[11px] transition-colors ${shown ? (isLast ? "text-green-500 font-semibold" : "text-foreground") : "text-muted-foreground"}`}>
                    {hint}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DONE ────────────────────────────────────────────────────────────── */}
      {mode === "done" && item && (() => {
        const resp = RESPONSES[item.type];
        return (
          <div className="px-4 pb-4 space-y-3">
            {/* Mentor card */}
            <div className="rounded-xl border border-[color:var(--brand-indigo)]/30 bg-[color:var(--brand-indigo)]/8 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-[color:var(--brand-indigo)]/20 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3 w-3 text-[color:var(--brand-indigo)]" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[color:var(--brand-indigo)]">{resp.title}</p>
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />
              </div>
              <p className="text-sm leading-snug text-foreground">{resp.body}</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button variant="cta" size="sm" className="flex-1 h-8 text-[11px] font-mono-ui">
                {resp.actions[0]} <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px] font-mono-ui">
                {resp.actions[1]}
              </Button>
            </div>

            <button onClick={reset} className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1">
              Drop another file
            </button>
          </div>
        );
      })()}
    </div>
  );
}
