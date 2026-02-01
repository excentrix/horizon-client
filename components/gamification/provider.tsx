"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { GamificationEvent } from "@/types";
import { CelebrationToast, ConfettiBurst } from "./celebration";

interface GamificationContextValue {
  showCelebration: (event: GamificationEvent) => void;
  triggerConfetti: () => void;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

export function useGamificationContext() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error("useGamificationContext must be used within GamificationProvider");
  }
  return context;
}

interface GamificationProviderProps {
  children: ReactNode;
}

export function GamificationProvider({ children }: GamificationProviderProps) {
  const [events, setEvents] = useState<GamificationEvent[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const queryClient = useQueryClient();

  const showCelebration = useCallback((event: GamificationEvent) => {
    setEvents((prev) => [...prev, event]);

    // Trigger confetti for major events
    if (event.event_type === "level_up" || event.event_type === "badge_earned") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    }

    // Invalidate gamification queries
    queryClient.invalidateQueries({ queryKey: ["gamification"] });
  }, [queryClient]);

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 100);
  }, []);

  const dismissEvent = useCallback((index: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Listen for gamification events from WebSocket
  useEffect(() => {
    const handleGamificationUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<GamificationEvent>;
      if (customEvent.detail) {
        showCelebration(customEvent.detail);
      }
    };

    window.addEventListener("gamification:update", handleGamificationUpdate);
    return () => {
      window.removeEventListener("gamification:update", handleGamificationUpdate);
    };
  }, [showCelebration]);

  return (
    <GamificationContext.Provider value={{ showCelebration, triggerConfetti }}>
      {children}
      
      {/* Confetti overlay */}
      <ConfettiBurst active={showConfetti} particleCount={40} />
      
      {/* Event toasts - show up to 3 at a time */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        {events.slice(0, 3).map((event, index) => (
          <div key={`${event.event_type}-${event.timestamp}-${index}`} className="pointer-events-auto">
            <CelebrationToast
              event={event}
              onDismiss={() => dismissEvent(index)}
              duration={event.event_type === "level_up" ? 6000 : 4000}
            />
          </div>
        ))}
      </div>
    </GamificationContext.Provider>
  );
}
