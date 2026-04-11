"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Bot } from "lucide-react";
import type { AIPersonality, Conversation } from "@/types";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { http } from "@/lib/http-client";
import { telemetry } from "@/lib/telemetry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateConversationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

async function fetchPersonalities(): Promise<AIPersonality[]> {
  const response = await http.get<PaginatedResponse<AIPersonality> | AIPersonality[]>("/chat/ai-personalities/");
  
  if (Array.isArray(response.data)) {
    return response.data;
  }
  
  // Handle paginated response
  if (response.data && 'results' in response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }
  
  return [];
}

async function createConversation(
  personalityId: string
): Promise<Conversation> {
  const response = await http.post<Conversation>("/chat/conversations/", {
    ai_personality_id: personalityId,
    title: "Mentor Session",
    topic: "A fresh start",
  });
  return response.data;
}

export function CreateConversationModal({
  isOpen,
  onOpenChange,
}: CreateConversationModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSelectedConversationId = useMentorLoungeStore(
    (state) => state.setSelectedConversationId
  );
  const [selectedPersonalityId, setSelectedPersonalityId] = useState<string>("");
  
  // Fetch personalities to find the General Mentor
  const { data: personalities = [], isLoading: personalitiesLoading } =
    useQuery<AIPersonality[]>({
      queryKey: ["ai-personalities"],
      queryFn: fetchPersonalities,
      enabled: isOpen,
    });

  const selectedPersonality = useMemo(
    () => personalities.find((p) => p.id === selectedPersonalityId),
    [personalities, selectedPersonalityId],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (!personalities.length) {
      setSelectedPersonalityId("");
      return;
    }
    const generalMentor =
      personalities.find((p) => p.type === "general" || p.name.toLowerCase().includes("general")) ??
      personalities[0];
    setSelectedPersonalityId(generalMentor.id);
  }, [isOpen, personalities]);

  const createConversationMutation = useMutation<Conversation, Error, string>({
    mutationFn: createConversation,
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConversationId(newConversation.id);

      // Capture conversation started event
      posthog.capture('conversation_started', {
        conversation_id: newConversation.id,
        conversation_title: newConversation.title,
        personality_type: newConversation.ai_personality?.type,
        personality_name: newConversation.ai_personality?.name,
      });

      telemetry.toastSuccess("New mentor thread ready!");
      onOpenChange(false);
      router.push("/chat");
    },
    onError: (error) => {
      telemetry.toastError(
        "Failed to create conversation",
        error instanceof Error ? error.message : undefined
      );
    },
  });

  const handleCreate = () => {
    if (selectedPersonalityId) {
      createConversationMutation.mutate(selectedPersonalityId);
    } else {
        telemetry.toastError("No mentor personalities available.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a New Conversation</DialogTitle>
          <DialogDescription>
            Choose which mentor you want to start this session with.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
            </div>
            <div className="w-full max-w-[320px] space-y-3 text-left">
              <Select
                value={selectedPersonalityId}
                onValueChange={setSelectedPersonalityId}
                disabled={personalitiesLoading || personalities.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mentor" />
                </SelectTrigger>
                <SelectContent>
                  {personalities.map((personality) => (
                    <SelectItem key={personality.id} value={personality.id}>
                      {personality.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="rounded-md border bg-muted/30 p-3">
                <h3 className="font-medium">
                  {selectedPersonality?.name ?? "No mentor selected"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedPersonality?.description
                    ?? "Pick a mentor to begin a new conversation."}
                </p>
              </div>
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              personalitiesLoading ||
              createConversationMutation.isPending ||
              !selectedPersonalityId
            }
          >
            {createConversationMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Start Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
