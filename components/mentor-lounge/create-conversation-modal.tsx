"use client";


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
import { Loader2, Bot } from "lucide-react";
import type { AIPersonality, Conversation } from "@/types";
import { useMentorLoungeStore } from "@/stores/mentor-lounge-store";
import { http } from "@/lib/http-client";
import { telemetry } from "@/lib/telemetry";

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
  
  // Fetch personalities to find the General Mentor
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
    // Find General Mentor or default to first available
    const personalitiesArray = Array.isArray(personalities) ? personalities : [];
    // Use type assertion or check name since 'general' might not be in the strict type definition yet
    const generalMentor = personalitiesArray.find(p => p.type === "general" || p.name.toLowerCase().includes("general")) || personalitiesArray[0];

    if (generalMentor) {
      createConversationMutation.mutate(generalMentor.id);
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
            Start a fresh session with your General Adaptive Mentor.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
                <h3 className="font-medium">General Adaptive Mentor</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-[260px] mx-auto">
                    Your primary guide for exploring goals, creating plans, and navigating your learning journey.
                </p>
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={personalitiesLoading || createConversationMutation.isPending}
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
