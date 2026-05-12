"use client";

import { Bot, MessageCircleMore, TriangleAlert, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AgentTurn {
  speaker?: string;
  persona_type?: string;
  text?: string;
}

interface AgentDialogueSceneProps {
  scene: {
    title?: string;
    turns?: AgentTurn[];
  };
}

function toneForSpeaker(speaker: string) {
  if (speaker === "mentor") return "bg-violet-50 border-violet-200";
  if (speaker === "peer") return "bg-sky-50 border-sky-200";
  return "bg-amber-50 border-amber-200";
}

function iconForSpeaker(speaker: string) {
  if (speaker === "mentor") return <Bot className="h-3.5 w-3.5" />;
  if (speaker === "peer") return <UserRound className="h-3.5 w-3.5" />;
  return <TriangleAlert className="h-3.5 w-3.5" />;
}

export function AgentDialogueScene({ scene }: AgentDialogueSceneProps) {
  const turns = scene.turns ?? [];

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{scene.title ?? "Agent dialogue"}</h3>
      <div className="space-y-2">
        {turns.map((turn, idx) => {
          const speaker = (turn.speaker ?? "mentor").toLowerCase();
          return (
            <article key={idx} className={`rounded-lg border p-3 ${toneForSpeaker(speaker)}`}>
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase">
                  <span className="inline-flex items-center gap-1">
                    {iconForSpeaker(speaker)}
                    {speaker}
                  </span>
                </Badge>
                {turn.persona_type ? <span className="text-[11px] text-slate-500">{turn.persona_type}</span> : null}
              </div>
              <p className="text-sm text-slate-700">{turn.text}</p>
            </article>
          );
        })}
      </div>
      <Button variant="outline" size="sm" className="h-7 text-xs">
        <MessageCircleMore className="mr-1.5 h-3.5 w-3.5" />
        Jump in with mentor
      </Button>
    </div>
  );
}
