"use client";

import { Fragment } from "react";
import type { ChatMessage } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Compass, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return "Today";
  return date.toLocaleDateString([], { month: "long", day: "numeric" });
}

interface ChatThreadProps {
  messages: ChatMessage[];
  waitingForReply: boolean;
  loadError: string | null;
}

export function ChatThread({ messages, waitingForReply, loadError }: ChatThreadProps) {
  // Group consecutive messages from the same sender so the avatar/label only shows once per group.
  const groups: ChatMessage[][] = [];
  for (const message of messages) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup[0].sender_type === message.sender_type) {
      lastGroup.push(message);
    } else {
      groups.push([message]);
    }
  }

  let lastDayLabel = "";

  return (
    <div className="space-y-5">
      {messages.length === 0 && !waitingForReply && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Starting your conversation…
        </div>
      )}

      {groups.map((group, gi) => {
        const isUser = group[0].sender_type === "user";
        const dayLabel = formatDayLabel(group[0].created_at);
        const showDayDivider = dayLabel !== lastDayLabel;
        lastDayLabel = dayLabel;

        return (
          <Fragment key={group[0].id}>
            {showDayDivider && (
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {dayLabel}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <div className={cn("flex items-end gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
              {!isUser && (
                <Avatar className="mb-1 size-7 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Compass className="size-3.5" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={cn("flex max-w-[78%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
                {!isUser && gi === 0 && (
                  <span className="px-1 text-xs font-medium text-muted-foreground">Pathfinder Mentor</span>
                )}
                {group.map((message, mi) => {
                  const isAttachmentNotice = message.message_type === "system";
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "whitespace-pre-wrap px-4 py-2.5 text-sm leading-relaxed",
                        isUser
                          ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-2xl rounded-bl-md bg-muted text-foreground",
                        isAttachmentNotice && "flex items-center gap-2 italic text-muted-foreground"
                      )}
                    >
                      {isAttachmentNotice && <Paperclip className="size-3.5 shrink-0" />}
                      {message.content}
                      {mi === group.length - 1 && (
                        <span
                          className={cn(
                            "ml-2 inline-block align-bottom text-[10px] opacity-60",
                            isUser ? "text-primary-foreground" : "text-muted-foreground"
                          )}
                        >
                          {formatTime(message.created_at)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Fragment>
        );
      })}

      {waitingForReply && (
        <div className="flex items-end gap-2">
          <Avatar className="mb-1 size-7 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary">
              <Compass className="size-3.5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
          </div>
        </div>
      )}

      {loadError && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{loadError}</p>
      )}
    </div>
  );
}
