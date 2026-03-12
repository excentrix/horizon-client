"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auditApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VeloShell } from "@/components/velo/velo-shell";

export default function AuditSessionPage() {
  const router = useRouter();
  const params = useSearchParams();
  const auditId = params.get("audit") || "";
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answer, setAnswer] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slotExpiresAt, setSlotExpiresAt] = useState<string | null>(null);
  const questionStartRef = useRef<number | null>(null);

  useEffect(() => {
    const loadAudit = async () => {
      try {
        const audit = await auditApi.getAudit(auditId);
        setSlotExpiresAt(audit.slot_expires_at || null);
      } catch {
        // ignore
      }
    };
    if (auditId) {
      void loadAudit();
    }
  }, [auditId]);

  useEffect(() => {
    const start = async () => {
      try {
        const data = await auditApi.startInterrogation(auditId);
        setSessionId(data.session_id);
        setQuestion(data.question);
        setQuestionIndex(data.question_index);
        setTotalQuestions(data.total_questions);
        questionStartRef.current = Date.now();
      } catch (err) {
        setStatusMessage("Unable to start interrogation.");
      }
    };

    if (auditId) {
      void start();
    }
  }, [auditId]);

  const timeLeft = useMemo(() => {
    if (!slotExpiresAt) return "";
    const diff = new Date(slotExpiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  }, [slotExpiresAt]);

  const handleAnswer = async () => {
    if (!sessionId) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const latency = questionStartRef.current
        ? Date.now() - questionStartRef.current
        : undefined;
      const response = await auditApi.answerInterrogation(sessionId, {
        answer,
        latency_ms: latency,
      });
      setAnswer("");
      if (response.status === "complete") {
        const completed = await auditApi.completeInterrogation(sessionId);
        router.push(`/audit/report/${completed.audit_id}`);
        return;
      }
      setQuestion(response.next_question || null);
      setQuestionIndex(response.question_index || 0);
      setTotalQuestions(response.total_questions || totalQuestions);
      questionStartRef.current = Date.now();
    } catch (err) {
      setStatusMessage("Failed to submit answer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <VeloShell>
      <div className="border-[3px] border-green-700 p-6 space-y-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-green-400">
          <span>Question {questionIndex + 1} / {totalQuestions}</span>
          <span>{timeLeft ? `Slot: ${timeLeft}` : "Slot: pending"}</span>
        </div>
        <div className="border-[2px] border-green-800 p-4 text-sm">
          {question || "Loading question..."}
        </div>
        <Textarea
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          className="min-h-[140px] bg-black border-green-700 text-green-100"
          placeholder="Type your response..."
        />
        <div className="flex items-center justify-between">
          {statusMessage ? (
            <span className="text-sm text-red-400">{statusMessage}</span>
          ) : (
            <span className="text-xs text-green-500">Latency tracked</span>
          )}
          <Button
            onClick={handleAnswer}
            disabled={isSubmitting || !answer.trim()}
            className="border-[3px] border-green-400 bg-green-400/10 text-green-200 hover:bg-green-400/20"
          >
            {isSubmitting ? "Submitting..." : "Submit Answer"}
          </Button>
        </div>
      </div>
    </VeloShell>
  );
}
