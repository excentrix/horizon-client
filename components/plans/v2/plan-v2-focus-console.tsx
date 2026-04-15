"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Headphones,
  Pause,
  Play,
  Radio,
  TimerReset,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TimerMode = "focus" | "short" | "long";

const TIMER_SECONDS: Record<TimerMode, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

const LOFI_STATIONS = [
  {
    id: "youtube-lofi-girl",
    label: "Lofi Girl",
    href: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    videoId: "jfKfPfyJRdk",
  },
  {
    id: "youtube-chillsynth",
    label: "Chill Synth",
    href: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
    videoId: "4xDzrJKXOOY",
  },
  {
    id: "youtube-jazzhop",
    label: "Jazzhop",
    href: "https://www.youtube.com/watch?v=5yx6BWlEVcY",
    videoId: "5yx6BWlEVcY",
  },
];

function formatTimer(value: number) {
  const min = Math.floor(value / 60);
  const sec = value % 60;
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
  loadVideoById: (videoId: string) => void;
  cueVideoById: (videoId: string) => void;
  destroy?: () => void;
};

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      height: string;
      width: string;
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void;
      };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function PlanV2FocusConsole() {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [remaining, setRemaining] = useState(TIMER_SECONDS.focus);
  const [running, setRunning] = useState(false);
  const [stationId, setStationId] = useState(LOFI_STATIONS[0].id);
  const [volume, setVolume] = useState(60);
  const [lofiPlaying, setLofiPlaying] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const loadedVideoRef = useRef<string | null>(null);

  useEffect(() => {
    setRemaining(TIMER_SECONDS[mode]);
    setRunning(false);
  }, [mode]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running]);

  const selectedStation = useMemo(
    () =>
      LOFI_STATIONS.find((station) => station.id === stationId) ??
      LOFI_STATIONS[0],
    [stationId],
  );

  const timerTotal = TIMER_SECONDS[mode];
  const timerProgress = Math.max(
    0,
    Math.min(100, ((timerTotal - remaining) / timerTotal) * 100),
  );

  useEffect(() => {
    if (window.YT?.Player) {
      setYtReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.body.appendChild(script);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      setYtReady(true);
      previousReady?.();
    };

    return () => {
      window.onYouTubeIframeAPIReady = previousReady;
    };
  }, []);

  useEffect(() => {
    if (!ytReady || !playerHostRef.current || playerRef.current) return;

    const yt = window.YT;
    if (!yt?.Player) return;

    playerRef.current = new yt.Player(playerHostRef.current, {
      height: "1",
      width: "1",
      videoId: selectedStation.videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (event) => {
          event.target.setVolume(volume);
          event.target.cueVideoById(selectedStation.videoId);
          loadedVideoRef.current = selectedStation.videoId;
        },
      },
    });
  }, [ytReady, selectedStation.videoId, volume]);

  useEffect(() => {
    if (!playerRef.current) return;
    playerRef.current.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!playerRef.current) return;

    const nextId = selectedStation.videoId;
    if (loadedVideoRef.current === nextId) return;

    if (lofiPlaying) {
      playerRef.current.loadVideoById(nextId);
    } else {
      playerRef.current.cueVideoById(nextId);
    }
    loadedVideoRef.current = nextId;
  }, [selectedStation.videoId, lofiPlaying]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, []);

  const toggleLofiPlayback = () => {
    const player = playerRef.current;
    if (!player) return;

    if (lofiPlaying) {
      player.pauseVideo();
      setLofiPlaying(false);
      return;
    }

    if (loadedVideoRef.current !== selectedStation.videoId) {
      player.loadVideoById(selectedStation.videoId);
      loadedVideoRef.current = selectedStation.videoId;
    } else {
      player.playVideo();
    }
    setLofiPlaying(true);
  };

  return (
    <section className="h-36 rounded-3xl border border-black/10 bg-white/80 p-2 shadow-[var(--shadow-1)]">
      <div className="h-full grid grid-cols-2 gap-2">
        <article className="relative h-full overflow-hidden rounded-2xl border border-[#5858CC]/20 bg-[linear-gradient(140deg,rgba(88,88,204,0.16),rgba(236,91,19,0.08))] p-2">
          <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-[#5858CC]/15 blur-xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-16 w-16 rounded-full bg-[#EC5B13]/15 blur-xl" />

          <div className="mb-1.5 flex items-center justify-between">
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${running ? "text-[#5858CC]" : "text-[#414141]/70"}`}
            >
              Pomodoro
            </p>
            {/* <Badge
              variant="outline"
              className="h-5 rounded-full border-black/15 bg-white/85 px-1.5 text-[10px] uppercase"
            >
              {mode}
            </Badge> */}
            <div className="mb-1.5 flex flex-wrap gap-1">
              {(["focus", "short", "long"] as const).map((timerMode) => (
                <Button
                  key={timerMode}
                  size="sm"
                  variant={mode === timerMode ? "default" : "outline"}
                  className={
                    mode === timerMode
                      ? "h-5 rounded-full bg-[#5858CC] px-2 text-[10px] font-medium text-white hover:bg-[#4d4db3]"
                      : "h-5 rounded-full border-black/15 bg-white/85 px-2 text-[10px] text-[#414141]/75"
                  }
                  onClick={() => setMode(timerMode)}
                >
                  {timerMode}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-1.5 rounded-xl border border-black/10 bg-white/80 px-1.5 py-1.5">
            <div className="flex items-center gap-2">
              <div
                className={`relative grid h-14 w-14 place-items-center rounded-full border border-black/10 bg-white ${running ? "shadow-[0_0_0_3px_rgba(88,88,204,0.12)]" : ""}`}
                style={{
                  background: `conic-gradient(#5858CC ${timerProgress}%, rgba(65,65,65,0.12) ${timerProgress}% 100%)`,
                }}
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-white text-[9px] font-medium text-[#414141]/70">
                  {Math.round(timerProgress)}%
                </div>
                {running ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-[#EC5B13]" />
                ) : null}
              </div>

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-10 h-16 ">
                  <span className="text-base font-semibold leading-none text-[#414141]">
                    {formatTimer(remaining)}
                  </span>
                  {/* <span className="mb-0.5 text-[10px] uppercase tracking-[0.12em] text-[#414141]/50">
                    {running ? "live" : "idle"}
                  </span> */}
                  <div className="grid grid-cols-2 gap-1.5 h-full items-center">
                    <Button
                      size="sm"
                      className="h-10 rounded-full bg-[#EC5B13] px-2 text-[10px] text-white hover:bg-[#d45110]"
                      onClick={() => setRunning((prev) => !prev)}
                    >
                      {running ? (
                        <Pause className="mr-1 h-3 w-3" />
                      ) : (
                        <Play className="mr-1 h-3 w-3" />
                      )}
                      {running ? "Pause" : "Start"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 rounded-full border-black/15 bg-white/85 px-2 text-[10px]"
                      onClick={() => {
                        setRemaining(TIMER_SECONDS[mode]);
                        setRunning(false);
                      }}
                    >
                      <TimerReset className="mr-1 h-3 w-3" />
                      Reset
                    </Button>
                  </div>
                </div>
                {/* <p className="mt-0.5 text-[10px] text-[#414141]/65">
                  {running ? "Flow session in progress" : "Ready to focus"}
                </p> */}
              </div>
            </div>

            {/* <div className="mt-1.5 flex h-1.5 items-end gap-0.5 overflow-hidden rounded-full bg-black/10 px-0.5">
              {[18, 36, 24, 48, 28, 40, 22, 52, 30, 44].map((h, i) => (
                <span
                  key={i}
                  className={`w-full rounded-full bg-gradient-to-t from-[#5858CC] to-[#EC5B13]/70 ${running ? "animate-pulse" : ""}`}
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div> */}
          </div>
        </article>

        <article className="relative h-full overflow-hidden rounded-2xl border border-black/10 bg-[#414141] p-2 text-white">
          <div className="pointer-events-none absolute -left-8 -top-8 h-20 w-20 rounded-full bg-white/10 blur-xl" />
          <div className="mb-1.5 flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
              <Headphones className="h-3.5 w-3.5 text-white" />
              Lo-fi
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-1.5 py-0.5 text-[10px] text-white/85">
              <Radio className="h-3 w-3" />
              {lofiPlaying ? "Live" : "Idle"}
            </span>
          </div>

          <div className="mb-1.5 grid grid-cols-[1fr_auto] gap-1.5">
            <select
              value={stationId}
              onChange={(event) => setStationId(event.target.value)}
              className="h-7 w-full rounded-lg border border-white/20 bg-white/10 px-2 text-[10px] text-white"
            >
              {LOFI_STATIONS.map((station) => (
                <option
                  key={station.id}
                  value={station.id}
                  className="text-black"
                >
                  {station.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              className="h-7 rounded-full bg-white px-2.5 text-[10px] text-[#414141] hover:bg-white/90"
              onClick={toggleLofiPlayback}
              disabled={!ytReady}
            >
              {lofiPlaying ? "Stop" : "Play"}
            </Button>
          </div>

          {/* <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/70">
            <span className="inline-flex items-center gap-1">
              <Waves className="h-3.5 w-3.5" />
              {selectedStation.label}
            </span>
            <span>{volume}%</span>
          </div> */}

          <div
            ref={playerHostRef}
            className="pointer-events-none absolute h-px w-px opacity-0"
          />

          <div className="mb-1.5 flex h-6 items-end gap-1 rounded-lg border border-white/15 bg-white/5 px-1.5 py-1">
            {[22, 35, 18, 46, 28, 54, 26, 38, 20].map((base, index) => {
              const scaled = Math.max(
                10,
                Math.min(90, Math.round((base * volume) / 100 + 10)),
              );
              return (
                <span
                  key={index}
                  className={`w-1.5 rounded-sm bg-gradient-to-t from-[#EC5B13] to-white/80 ${lofiPlaying ? "animate-pulse" : ""}`}
                  style={{
                    height: `${scaled}%`,
                    animationDelay: `${index * 100}ms`,
                  }}
                />
              );
            })}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-white/70">
              <span className="inline-flex items-center gap-1">
                <Volume2 className="h-3.5 w-3.5" />
                Player volume
              </span>
              <span>{volume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="w-full accent-[#EC5B13]"
            />
          </div>
        </article>
      </div>
    </section>
  );
}
