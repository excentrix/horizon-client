"use client";

import { useState, useCallback } from "react";
import {
  auditApi,
  type DimensionScores,
  type CitedFile,
  type InspectorEvent,
  type SessionIntegrity,
  type DetectedStackItem,
  type StackReconciliationItem,
} from "@/lib/api";

export type VerificationStep =
  | "idle"
  | "resume"                 // an interrogation is already in progress — restart / change repo
  | "evidence"               // multi-repo + demo URL entry
  | "checking"               // github + audit doc check running
  | "check_result"           // show combined github + audit doc results
  | "context"                // declared project scope/intent (skippable)
  | "starting_interrogation"
  | "interrogating"          // adaptive Q&A
  | "completing"
  | "verdict";

export type RepoEntry = {
  url: string;
  label: string;
  check_status?: "passed" | "failed" | "skipped";
  language?: string;
  stars?: number;
  description?: string;
  reason?: string;
};

export type AuditDocSection = {
  name: string;
  found: boolean;
  word_count: number;
  passed: boolean;
  required_words: number;
};

export type AuditDocResult = {
  status: "accepted" | "rejected" | "missing";
  sections: AuditDocSection[];
  feedback: string;
  template?: string;
};

export type Verdict = {
  status: string;
  scoring_status?: "pending" | "scoring" | "scored" | "scoring_failed";
  verification_score: number | null;
  dimension_scores?: DimensionScores | null;
  verdict_summary: string;
  badge: boolean;
  verified_at: string | null;
  session_integrity?: SessionIntegrity | null;
  detected_stack?: DetectedStackItem[] | null;
  stack_reconciliation?: StackReconciliationItem[] | null;
  stack_reconciliation_status?: "not_run" | "scored" | "failed";
};

// One logged turn in the growing interrogation transcript — the "case
// file" the redesigned UI renders as an accumulating log, not a chat
// widget that discards prior turns.
export type AnsweredTurn = {
  questionIndex: number;
  question: string;
  answer: string;
  area: string | null;
  citedFiles: CitedFile[];
};

export interface ProjectVerificationState {
  step: VerificationStep;
  verificationId: string | null;
  auditId: string | null;
  sessionId: string | null;

  // Repo check results
  checkedRepos: RepoEntry[];
  overallGithubStatus: "passed" | "failed" | "skipped" | null;
  auditDoc: AuditDocResult | null;

  // Declared project scope/intent — optional, calibrates question generation
  // and grading (e.g. "a quick internal tool" vs "a production service").
  declaredContext: string;

  // Interrogation (adaptive)
  currentQuestion: string | null;
  currentQuestionArea: string | null;
  currentCitedFiles: CitedFile[];   // files the current question points at
  questionCount: number;   // how many answered so far
  answeredTurns: AnsweredTurn[];
  stackCovered: number;    // significant stack areas probed so far
  stackTotal: number;      // significant stack areas to cover

  verdict: Verdict | null;
  error: string | null;
  isLoading: boolean;
}

const INITIAL: ProjectVerificationState = {
  step: "idle",
  verificationId: null,
  auditId: null,
  sessionId: null,
  checkedRepos: [],
  overallGithubStatus: null,
  auditDoc: null,
  declaredContext: "",
  currentQuestion: null,
  currentQuestionArea: null,
  currentCitedFiles: [],
  questionCount: 0,
  answeredTurns: [],
  stackCovered: 0,
  stackTotal: 0,
  verdict: null,
  error: null,
  isLoading: false,
};

const TERMINAL_STATUSES = new Set(["verified", "suspicious", "failed"]);

