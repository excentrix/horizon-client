"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { authApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { telemetry } from "@/lib/telemetry";

interface OnboardingQuestion {
  key: string;
  prompt: string;
  placeholder?: string;
  field: "full_name" | "university" | "career_goals" | "learning_style";
}

const QUESTIONS: OnboardingQuestion[] = [
  {
    key: "name",
    prompt: "Hey there! I'm your mentor. What's your name?",
    placeholder: "I'm Alex Rivera",
    field: "full_name",
  },
  {
    key: "university",
    prompt: "Awesome, where are you studying or training right now?",
    placeholder: "University of Horizon",
    field: "university",
  },
  {
    key: "goals",
    prompt: "What's one goal you're chasing this semester?",
    placeholder: "Land a UX internship",
    field: "career_goals",
  },
  {
    key: "style",
    prompt: "Which learning vibe suits you best (visual, auditory, hands-on, reading/writing)?",
    placeholder: "Hands-on & visual",
    field: "learning_style",
  },
];

interface Message {
  id: string;
  sender: "mentor" | "user";
  text: string;
}

export default function OnboardingPage() {
  const { refreshProfile } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: crypto.randomUUID(),
      sender: "mentor",
      text: "Welcome to Horizon Studio! Let's personalize your experience in four quick beats.",
    },
    {
      id: crypto.randomUUID(),
      sender: "mentor",
      text: QUESTIONS[0].prompt,
    },
  ]);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState("");
  const [responses, setResponses] = useState<Partial<Record<OnboardingQuestion["field"], string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const container = document.getElementById("onboarding-scroll");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async () => {
    const currentQuestion = QUESTIONS[step];
    const trimmed = draft.trim();
    if (!currentQuestion || !trimmed) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    const nextResponses = {
      ...responses,
      [currentQuestion.field]: trimmed,
    } as Partial<Record<OnboardingQuestion["field"], string>>;
    setResponses(nextResponses);
    setDraft("");

    if (step + 1 < QUESTIONS.length) {
      const nextQuestion = QUESTIONS[step + 1];
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "mentor",
          text: nextQuestion.prompt,
        },
      ]);
      setStep((prev) => prev + 1);
    } else {
      setCompleted(true);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "mentor",
          text: "Perfect. Give me a sec while I tailor your dashboard...",
        },
      ]);
      try {
        setIsSubmitting(true);
        if (nextResponses.full_name || nextResponses.university || nextResponses.career_goals || nextResponses.learning_style) {
          await authApi.updateProfile({
            full_name: nextResponses.full_name ?? trimmed,
            university: nextResponses.university,
            career_goals: nextResponses.career_goals,
            learning_style: nextResponses.learning_style,
          });
        }
        await authApi.completeOnboarding();
        await refreshProfile();
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "mentor",
            text: "All set! Your mentor lounge, plans, and signals are customized. Ready to dive in?",
          },
        ]);
      } catch (error) {
        telemetry.error("Onboarding completion failed", { error });
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "mentor",
            text: "Hmm, something went off while saving. Want to try again?",
          },
        ]);
        setCompleted(false);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSkip = () => {
    setCompleted(true);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: "mentor",
        text: "No worries, you can tweak preferences any time from your profile.",
      },
      {
        id: crypto.randomUUID(),
        sender: "mentor",
        text: "Whenever you’re ready, head into the studio!",
      },
    ]);
  };

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 px-4 py-10">
      <Card className="w-full max-w-2xl overflow-hidden border shadow-lg">
        <CardContent className="flex h-[520px] flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Mentor onboarding</h1>
              <p className="text-xs text-muted-foreground">
                {completed
                  ? "You're ready to enter the studio."
                  : `Step ${Math.min(step + 1, QUESTIONS.length)} of ${QUESTIONS.length}`}
              </p>
            </div>
            {!completed ? (
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip
              </Button>
            ) : null}
          </div>

          <Separator />

          <div
            id="onboarding-scroll"
            className="flex-1 space-y-3 overflow-y-auto rounded-lg bg-muted/30 p-4"
          >
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className={
                    message.sender === "mentor"
                      ? "flex justify-start"
                      : "flex justify-end"
                  }
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.sender === "mentor" ? "bg-primary/10 text-primary" : "bg-primary text-primary-foreground"}`}
                  >
                    {message.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {!completed ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit();
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={QUESTIONS[step]?.placeholder}
                disabled={isSubmitting}
                autoFocus
              />
              <Button type="submit" disabled={!draft.trim() || isSubmitting}>
                {isSubmitting ? "Saving…" : "Send"}
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => router.push("/dashboard")}>Enter studio</Button>
              <Button variant="ghost" onClick={() => router.push("/chat")}>Jump to mentor lounge</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
