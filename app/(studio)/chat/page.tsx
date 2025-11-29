"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ConversationList } from "@/components/mentor-lounge/conversation-list";
import { MessageFeed } from "@/components/mentor-lounge/message-feed";
import { MessageComposer } from "@/components/mentor-lounge/message-composer";
import { useConversations, useConversationMessages } from "@/hooks/use-conversations";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { getPersonaTheme } from "@/lib/persona-theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCreatePlanFromConversation } from "@/hooks/use-plans";
import { useAnalyzeConversation } from "@/hooks/use-intelligence";
import { telemetry } from "@/lib/telemetry";
import { CreateConversationModal } from "@/components/mentor-lounge/create-conversation-modal";
import { PlusCircle } from 'lucide-react';
import type { PlanCreationResponse } from "@/types";
import { useNotifications } from "@/context/NotificationContext";
import { IntelligenceStatus } from "@/components/mentor-lounge/intelligence-status";

export default function ChatPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const selectedConversationId = useMentorLoungeStore(
    (state) => state.selectedConversationId,
  );
  const setComposerDraft = useMentorLoungeStore(
    (state) => state.setComposerDraft,
  );
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
  } = useConversations();

  const {
    messages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: messagesLoading,
  } = useConversationMessages(selectedConversationId);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );

  const {
    status: socketStatus,
    error: socketError,
    sendMessage,
    mentorTyping,
    streamingMessage,
    setTypingStatus,
  } = useChatSocket(selectedConversationId ?? null);

  const personaTheme = getPersonaTheme(activeConversation?.ai_personality);
  const activeListClass = personaTheme.conversationActive;
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [analysisByConversation, setAnalysisByConversation] = useState<Record<string, Record<string, unknown>>>({});
  const [latestPlan, setLatestPlan] = useState<PlanCreationResponse | null>(null);
  const processedAnalysisRef = useRef<Map<string, string>>(new Map());

  const analyzeConversation = useAnalyzeConversation();
  const createPlan = useCreatePlanFromConversation();
  const { notifications } = useNotifications();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    setComposerDraft("");
    setTypingStatus(false);
    setLatestPlan(null);
  }, [selectedConversationId, setComposerDraft, setTypingStatus]);

  useEffect(() => {
    if (!notifications.length) {
      return;
    }

    notifications.forEach((entry) => {
      const record = entry as unknown as Record<string, unknown>;
      const candidate = (record?.data as unknown) ?? record;

      if (!candidate || typeof candidate !== "object") {
        return;
      }

      const payload = candidate as Record<string, unknown>;
      const conversationId =
        (payload.conversation_id as string | undefined) ??
        (payload.session_id as string | undefined);

      if (!conversationId) {
        return;
      }

      const hasAnalysisSummary =
        "analysis_result" in payload ||
        "analysis_results" in payload ||
        "insights" in payload ||
        "insights_generated" in payload;

      const isStageUpdate = payload.event === "analysis_stage";

      if (!hasAnalysisSummary && !isStageUpdate) {
        return;
      }

      setAnalysisByConversation((previous) => {
        // For stage updates, we just want to update the message
        if (isStageUpdate) {
           const stageName = (payload.stage as string).replace(/_/g, " ");
           return {
             ...previous,
             [conversationId]: {
               ...(previous[conversationId] || {}),
               message: `Analysis in progress: ${stageName}`,
               progress_update: { status: payload.stage }
             }
           };
        }

        const fingerprint = JSON.stringify(payload);
        const previousFingerprint = processedAnalysisRef.current.get(conversationId);
        if (previousFingerprint === fingerprint) {
          return previous;
        }

        const snapshot = { ...payload };

        processedAnalysisRef.current.set(conversationId, fingerprint);

        return {
          ...previous,
          [conversationId]: snapshot,
        };
      });
    });
  }, [notifications]);

  const analysisSummary = selectedConversationId
    ? analysisByConversation[selectedConversationId] ?? null
    : null;

  const handleAnalyzeConversation = (force: boolean = false) => {
    if (!selectedConversationId) {
      telemetry.toastError("Select a conversation first");
      return;
    }
    analyzeConversation.mutate(
      { conversationId: selectedConversationId, forceReanalysis: force },
      {
        onSuccess: (data) => {
          if (selectedConversationId && data && typeof data === "object") {
            setAnalysisByConversation((previous) => ({
              ...previous,
              [selectedConversationId]: data as Record<string, unknown>,
            }));
          }
        },
      }
    );
  };

  const handleCreatePlan = () => {
    if (!selectedConversationId) {
      telemetry.toastError("Select a conversation first");
      return;
    }
    setLatestPlan(null);
    createPlan.mutate(
      { conversationId: selectedConversationId },
      {
        onSuccess: (data) => {
          if (data?.learning_plan_id) {
            router.prefetch(`/plans?plan=${data.learning_plan_id}`);
          }
          setLatestPlan(data);
        },
        onError: (error) => {
          telemetry.error("Plan creation request failed", { error });
        },
      },
    );
  };

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col overflow-hidden bg-background">
      <CreateConversationModal
        isOpen={isCreateModalOpen}
        onOpenChange={setCreateModalOpen}
      />
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="flex h-full w-full flex-col border-b bg-card/60 backdrop-blur lg:w-80 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-5 lg:py-4">
            <div>
              <h2 className="text-lg font-semibold leading-tight">Conversations</h2>
              <p className="text-xs text-muted-foreground">
                Your general mentor adapts as you explore plans and goals.
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCreateModalOpen(true)}>
              <PlusCircle className="h-6 w-6" />
            </Button>
          </div>
          <Separator />
          <div className="flex-1 overflow-y-auto px-4 py-3 lg:px-3">
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              isLoading={conversationsLoading}
              activeClass={activeListClass}
            />
          </div>
        </aside>
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
          {activeConversation ? (
            <>
              <header className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">{activeConversation.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {activeConversation.ai_personality?.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnalyzeConversation(false)}
                      disabled={!selectedConversationId || analyzeConversation.isPending}
                    >
                      {analyzeConversation.isPending ? "Analyzing..." : "Run Intelligence Analysis"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnalyzeConversation(true)}
                      disabled={!selectedConversationId || analyzeConversation.isPending}
                    >
                      Force Reanalysis
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreatePlan}
                      disabled={!selectedConversationId || createPlan.isPending}
                    >
                      {createPlan.isPending ? "Creating Plan..." : "Create Plan from Conversation"}
                    </Button>
                  </div>
                </div>
              </header>
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="flex h-full min-h-0 flex-col gap-4 px-4 pb-4 pt-2 lg:px-6 lg:pb-6">
                  {latestPlan ? (
                    <Card>
                      <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardTitle className="text-base">Plan generated</CardTitle>
                          {latestPlan.plan_title ? (
                            <Badge variant="outline">{latestPlan.plan_title}</Badge>
                          ) : null}
                        </div>
                        <CardDescription>
                          {latestPlan.task_count
                            ? `We queued ${latestPlan.task_count} tasks for you.`
                            : "A fresh learning journey is ready."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div className="space-y-1">
                          {latestPlan.estimated_duration ? (
                            <p>
                              Estimated duration: {latestPlan.estimated_duration} hours
                            </p>
                          ) : null}
                          {latestPlan.mentor_id ? (
                            <p>
                              Specialist mentor unlocked while the plan is active. Let&apos;s invite them when you need focused guidance.
                            </p>
                          ) : (
                            <p>
                              Your general mentor will weave this plan into upcoming chats.
                            </p>
                          )}
                        </div>
                        <Button asChild size="sm">
                          <Link
                            href={
                              latestPlan.learning_plan_id
                                ? `/plans?plan=${latestPlan.learning_plan_id}`
                                : "/plans"
                            }
                          >
                            View plan
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ) : null}
                  {analysisSummary ? (
                    <IntelligenceStatus analysisSummary={analysisSummary} />
                  ) : null}
                  <div className="min-h-0 flex-1">
                    <MessageFeed
                      conversation={activeConversation}
                      messages={messages}
                      isLoading={messagesLoading}
                      connectionStatus={socketStatus}
                      connectionError={socketError}
                      hasMore={hasNextPage}
                      onLoadMore={async () => {
                        if (hasNextPage && !isFetchingNextPage) {
                          await fetchNextPage();
                        }
                      }}
                      isLoadingMore={isFetchingNextPage}
                      mentorTyping={mentorTyping}
                      streamingMessage={streamingMessage}
                      theme={personaTheme}
                    />
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <MessageComposer
                  disabled={
                    messagesLoading ||
                    !activeConversation ||
                    socketStatus !== "open"
                  }
                  onSend={sendMessage}
                  onTypingChange={setTypingStatus}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Card className="w-96 text-center">
                <CardHeader>
                  <CardTitle>Welcome to the Mentor Lounge</CardTitle>
                  <CardDescription>
                    Select a conversation from the list on the left, or start a new one to begin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setCreateModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Start New Conversation
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
