"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Mic, Play, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { auditApi } from "@/lib/api";
import {
  startRealtimeTranscription,
  type RealtimeTranscriptionEvent,
  type RealtimeTranscriptionSession,
} from "@/lib/realtime-audio-transcription";
import { startWavRecorder, type WavRecorder } from "@/lib/record-audio-wav";

type Result = {
  transcript: string;
  model: string;
  mime_type: string;
  bytes: number;
  token_usage?: {
    total_tokens?: number;
    total_input_tokens?: number;
    total_output_tokens?: number;
    input_tokens_by_modality?: Array<{ modality: string; tokens: number }>;
    [key: string]: unknown;
  } | null;
};

export default function DevAudioTranscriptionPage() {
  const isDev = process.env.NODE_ENV === "development";
  const recorderRef = useRef<WavRecorder | null>(null);
  const streamRef = useRef<RealtimeTranscriptionSession | null>(null);
  const finalStreamPartsRef = useRef<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [streamTranscript, setStreamTranscript] = useState("");
  const [streamInterim, setStreamInterim] = useState("");
  const [streamMetrics, setStreamMetrics] = useState<{ audio_seconds: number; elapsed_seconds: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if ((!recording && !streaming) || !startedAt) return;
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording, startedAt, streaming]);

  useEffect(() => {
    return () => {
      void recorderRef.current?.cancel();
      void streamRef.current?.cancel();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  if (!isDev) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-6 py-10">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="size-4 text-destructive" />
            Development-only tool
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Audio transcription testing is disabled outside local development.
          </p>
        </div>
      </main>
    );
  }

  const start = async () => {
    setError(null);
    setResult(null);
    try {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudio(null);
      setAudioUrl(null);
      recorderRef.current = await startWavRecorder();
      setStartedAt(Date.now());
      setElapsed(0);
      setRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start microphone recording.");
    }
  };

  const handleRealtimeEvent = (event: RealtimeTranscriptionEvent) => {
    if (event.type === "transcript") {
      if (event.is_final) {
        finalStreamPartsRef.current = [...finalStreamPartsRef.current, event.transcript];
        setStreamTranscript(finalStreamPartsRef.current.join(" "));
        setStreamInterim("");
      } else {
        setStreamInterim(event.transcript);
      }
    } else if (event.type === "complete") {
      setStreamMetrics({
        audio_seconds: event.audio_seconds,
        elapsed_seconds: event.elapsed_seconds,
      });
      setStreaming(false);
    } else if (event.type === "error") {
      setError(event.error);
      setStreaming(false);
    } else if (event.type === "closed" && event.code !== 1000) {
      setError(event.reason || `Realtime socket closed (${event.code}).`);
      setStreaming(false);
    }
  };

  const startStreaming = async () => {
    setError(null);
    setResult(null);
    setStreamTranscript("");
    setStreamInterim("");
    setStreamMetrics(null);
    finalStreamPartsRef.current = [];
    try {
      streamRef.current = await startRealtimeTranscription({ onEvent: handleRealtimeEvent });
      setStartedAt(Date.now());
      setElapsed(0);
      setStreaming(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start realtime transcription.");
      streamRef.current = null;
    }
  };

  const stopStreaming = async () => {
    const session = streamRef.current;
    if (!session) return;
    streamRef.current = null;
    setStreaming(false);
    await session.stop();
  };

  const stop = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    setRecording(false);

    try {
      const blob = await recorder.stop();
      if (!blob) {
        setError("No audio was captured.");
        return;
      }
      const url = URL.createObjectURL(blob);
      setAudio(blob);
      setAudioUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not stop recording.");
    }
  };

  const reset = async () => {
    await recorderRef.current?.cancel();
    await streamRef.current?.cancel();
    recorderRef.current = null;
    streamRef.current = null;
    setRecording(false);
    setStreaming(false);
    setTranscribing(false);
    setAudio(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setResult(null);
    setStreamTranscript("");
    setStreamInterim("");
    setStreamMetrics(null);
    finalStreamPartsRef.current = [];
    setError(null);
    setStartedAt(null);
    setElapsed(0);
  };

  const transcribe = async () => {
    if (!audio) return;
    setError(null);
    setResult(null);
    setTranscribing(true);
    try {
      const data = await auditApi.transcribeDevAudio(audio);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transcription request failed.");
    } finally {
      setTranscribing(false);
    }
  };

  const elapsedLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const sizeLabel = audio ? `${Math.round(audio.size / 1024)} KB` : "-";
  const tokenUsage = result?.token_usage;
  const tokenStats = [
    { label: "Total", value: tokenUsage?.total_tokens },
    { label: "Input", value: tokenUsage?.total_input_tokens },
    { label: "Output", value: tokenUsage?.total_output_tokens },
  ];

  return (
    <main className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-6 px-6 py-8">
      <header className="border-b border-border pb-5">
        <p className="eyebrow flex items-center gap-2">
          <span className="eyebrow-dot" /> Development tool
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
          Audio transcription test
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Stream microphone audio through Google Cloud Speech-to-Text, or record a WAV sample and
          compare it against the batch Gemini transcription path.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Recorder</p>
              <p className="mt-1 font-mono-ui text-xs text-muted-foreground">
                {streaming
                  ? `Live · ${elapsedLabel}`
                  : recording
                    ? `Recording ${elapsedLabel}`
                    : `WAV · 16 kHz mono · ${sizeLabel}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={streaming ? "destructive" : "outline"}
                onClick={streaming ? stopStreaming : startStreaming}
                disabled={recording || transcribing}
              >
                {streaming ? <Square className="mr-2 size-4" /> : <Mic className="mr-2 size-4" />}
                {streaming ? "Stop live" : "Start live"}
              </Button>
              <Button
                type="button"
                size="icon"
                variant={recording ? "destructive" : "default"}
                onClick={recording ? stop : start}
                disabled={transcribing || streaming}
                aria-label={recording ? "Stop recording" : "Start recording"}
                title={recording ? "Stop recording" : "Start recording"}
              >
                {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
              </Button>
              <Button type="button" size="icon" variant="outline" onClick={reset} title="Reset" aria-label="Reset">
                <RotateCcw className="size-4" />
              </Button>
            </div>
          </div>

          {audioUrl && (
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Play className="size-3.5" />
                Local playback
              </div>
              <audio controls src={audioUrl} className="w-full" />
              <Button type="button" onClick={transcribe} disabled={transcribing || recording} className="w-full">
                {transcribing && <Loader2 className="mr-2 size-4 animate-spin" />}
                {transcribing ? "Sending to Gemini…" : "Transcribe sample"}
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Transcription result</p>
              <p className="mt-1 font-mono-ui text-xs text-muted-foreground">
                {result ? `${result.model} · ${result.mime_type} · ${Math.round(result.bytes / 1024)} KB` : "No request yet"}
              </p>
            </div>
          </div>
          <Textarea
            readOnly
            value={[streamTranscript, streamInterim].filter(Boolean).join(streamTranscript && streamInterim ? " " : "")}
            placeholder="Realtime transcript appears here while you speak."
            className="mt-4 min-h-[120px] resize-none text-sm"
          />
          {(streaming || streamTranscript || streamInterim || streamMetrics) && (
            <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                Realtime stream
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-md border border-border bg-background px-3 py-2">
                  <p className="font-mono-ui text-[11px] text-muted-foreground">Status</p>
                  <p className="mt-1 font-mono-ui text-sm font-semibold">{streaming ? "live" : "idle"}</p>
                </div>
                <div className="rounded-md border border-border bg-background px-3 py-2">
                  <p className="font-mono-ui text-[11px] text-muted-foreground">Audio sec</p>
                  <p className="mt-1 font-mono-ui text-sm font-semibold">
                    {streamMetrics ? streamMetrics.audio_seconds.toFixed(2) : "-"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-background px-3 py-2">
                  <p className="font-mono-ui text-[11px] text-muted-foreground">Elapsed</p>
                  <p className="mt-1 font-mono-ui text-sm font-semibold">
                    {streamMetrics ? streamMetrics.elapsed_seconds.toFixed(2) : streaming ? elapsedLabel : "-"}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Cloud Speech-to-Text streaming is time-metered, not token-metered.
              </p>
            </div>
          )}
          {result && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                Batch Gemini transcript
              </p>
              <Textarea
                readOnly
                value={result.transcript}
                className="min-h-[120px] resize-none text-sm"
              />
            </div>
          )}
          {result && (
            <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                Token usage
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {tokenStats.map((stat) => (
                  <div key={stat.label} className="rounded-md border border-border bg-background px-3 py-2">
                    <p className="font-mono-ui text-[11px] text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 font-mono-ui text-sm font-semibold">
                      {typeof stat.value === "number" ? stat.value.toLocaleString() : "-"}
                    </p>
                  </div>
                ))}
              </div>
              {tokenUsage?.input_tokens_by_modality?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tokenUsage.input_tokens_by_modality.map((item) => (
                    <span
                      key={`${item.modality}-${item.tokens}`}
                      className="rounded-md border border-border bg-background px-2.5 py-1 font-mono-ui text-[11px] text-muted-foreground"
                    >
                      {item.modality}: {item.tokens.toLocaleString()}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
