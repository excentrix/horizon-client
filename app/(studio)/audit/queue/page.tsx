"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auditApi, authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { VeloShell } from "@/components/velo/velo-shell";

const FALLBACK_QUIZ = [
  {
    id: "q1",
    question: "Which activity best signals system reliability?",
    options: ["Chaos testing", "Skipping monitoring", "Removing alerts"],
    correctIndex: 0,
  },
  {
    id: "q2",
    question: "What does an API latency spike indicate?",
    options: ["Improved throughput", "Bottleneck or regression", "No change"],
    correctIndex: 1,
  },
  {
    id: "q3",
    question: "Why use indexes in databases?",
    options: ["Speed up queries", "Slow down reads", "Store binaries"],
    correctIndex: 0,
  },
];

const DISTRACTOR_POOL = ["Docker", "React", "Kubernetes", "PostgreSQL", "Redis", "Python", "Node.js", "TypeScript"];

const buildQuizFromResume = (resume: Record<string, unknown>) => {
  const skills = Array.isArray(resume.skills) ? resume.skills : [];
  if (skills.length < 1) return FALLBACK_QUIZ;

  const topSkill = String(skills[0]);
  const distractors = DISTRACTOR_POOL.filter((item) => item !== topSkill).slice(0, 2);
  const options = [topSkill, ...distractors].sort();
  const correctIndex = options.indexOf(topSkill);

  return [
    {
      id: "skill-1",
      question: "Which of these appears in your resume skills?",
      options,
      correctIndex,
    },
    {
      id: "self-1",
      question: "Which area are you most confident about?",
      options: skills.slice(0, 3).map((item) => String(item)),
      correctIndex: 0,
    },
    {
      id: "process-1",
      question: "You are about to be audited. What is the first step?",
      options: ["Provide evidence", "Guess answers", "Skip verification"],
      correctIndex: 0,
    },
  ];
};

export default function AuditQueuePage() {
  const router = useRouter();
  const params = useSearchParams();
  const auditId = params.get("audit") || "";
  const [slot, setSlot] = useState<{ remaining: number; week_start: string } | null>(null);
  const [quiz, setQuiz] = useState(FALLBACK_QUIZ);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await auditApi.getQueueSlots();
        setSlot({ remaining: data.remaining, week_start: data.week_start });
      } catch {
        setStatusMessage("Unable to load queue slots.");
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const detail = await authApi.getProfileDetail();
        if (detail.resume_payload) {
          setQuiz(buildQuizFromResume(detail.resume_payload as Record<string, unknown>));
        }
      } catch {
        setQuiz(FALLBACK_QUIZ);
      }
    };
    void loadQuiz();
  }, []);

  const score = useMemo(() => {
    return quiz.reduce((acc, question) => {
      if (answers[question.id] === question.correctIndex) {
        return acc + 1;
      }
      return acc;
    }, 0);
  }, [answers, quiz]);

  const handleClaim = async () => {
    setIsClaiming(true);
    setStatusMessage(null);
    try {
      const result = await auditApi.claimQueueSlot({
        audit_id: auditId,
        quiz_score: score,
        quiz_payload: { answers, quiz },
      });
      if (result.status !== "claimed") {
        setStatusMessage(result.message || "Claim failed.");
      } else {
        router.push(`/audit/session?audit=${auditId}`);
      }
    } catch {
      setStatusMessage("Claim failed. Please retry.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <VeloShell>
      <div className="border-[3px] border-green-700 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Audit Queue</h2>
        <p className="text-sm text-green-300">
          Slots reset weekly. Pass the VELO checkpoint to claim your slot.
        </p>
        {slot ? (
          <p className="text-xs text-green-400">
            Remaining slots: {slot.remaining} (week of {slot.week_start})
          </p>
        ) : null}
      </div>

      <div className="border-[3px] border-green-700 p-6 space-y-4">
        {quiz.map((question) => (
          <div key={question.id} className="border-b border-green-800 pb-4">
            <p className="text-sm text-green-200">{question.question}</p>
            <div className="mt-3 grid gap-2">
              {question.options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [question.id]: index }))
                  }
                  className={`border-[2px] px-3 py-2 text-left text-sm ${
                    answers[question.id] === index
                      ? "border-green-400 bg-green-400/10"
                      : "border-green-800"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between">
          <span className="text-sm text-green-400">Score: {score} / {quiz.length}</span>
          <Button
            onClick={handleClaim}
            disabled={isClaiming}
            className="border-[3px] border-green-400 bg-green-400/10 text-green-200 hover:bg-green-400/20"
          >
            {isClaiming ? "Claiming..." : "Claim Slot"}
          </Button>
        </div>

        {statusMessage ? (
          <p className="text-sm text-red-400">{statusMessage}</p>
        ) : null}
      </div>
    </VeloShell>
  );
}
