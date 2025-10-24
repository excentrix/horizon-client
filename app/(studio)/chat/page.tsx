"use client";

import { useEffect, useState } from "react";
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
import { useAnalyzeConversation } from "@/hooks/use-intelligence";
import { telemetry } from "@/lib/telemetry";

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
  const [analysisSummary, setAnalysisSummary] = useState<Record<string, unknown> | null>(null);

  const analyzeConversation = useAnalyzeConversation();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    setComposerDraft("");
    setTypingStatus(false);
  }, [selectedConversationId, setComposerDraft, setTypingStatus]);

  const handleAnalyzeConversation = () => {
    if (!selectedConversationId) {
      telemetry.toastError("Select a conversation first");
      return;
    }

    analyzeConversation.mutate(
      { conversationId: selectedConversationId },
      {
        onSuccess: (data) => {
          setAnalysisSummary(data as Record<string, unknown>);
        },
      },
    );
  };

  const summaryAny = analysisSummary as Record<string, any> | null;
  const analysisResult = (summaryAny?.analysis_result as Record<string, any>) ?? {};
  const analysisCore =
    analysisResult?.analysis_results && typeof analysisResult.analysis_results === "object"
      ? (analysisResult.analysis_results as Record<string, any>)
      : analysisResult;
  const domainAnalysis = (analysisCore?.domain_analysis ?? {}) as Record<string, any>;
  const crisisAnalysis = (analysisCore?.crisis_analysis ?? {}) as Record<string, any>;
  const supportNeeds = (analysisCore?.support_needs ?? []) as Array<Record<string, unknown>>;
  const insightsGenerated = summaryAny?.insights_generated as number | undefined;
  const analysisMessage = summaryAny?.message as string | undefined;
  const insightsList = Array.isArray(summaryAny?.insights)
    ? (summaryAny!.insights as Array<Record<string, unknown>>)
    : [];
  const progressUpdate = summaryAny?.progress_update;

  return (
    <div className="grid h-auto min-h-0 gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="flex min-h-0 flex-col gap-4 overflow-hidden rounded-xl border bg-card/70 p-4 shadow-sm">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mentor threads
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <ConversationList
            conversations={conversations}
            isLoading={conversationsLoading}
            activeAccentClass={activeListClass}
          />
        </div>
      </aside>

      <section className="flex h-full min-h-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyzeConversation}
            disabled={!selectedConversationId || analyzeConversation.isLoading}
          >
            {analyzeConversation.isLoading ? "Analyzing..." : "Run Intelligence Analysis"}
          </Button>
        </div>

        {analysisSummary ? (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Latest analysis</CardTitle>
                {domainAnalysis?.primary_domain ? (
                  <Badge variant="secondary">{String(domainAnalysis.primary_domain)}</Badge>
                ) : null}
              </div>
              <CardDescription>
                {analysisMessage ?? "Conversation intelligence updated."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                {crisisAnalysis?.overall_urgency ? (
                  <Badge
                    variant={
                      crisisAnalysis.overall_urgency === "critical" ? "destructive" : "outline"
                    }
                  >
                    Urgency: {String(crisisAnalysis.overall_urgency)}
                  </Badge>
                ) : null}
                {typeof insightsGenerated === "number" ? (
                  <Badge variant="outline">{insightsGenerated} insights</Badge>
                ) : null}
                {progressUpdate ? (
                  <Badge variant="outline">Progress updated</Badge>
                ) : null}
              </div>

              {supportNeeds && supportNeeds.length ? (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Support needs</p>
                  <ul className="list-disc space-y-1 pl-4">
                    {supportNeeds.slice(0, 4).map((need, index) => (
                      <li key={index}>{String(need?.description ?? JSON.stringify(need))}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {insightsList.length ? (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Insights</p>
                  <ul className="space-y-1">
                    {insightsList.slice(0, 3).map((insight, index) => (
                      <li key={index} className="rounded-lg border bg-muted/30 p-2">
                        <p className="font-medium text-foreground">{String(insight.title ?? "Insight")}</p>
                        <p>{String(insight.message ?? insight.description ?? "")}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {progressUpdate ? (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Progress update</p>
                  <pre className="overflow-x-auto rounded-lg bg-muted/40 p-2 text-[10px]">
                    {JSON.stringify(progressUpdate, null, 2)}
                  </pre>
                </div>
              ) : null}

              <Separator />
              <p className="text-[10px] text-muted-foreground">
                Analysis payload preview:
                <pre className="mt-1 overflow-x-auto rounded bg-muted/30 p-2">
                  {JSON.stringify(analysisCore?.domain_analysis ?? analysisCore, null, 2)}
                </pre>
              </p>
            </CardContent>
          </Card>
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
        <MessageComposer
          disabled={
            messagesLoading ||
            !activeConversation ||
            socketStatus !== "open"
          }
          onSend={sendMessage}
          onTypingChange={setTypingStatus}
        />
      </section>
    </div>
  );
}
