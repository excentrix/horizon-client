"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Trophy, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GamificationEvent } from "@/types";

interface CelebrationToastProps {
  event: GamificationEvent;
  onDismiss: () => void;
  duration?: number;
}

const eventIcons = {
  points_earned: Sparkles,
  level_up: Crown,
  badge_earned: Trophy,
  streak_milestone: Flame,
};

const eventColors = {
  points_earned: "from-emerald-500 to-teal-500",
  level_up: "from-amber-400 to-orange-500",
  badge_earned: "from-purple-500 to-pink-500",
  streak_milestone: "from-red-500 to-orange-500",
};

export function CelebrationToast({ event, onDismiss, duration = 4000 }: CelebrationToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const Icon = eventIcons[event.event_type] || Sparkles;
  const gradient = eventColors[event.event_type] || "from-blue-500 to-indigo-500";

  const getMessage = () => {
    switch (event.event_type) {
      case "points_earned":
        return `+${event.points} XP`;
      case "level_up":
        return `Level ${event.new_level}!`;
      case "badge_earned":
        return event.badge_name || "New Badge!";
      case "streak_milestone":
        return `${event.current_streak} Day Streak!`;
      default:
        return "Achievement!";
    }
  };

  const getSubtitle = () => {
    switch (event.event_type) {
      case "points_earned":
        return event.reason || "Keep it up!";
      case "level_up":
        return `Congratulations! You advanced from Level ${event.old_level}`;
      case "badge_earned":
        return event.badge_description || "You earned a new badge!";
      case "streak_milestone":
        return "Your learning streak is on fire! 🔥";
      default:
        return "";
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          className={cn(
            "fixed top-4 right-4 z-50 pointer-events-auto",
            "w-80 rounded-xl overflow-hidden shadow-2xl",
            "border border-white/20 backdrop-blur-sm"
          )}
        >
          <div className={cn("bg-gradient-to-r p-4", gradient)}>
            <div className="flex items-start gap-3">
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="flex-shrink-0 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"
              >
                <Icon className="w-6 h-6 text-white" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <motion.p
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-xl font-bold text-white"
                >
                  {getMessage()}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-white/80 mt-0.5"
                >
                  {getSubtitle()}
                </motion.p>
              </div>
              <button
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(onDismiss, 300);
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            {/* Progress bar for timed dismissal */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: duration / 1000, ease: "linear" }}
              className="h-1 bg-white/30 mt-3 rounded-full origin-left"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ConfettiParticle {
  id: number;
  x: number;
  rotation: number;
  scale: number;
  color: string;
}

interface ConfettiBurstProps {
  active: boolean;
  particleCount?: number;
}

const confettiColors = [
  "#FFD700", "#FF6B6B", "#4ECDC4", "#9B59B6", 
  "#3498DB", "#E74C3C", "#2ECC71", "#F1C40F"
];

export function ConfettiBurst({ active, particleCount = 30 }: ConfettiBurstProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (active) {
      const newParticles: ConfettiParticle[] = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => setParticles([]), 2500);
      return () => clearTimeout(timer);
    }
  }, [active, particleCount]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ 
              y: -20, 
              x: `${particle.x}vw`,
              rotate: 0,
              opacity: 1,
            }}
            animate={{ 
              y: "100vh", 
              rotate: particle.rotation + 720,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 + Math.random(), ease: "easeIn" }}
            className="absolute w-3 h-3"
            style={{ 
              backgroundColor: particle.color,
              transform: `scale(${particle.scale})`,
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface XPProgressBarProps {
  currentXP: number;
  xpForNextLevel: number;
  level: number;
  className?: string;
  showNumbers?: boolean;
  size?: "sm" | "md" | "lg";
}

export function XPProgressBar({ 
  currentXP, 
  xpForNextLevel, 
  level, 
  className,
  showNumbers = true,
  size = "md",
}: XPProgressBarProps) {
  const percentage = Math.min(100, (currentXP / xpForNextLevel) * 100);
  
  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full", className)}>
      {showNumbers && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            Level {level}
          </span>
          <span className="text-xs text-muted-foreground">
            {currentXP} / {xpForNextLevel} XP
          </span>
        </div>
      )}
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", heights[size])}>
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
        />
      </div>
    </div>
  );
}

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
  showLongest?: boolean;
}

export function StreakDisplay({ 
  currentStreak, 
  longestStreak, 
  className,
  showLongest = true,
}: StreakDisplayProps) {
  const isOnFire = currentStreak >= 3;
  const isLegendary = currentStreak >= 30;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        animate={isOnFire ? { 
          scale: [1, 1.1, 1],
        } : {}}
        transition={{ repeat: Infinity, duration: 1 }}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium",
          isLegendary 
            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            : isOnFire 
              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
              : "bg-muted text-muted-foreground"
        )}
      >
        <Flame className={cn(
          "w-4 h-4",
          isOnFire && "text-orange-500 dark:text-orange-400"
        )} />
        <span>{currentStreak}</span>
      </motion.div>
      
      {showLongest && longestStreak > currentStreak && (
        <span className="text-xs text-muted-foreground">
          Best: {longestStreak}
        </span>
      )}
    </div>
  );
}

interface LevelBadgeProps {
  level: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LevelBadge({ level, className, size = "md" }: LevelBadgeProps) {
  const sizes = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-12 h-12 text-lg",
  };

  // Color based on level tiers
  const getColor = () => {
    if (level >= 50) return "from-amber-400 to-yellow-500"; // Gold
    if (level >= 30) return "from-slate-400 to-slate-500"; // Platinum
    if (level >= 20) return "from-purple-400 to-indigo-500"; // Diamond
    if (level >= 10) return "from-orange-400 to-red-500"; // Ruby
    if (level >= 5) return "from-emerald-400 to-teal-500"; // Emerald
    return "from-blue-400 to-indigo-500"; // Sapphire
  };

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br flex items-center justify-center font-bold text-white shadow-md",
        sizes[size],
        getColor(),
        className
      )}
    >
      {level}
    </div>
  );
}
