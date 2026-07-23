"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { chatApi, pathfinderApi, type PathfinderSession } from "@/lib/api";
import type { ChatMessage, MentorAction } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Paperclip, Sparkles } from "lucide-react";
import { PathfinderHeader } from "../_components/PathfinderHeader";
import { ChatThread } from "../_components/ChatThread";
import { EvidenceShareDialog } from "../_components/EvidenceShareDialog";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 45000;
const MAX_COMPOSER_HEIGHT = 160;

// Module-level (not a ref/state) so it survives React Strict Mode's dev-only mount → unmount →
// remount cycle, which resets component state/refs and would otherwise double-fire the auto-start
// effect below, sending the opening message twice. Real fix for the duplicate-conversation race is
// PathfinderSessionViewSet.ensure_conversation (atomic on the backend); this is belt-and-suspenders
// against the duplicate-*message* case specifically.
const kickedOffSessions = new Set<string>();

export default function PathfinderConversationPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params?.sessionId ?? "";

  const [session, setSession] = useState<PathfinderSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [waitingForReply, setWaitingForReply] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadMessages = useCallback(async (conversationId: string) => {
    const list = await chatApi.fetchMessages(conversationId);
    setMessages(list);
    return list;
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    pathfinderApi.getSession(sessionId).then(async (s) => {
      setSession(s);
      if (s.current_step === "report_ready") {
        router.replace(`/pathfinder/${sessionId}/report`);
        return;
      }
      if (s.conversation) {
        await loadMessages(s.conversation);
      }
    });
  }, [sessionId, loadMessages, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, waitingForReply]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }, [draft]);

  const latestAction: MentorAction | undefined = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const actions = (messages[i].metadata?.ui_actions as MentorAction[] | undefined) ?? [];
      const found = actions.find((a) => a.type === "trigger_pathfinder_report");
      if (found) return found;
      if (messages[i].sender_type === "user") break;
    }
    return undefined;
  })();

  const pollForReply = useCallback(
    async (conversationId: string, sinceCount: number) => {
      const start = Date.now();
      setWaitingForReply(true);
      try {
        while (Date.now() - start < POLL_TIMEOUT_MS) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          const list = await loadMessages(conversationId);
          if (list.length > sinceCount) return;
        }
        setLoadError("The mentor is taking longer than usual to reply. Try sending another message.");
      } finally {
        setWaitingForReply(false);
      }
    },
    [loadMessages]
  );

  const sendContent = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !session) return;
      setSending(true);
      setLoadError(null);
      setWaitingForReply(true);

      // Optimistic bubble — the actual round trip (create message, wellness check, etc.) can take
      // a few seconds; don't leave the student staring at nothing while it happens.
      const optimisticId = `optimistic-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          content: trimmed,
          message_type: "text",
          sender_type: "user",
          sequence_number: prev.length + 1,
          is_edited: false,
          is_flagged: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      try {
        let conversationId = session.conversation;
        if (!conversationId) {
          const result = await pathfinderApi.ensureConversation(session.id);
          conversationId = result.conversation;
          setSession((prev) => (prev ? { ...prev, conversation: conversationId } : prev));
        }
        const currentCount = messages.length;
        await chatApi.sendMessage(conversationId, { content: trimmed });
        const list = await loadMessages(conversationId);
        await pollForReply(conversationId, Math.max(list.length, currentCount + 1));
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setLoadError(
          "Couldn't reach the mentor. If this keeps happening, the chat feature may be disabled for this environment — check with your admin."
        );
      } finally {
        setSending(false);
        setWaitingForReply(false);
      }
    },
    [session, messages.length, loadMessages, pollForReply]
  );

  // Auto-start the conversation: the student already stated their aspiration on the entry page —
  // don't make them type it again into a blank composer. Kick it off as the opening message.
  useEffect(() => {
    if (!session || session.conversation || kickedOffSessions.has(session.id)) return;
    kickedOffSessions.add(session.id);
    sendContent(session.stated_aspiration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleSend = async () => {
    const content = draft;
    setDraft("");
    await sendContent(content);
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await pathfinderApi.generateReport(sessionId);
      router.push(`/pathfinder/${sessionId}/report`);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (!session) {
    return (
      <>
        <PathfinderHeader />
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-background to-muted/20">
      <PathfinderHeader />
      <div className="mx-auto flex w-full max-w-2xl flex-1 min-h-0 flex-col px-4 py-5">
        <div className="mb-4 shrink-0">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Pathfinder</p>
          <h1 className="text-lg font-semibold leading-snug">{session.stated_aspiration}</h1>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <ChatThread messages={messages} waitingForReply={waitingForReply} loadError={loadError} />
          <div ref={bottomRef} />
        </div>

        {latestAction && (
          <Button
            className="mb-3 mt-3 w-full shadow-sm"
            variant="secondary"
            onClick={handleGenerateReport}
            disabled={generatingReport}
          >
            {generatingReport ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {latestAction.label}
          </Button>
        )}

        <div className="mt-3 flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="relative shrink-0 rounded-full"
            onClick={() => setShareOpen(true)}
            title="Share something you've made"
          >
            <Paperclip className="h-4 w-4" />
            {evidenceCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {evidenceCount}
              </span>
            )}
          </Button>
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Tell me what you're thinking..."
            rows={1}
            className="max-h-40 flex-1 resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            size="icon"
            className="shrink-0 rounded-full"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <EvidenceShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        sessionId={sessionId}
        onShared={() => {
          setEvidenceCount((c) => c + 1);
          toast.success("Shared — the mentor will factor this in.");
        }}
      />
    </div>
  );
}
