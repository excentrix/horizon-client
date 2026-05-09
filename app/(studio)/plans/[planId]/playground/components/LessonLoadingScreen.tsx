"use client";

import { useEffect, useState, useMemo } from "react";
import type { DailyTask } from "@/types";
import type { LessonProgress, LessonStage } from "@/hooks/use-notifications";

interface Props {
  task: DailyTask;
  lessonProgress: LessonProgress | null;
}

const STAGE_CONFIG: Record<LessonStage, { label: string; color: string; nodeTarget: number }> = {
  analyzing:   { label: "Reading your learning profile",   color: "#818cf8", nodeTarget: 2  },
  structuring: { label: "Designing your scene sequence",   color: "#a78bfa", nodeTarget: 5  },
  crafting:    { label: "Crafting your scenes",            color: "#c084fc", nodeTarget: 10 },
  finalizing:  { label: "Preparing your experience",       color: "#e879f9", nodeTarget: 12 },
};

const FALLBACK_SEQUENCE: { stage: LessonStage; delay: number }[] = [
  { stage: "analyzing",   delay: 600  },
  { stage: "structuring", delay: 3500 },
  { stage: "crafting",    delay: 6500 },
  { stage: "finalizing",  delay: 10000 },
];

// 12 constellation node positions (6 inner ring r=78, 6 outer ring r=128)
const NODE_POSITIONS = [
  { x: 278, y: 200 }, { x: 239, y: 268 }, { x: 161, y: 268 },
  { x: 122, y: 200 }, { x: 161, y: 132 }, { x: 239, y: 132 },
  { x: 328, y: 200 }, { x: 264, y: 311 }, { x: 136, y: 311 },
  { x: 72,  y: 200 }, { x: 136, y: 89  }, { x: 264, y: 89  },
];

// Connection lines: [from, to] indices
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,0],
  [6,7],[7,8],[8,9],[9,10],[10,11],[11,6],
  [0,6],[2,8],[4,10],
];

function pathLength(a: typeof NODE_POSITIONS[0], b: typeof NODE_POSITIONS[0]) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

// Stable seeded particles so there's no hydration mismatch
const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const seed = (i * 7919 + 1) % 1000;
  return {
    x: ((seed * 37 + 200) % 100),
    y: ((seed * 61 + 100) % 100),
    size: 1 + (seed % 3),
    duration: 8 + (seed % 12),
    delay: -(seed % 10),
    drift: -20 + (seed % 40),
  };
});

