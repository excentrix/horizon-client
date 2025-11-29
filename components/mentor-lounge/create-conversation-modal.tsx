"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Bot } from "lucide-react";
import type { AIPersonality, Conversation } from "@/types";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { http } from "@/lib/http-client";
import { telemetry } from "@/lib/telemetry";

interface CreateConversationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

async function fetchPersonalities(): Promise<AIPersonality[]> {
  const response = await http.get<AIPersonality[]>("/chat/ai-personalities/");
  // Ensure we return an array
  return Array.isArray(response.data) ? response.data : [];
}

async function createConversation(
  personalityId: string
): Promise<Conversation> {
  const response = await http.post<Conversation>("/chat/conversations/", {
    ai_personality_id: personalityId,
    title: "New Conversation",
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
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(
    null
  );

  const { data: personalities = [], isLoading: personalitiesLoading } =
    useQuery<AIPersonality[]>({
      queryKey: ["ai-personalities"],
      queryFn: fetchPersonalities,
      enabled: isOpen,
    });

  const createConversationMutation = useMutation<Conversation, Error, string>({
    mutationFn: createConversation,
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConversationId(newConversation.id);
      setSelectedPersonality(null);
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
    if (selectedPersonality) {
      createConversationMutation.mutate(selectedPersonality);
    }
  };

  // Ensure personalities is always an array
  const personalitiesArray = Array.isArray(personalities) ? personalities : [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Start a New Conversation</DialogTitle>
          <DialogDescription>
            Choose a mentor personality to begin your new chat.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {personalitiesLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : personalitiesArray.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              No personalities available
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-1">
              {personalitiesArray.map((p) => (
                <Card
                  key={p.id}
                  onClick={() => setSelectedPersonality(p.id)}
                  className={`cursor-pointer transition-all ${
                    selectedPersonality === p.id
                      ? "border-primary ring-2 ring-primary"
                      : "hover:border-muted-foreground"
                  }`}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <Bot className="h-6 w-6 text-muted-foreground mt-1" />
                    <div>
                      <h3 className="font-semibold">{p.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {p.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={
              !selectedPersonality || createConversationMutation.isPending
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
