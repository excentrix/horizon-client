"use client";
import { BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";

export function AgentIndicator() {
  const activeAgent = useMentorLoungeStore((state) => state.activeAgent);

  return (
    <AnimatePresence>
      {activeAgent ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-full border border-emerald-100 dark:border-emerald-800/50"
        >
          <BrainCircuit className="h-3.5 w-3.5 animate-pulse" />
          <span>Mentor Mode: {activeAgent.name}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