export function useProjectVerification(snapshotId: string) {
  const [state, setState] = useState<ProjectVerificationState>(INITIAL);

  const setError = (error: string) =>
    setState((s) => ({ ...s, error, isLoading: false }));

  // ── 1. Create/get verification record ────────────────────────────────────
  // startProjectVerification is idempotent (create_or_get) — reopening an
  // already-decided verification must show that result, not offer a blank
  // "Begin Verification" that implies the earlier work is gone. This is the
  // fix for interviews that finish and get graded but never reach a verdict
  // client-side (e.g. the session drops before the finalize round-trip) —
  // finalize() itself is now also auto-triggered server-side once grading
  // completes, but this covers reopening the sheet cold, and is idempotent
  // either way.
  const startVerification = useCallback(
    async (projectIndex: number) => {
      setState((s) => ({ ...s, step: "evidence", isLoading: true, error: null }));
      try {
        const data = await auditApi.startProjectVerification(snapshotId, projectIndex);

        if (TERMINAL_STATUSES.has(data.status) && data.verification_id) {
          const verdict = await auditApi.finalizeProjectVerification(data.verification_id);
          setState((s) => ({
            ...s,
            step: "verdict",
            verificationId: data.verification_id,
            auditId: data.audit_id,
            verdict,
            isLoading: false,
          }));
          return;
        }

        // An interrogation already exists (or evidence was already submitted) —
        // don't walk the user back through the repo picker. Offer to resume:
        // restart from Q1 on the same repo, or explicitly change the repo.
        const hasEvidence =
          data.has_session ||
          data.status === "interrogating" ||
          (data.checked_repos?.length ?? 0) > 0;

        setState((s) => ({
          ...s,
          step: hasEvidence ? "resume" : "evidence",
          verificationId: data.verification_id,
          auditId: data.audit_id,
          checkedRepos: (data.checked_repos ?? []).map((r) => ({
            url: r.url,
            label: r.label ?? "Repository",
            check_status: r.check_status,
            language: r.language,
            description: r.description,
            reason: r.reason,
          })),
          isLoading: false,
        }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to start verification");
      }
    },
    [snapshotId],
  );

  // ── Resume: restart the interrogation from question one ───────────────────
  // change_repo=false keeps the submitted repos + code digest (skip straight
  // to the context step); change_repo=true drops them so the user re-picks.
  const restartInterrogation = useCallback(
    async (changeRepo: boolean) => {
      if (!state.verificationId) return;
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const data = await auditApi.restartInterrogation(state.verificationId, changeRepo);
        setState((s) => ({
          ...s,
          step: changeRepo ? "evidence" : "context",
          auditId: data.audit_id ?? s.auditId,
          checkedRepos: changeRepo
            ? []
            : (data.checked_repos ?? s.checkedRepos).map((r) => ({
                url: r.url,
                label: r.label ?? "Repository",
              })),
          // wipe any stale interrogation state carried in memory
          currentQuestion: null,
          currentQuestionArea: null,
          currentCitedFiles: [],
          questionCount: 0,
          answeredTurns: [],
          sessionId: null,
          verdict: null,
          isLoading: false,
        }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to restart the interrogation");
      }
    },
    [state.verificationId],
  );

  // ── 2. Submit repos + run check ───────────────────────────────────────────
  const submitRepos = useCallback(
    async (repos: RepoEntry[], demoUrl: string) => {
      if (!state.verificationId) return;
      setState((s) => ({ ...s, step: "checking", isLoading: true, error: null }));
      try {
        const data = await auditApi.checkRepos(
          state.verificationId,
          repos.map((r) => ({ url: r.url, label: r.label })),
          demoUrl,
        );
        setState((s) => ({
          ...s,
          step: "check_result",
          checkedRepos: data.repos,
          overallGithubStatus: data.overall_github_status,
          auditDoc: data.audit_doc,
          isLoading: false,
        }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Repository check failed");
      }
    },
    [state.verificationId],
  );

  // ── 2b. Re-check audit doc only ───────────────────────────────────────────
  const recheckAuditDoc = useCallback(async () => {
    if (!state.verificationId) return;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const data = await auditApi.recheckAuditDoc(state.verificationId);
      setState((s) => ({ ...s, auditDoc: data, isLoading: false }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Audit doc re-check failed");
    }
  }, [state.verificationId]);

  // ── 2c. Move to the declared-context step ─────────────────────────────────
  // Repos passed the check — before starting the interrogation, give the
  // candidate a chance to state what this project actually is (scope,
  // audience, constraints), so grading can calibrate to it. Purely a local
  // step transition, no request.
  const proceedToContext = useCallback(() => {
    setState((s) => ({ ...s, step: "context" }));
  }, []);

  // ── 3. Start interrogation ────────────────────────────────────────────────
  const startInterrogation = useCallback(async () => {
    if (!state.auditId) return;
    setState((s) => ({ ...s, step: "starting_interrogation", isLoading: true, error: null }));
    try {
      const data = await auditApi.startInterrogation(state.auditId);
      setState((s) => ({
        ...s,
        step: "interrogating",
        sessionId: data.session_id,
        currentQuestion: data.question,
        currentQuestionArea: data.area ?? null,
        currentCitedFiles: data.cited_files ?? [],
        questionCount: 0,
        answeredTurns: [],
        stackCovered: data.stack_covered ?? 0,
        stackTotal: data.stack_total ?? 0,
        isLoading: false,
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start interrogation");
    }
  }, [state.auditId]);

  // ── 2d. Submit declared context, then begin the interrogation ─────────────
  // Skippable — an empty string is a valid, meaningful submission (no
  // calibration context, today's behavior unchanged).
  const submitContext = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (state.verificationId && trimmed) {
        setState((s) => ({ ...s, isLoading: true, error: null }));
        try {
          await auditApi.setProjectContext(state.verificationId, trimmed);
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : "Failed to save project context");
          return;
        }
      }
      setState((s) => ({ ...s, declaredContext: trimmed, isLoading: false }));
      await startInterrogation();
    },
    [state.verificationId, startInterrogation],
  );

  // ── 4. Submit answer (adaptive — backend decides next question) ───────────
  const submitAnswer = useCallback(
    async (answer: string, inspectorEvents?: InspectorEvent[]) => {
      if (!state.sessionId || !state.currentQuestion) return;
      setState((s) => ({
        ...s,
        isLoading: true,
        error: null,
        // Log the just-answered turn immediately — the transcript grows as
        // soon as an answer is submitted, not once the next question lands.
        answeredTurns: s.currentQuestion
          ? [
              ...s.answeredTurns,
              {
                questionIndex: s.questionCount,
                question: s.currentQuestion,
                answer,
                area: s.currentQuestionArea,
                citedFiles: s.currentCitedFiles,
              },
            ]
          : s.answeredTurns,
        currentQuestion: null,
        currentQuestionArea: null,
        currentCitedFiles: [],
      }));
      try {
        const data = await auditApi.answerInterrogation(state.sessionId, {
          answer,
          ...(inspectorEvents && inspectorEvents.length
            ? { inspector_events: inspectorEvents }
            : {}),
        });
        const done = data.next_question === null || data.status === "complete";
        if (done) {
          // Move to completing — no more questions
          setState((s) => ({
            ...s,
            step: "completing",
            currentQuestion: null,
            currentQuestionArea: null,
            currentCitedFiles: [],
            questionCount: s.questionCount + 1,
            isLoading: false,
          }));
          // Auto-finalize
        } else {
          setState((s) => ({
            ...s,
            currentQuestion: data.next_question!,
            currentQuestionArea: data.area ?? null,
            currentCitedFiles: data.cited_files ?? [],
            questionCount: s.questionCount + 1,
            stackCovered: data.stack_covered ?? s.stackCovered,
            stackTotal: data.stack_total ?? s.stackTotal,
            isLoading: false,
          }));
        }
        return done;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to submit answer");
        return false;
      }
    },
    [state.currentQuestion, state.sessionId],
  );

  // ── 5. Complete + finalize ────────────────────────────────────────────────
  // Grading runs turn-by-turn off the request path (a Celery task per
  // answer), so the last answer or two may still be mid-grading right when
  // the interview ends. finalize() reports that explicitly as
  // scoring_status: "scoring" rather than a number — poll it a few times
  // before giving up, so the UI shows a real verdict instead of a stale one.
  const MAX_SCORING_POLLS = 8;

  const completeAndFinalize = useCallback(async () => {
    if (!state.sessionId || !state.verificationId) return;
    setState((s) => ({ ...s, step: "completing", isLoading: true, error: null }));
    try {
      await auditApi.completeInterrogation(state.sessionId);
      let verdict = await auditApi.finalizeProjectVerification(state.verificationId);
      let attempts = 0;
      while (verdict.scoring_status === "scoring" && attempts < MAX_SCORING_POLLS) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        verdict = await auditApi.finalizeProjectVerification(state.verificationId);
        attempts += 1;
      }
      setState((s) => ({ ...s, step: "verdict", verdict, isLoading: false }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to finalize verification");
    }
  }, [state.sessionId, state.verificationId]);

  // Lets the verdict screen offer a manual "Retry scoring" action if polling
  // gave up while still "scoring", or if it came back "scoring_failed".
  const retryFinalize = useCallback(async () => {
    if (!state.verificationId) return;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const verdict = await auditApi.finalizeProjectVerification(state.verificationId);
      setState((s) => ({ ...s, step: "verdict", verdict, isLoading: false }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to finalize verification");
    }
  }, [state.verificationId]);

  const reset = useCallback(() => setState(INITIAL), []);

  return {
    ...state,
    startVerification,
    restartInterrogation,
    submitRepos,
    recheckAuditDoc,
    proceedToContext,
    submitContext,
    startInterrogation,
    submitAnswer,
    completeAndFinalize,
    retryFinalize,
    reset,
  };
}