export function LessonLoadingScreen({ task, lessonProgress }: Props) {
  const [stage, setStage] = useState<LessonStage>("analyzing");
  const [message, setMessage] = useState("Preparing your personalized lesson…");
  const [visibleNodes, setVisibleNodes] = useState(0);
  const [tick, setTick] = useState(0);

  // Fallback auto-advance when no WS
  useEffect(() => {
    if (lessonProgress) return;
    const timers = FALLBACK_SEQUENCE.map(({ stage: s, delay }) =>
      setTimeout(() => setStage(s), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [lessonProgress]);

  // WS-driven stage update
  useEffect(() => {
    if (!lessonProgress) return;
    setStage(lessonProgress.stage);
    setMessage(lessonProgress.message);
  }, [lessonProgress]);

  // Gradually reveal nodes toward target
  useEffect(() => {
    const target = lessonProgress?.total_scenes
      ? Math.min(lessonProgress.scene_index != null ? lessonProgress.scene_index + 1 : visibleNodes, 12)
      : STAGE_CONFIG[stage].nodeTarget;

    if (visibleNodes >= target) return;
    const id = setInterval(() => {
      setVisibleNodes(n => {
        if (n >= target) { clearInterval(id); return n; }
        return n + 1;
      });
    }, 250);
    return () => clearInterval(id);
  }, [stage, lessonProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick for animated elements that need JS control
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  const cfg = STAGE_CONFIG[stage];

  const activeConnections = useMemo(() =>
    CONNECTIONS.filter(([a, b]) => a < visibleNodes && b < visibleNodes),
    [visibleNodes]
  );

  const totalScenes = lessonProgress?.total_scenes;
  const sceneIndex = lessonProgress?.scene_index;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden select-none"
      style={{ background: "radial-gradient(ellipse at 50% 40%, #1a0a3e 0%, #0d0620 55%, #050210 100%)" }}>

      <style>{`
        @keyframes spin-cw  { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
        @keyframes spin-ccw { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
        @keyframes spin-mid { from { transform: rotate(30deg);  } to { transform: rotate(390deg);  } }
        @keyframes pulse-orb {
          0%, 100% { opacity: 0.85; transform: scale(1);    }
          50%       { opacity: 1;    transform: scale(1.06); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.18; }
          50%       { opacity: 0.32; }
        }
        @keyframes draw-line {
          from { stroke-dashoffset: 300; }
          to   { stroke-dashoffset: 0;   }
        }
        @keyframes node-in {
          from { opacity: 0; transform: scale(0.3); }
          to   { opacity: 1; transform: scale(1);   }
        }
        @keyframes float-up {
          0%   { transform: translateY(0px)  translateX(0px);  opacity: 0;   }
          10%  { opacity: 0.7; }
          90%  { opacity: 0.4; }
          100% { transform: translateY(-120px) translateX(var(--drift)); opacity: 0; }
        }
        @keyframes fade-stage {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        @keyframes scan-beam {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Particle field */}
      <div className="absolute inset-0 pointer-events-none">
        {PARTICLES.map((p, i) => (
          <div key={i}
            className="absolute rounded-full bg-violet-300"
            style={{
              left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size,
              // @ts-expect-error custom property
              "--drift": `${p.drift}px`,
              animation: `float-up ${p.duration}s ${p.delay}s ease-in-out infinite`,
              opacity: 0,
            }} />
        ))}
      </div>

      {/* Task title */}
      <p className="relative z-10 mb-8 text-xs font-medium tracking-widest uppercase text-violet-400/60">
        {task.title}
      </p>

      {/* Main SVG visualization */}
      <div className="relative z-10" style={{ width: 320, height: 320 }}>
        <svg viewBox="0 0 400 400" width={320} height={320} fill="none"
          style={{ overflow: "visible" }}>
          <defs>
            <radialGradient id="bg-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={cfg.color} stopOpacity="0.20" />
              <stop offset="100%" stopColor={cfg.color} stopOpacity="0"    />
            </radialGradient>
            <radialGradient id="orb-outer" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={cfg.color} stopOpacity="0.6" />
              <stop offset="100%" stopColor="#7c3aed"   stopOpacity="0"   />
            </radialGradient>
            <radialGradient id="orb-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="60%"  stopColor={cfg.color} stopOpacity="0.9" />
              <stop offset="100%" stopColor="#4c1d95"  stopOpacity="0"   />
            </radialGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="soft-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
          </defs>

          {/* Ambient glow behind everything */}
          <circle cx="200" cy="200" r="160" fill="url(#bg-glow)"
            style={{ animation: "pulse-glow 3s ease-in-out infinite" }} />

          {/* Orbital ring 1 — near horizontal, fast */}
          <g style={{
            transformOrigin: "200px 200px",
            animation: "spin-cw 7s linear infinite",
          }}>
            <ellipse cx="200" cy="200" rx="118" ry="38"
              stroke={cfg.color} strokeWidth="1" strokeOpacity="0.35" strokeDasharray="5 4" />
            <circle cx="318" cy="200" r="4.5" fill={cfg.color} filter="url(#glow)" />
          </g>

          {/* Orbital ring 2 — tilted 58°, slow */}
          <g style={{
            transformOrigin: "200px 200px",
            transform: "rotate(58deg)",
            animation: "spin-ccw 11s linear infinite",
          }}>
            <ellipse cx="200" cy="200" rx="112" ry="28"
              stroke={cfg.color} strokeWidth="1" strokeOpacity="0.25" strokeDasharray="3 5" />
            <circle cx="312" cy="200" r="3.5" fill={cfg.color} opacity="0.8" filter="url(#glow)" />
          </g>

          {/* Orbital ring 3 — tilted -38°, medium */}
          <g style={{
            transformOrigin: "200px 200px",
            transform: "rotate(-38deg)",
            animation: "spin-mid 14s linear infinite",
          }}>
            <ellipse cx="200" cy="200" rx="105" ry="22"
              stroke={cfg.color} strokeWidth="1" strokeOpacity="0.20" strokeDasharray="2 6" />
            <circle cx="305" cy="200" r="3" fill={cfg.color} opacity="0.6" />
          </g>

          {/* Connection lines between visible nodes */}
          {activeConnections.map(([a, b], i) => {
            const na = NODE_POSITIONS[a], nb = NODE_POSITIONS[b];
            const len = pathLength(na, nb);
            return (
              <line key={`c-${a}-${b}`}
                x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={cfg.color} strokeWidth="0.8" strokeOpacity="0.35"
                strokeDasharray={`${len} ${len}`}
                style={{
                  strokeDashoffset: 0,
                  animation: `draw-line 0.6s ease-out ${i * 0.04}s both`,
                }}
              />
            );
          })}

          {/* Constellation nodes */}
          {NODE_POSITIONS.map((pos, i) => (
            <g key={`n-${i}`}
              style={{
                transformOrigin: `${pos.x}px ${pos.y}px`,
                opacity: i < visibleNodes ? 1 : 0,
                animation: i < visibleNodes ? `node-in 0.4s ease-out both` : undefined,
                transition: "opacity 0.3s",
              }}>
              {/* Outer ring */}
              <circle cx={pos.x} cy={pos.y} r="9" fill="none"
                stroke={cfg.color} strokeWidth="1" strokeOpacity="0.4" />
              {/* Inner dot */}
              <circle cx={pos.x} cy={pos.y} r="4" fill={cfg.color}
                filter="url(#glow)" />
            </g>
          ))}

          {/* Scan beam (rotating line from center, subtle) */}
          <g style={{
            transformOrigin: "200px 200px",
            animation: "scan-beam 4s linear infinite",
          }}>
            <line x1="200" y1="200" x2="200" y2="68"
              stroke={cfg.color} strokeWidth="1" strokeOpacity="0.15"
              style={{ filter: `drop-shadow(0 0 4px ${cfg.color})` }} />
          </g>

          {/* Central orb — 3 layers */}
          <circle cx="200" cy="200" r="52" fill="url(#orb-outer)"
            style={{ animation: "pulse-glow 2.5s ease-in-out infinite" }}
            filter="url(#soft-glow)" />
          <circle cx="200" cy="200" r="28" fill="url(#orb-core)"
            style={{ animation: "pulse-orb 2.5s ease-in-out infinite" }}
            filter="url(#glow)" />
          <circle cx="200" cy="200" r="10" fill="white" opacity="0.9"
            style={{ animation: "pulse-orb 2.5s ease-in-out infinite" }} />
        </svg>

        {/* Scene counter badge — floats over the orb */}
        {stage === "crafting" && totalScenes != null && sceneIndex != null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="mt-2 tabular-nums text-white/80 text-xs font-mono"
              style={{ textShadow: `0 0 12px ${cfg.color}` }}>
              {sceneIndex + 1} / {totalScenes}
            </div>
          </div>
        )}
      </div>

      {/* Stage label */}
      <div key={stage} className="relative z-10 mt-8 text-center"
        style={{ animation: "fade-stage 0.5s ease-out both" }}>
        <h2 className="text-xl font-semibold text-white/90 tracking-tight"
          style={{ textShadow: `0 0 20px ${cfg.color}88` }}>
          {STAGE_CONFIG[stage].label}
        </h2>
        <p className="mt-2 text-sm text-white/45 max-w-xs mx-auto">
          {message || "Building your personalized experience…"}
        </p>
      </div>

      {/* Stage progress dots */}
      <div className="relative z-10 flex items-center gap-3 mt-8">
        {(Object.keys(STAGE_CONFIG) as LessonStage[]).map((s) => {
          const stages = Object.keys(STAGE_CONFIG) as LessonStage[];
          const current = stages.indexOf(stage);
          const idx = stages.indexOf(s);
          const done = idx < current;
          const active = idx === current;
          return (
            <div key={s}
              className="rounded-full transition-all duration-500"
              style={{
                width: active ? 28 : done ? 8 : 6,
                height: 6,
                background: active ? cfg.color : done ? `${cfg.color}88` : "rgba(255,255,255,0.15)",
                boxShadow: active ? `0 0 10px ${cfg.color}` : undefined,
              }} />
          );
        })}
      </div>

      {/* Subtle bottom vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to top, #050210 0%, transparent 100%)" }} />
    </div>
  );
}
