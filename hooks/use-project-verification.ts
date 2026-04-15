"use client";

import { useState, useCallback } from "react";
import { auditApi } from "@/lib/api";

export type VerificationStep =
  | "idle"
  | "evidence"               // multi-repo + demo URL entry
  | "checking"               // github + audit doc check running
  | "check_result"           // show combined github + audit doc results
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
  verification_score: number | null;
  verdict_summary: string;
  badge: boolean;
  verified_at: string | null;
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

  // Interrogation (adaptive)
  currentQuestion: string | null;
  questionCount: number;   // how many answered so far

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
  currentQuestion: null,
  questionCount: 0,
  verdict: null,
  error: null,
  isLoading: false,
};

export function useProjectVerification(snapshotId: string) {
  const [state, setState] = useState<ProjectVerificationState>(INITIAL);

  const setError = (error: string) =>
    setState((s) => ({ ...s, error, isLoading: false }));

  // ── 1. Create/get verification record ────────────────────────────────────
  const startVerification = useCallback(
    async (projectIndex: number) => {
      setState((s) => ({ ...s, step: "evidence", isLoading: true, error: null }));
      try {
        const data = await auditApi.startProjectVerification(snapshotId, projectIndex);
        setState((s) => ({
          ...s,
          step: "evidence",
          verificationId: data.verification_id,
          auditId: data.audit_id,
          isLoading: false,
        }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to start verification");
      }
    },
    [snapshotId],
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
        questionCount: 0,
        isLoading: false,
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start interrogation");
    }
  }, [state.auditId]);

  // ── 4. Submit answer (adaptive — backend decides next question) ───────────
  const submitAnswer = useCallback(
    async (answer: string) => {
      if (!state.sessionId) return;
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const data = await auditApi.answerInterrogation(state.sessionId, { answer });
        const done = data.next_question === null || data.status === "complete";
        if (done) {
          // Move to completing — no more questions
          setState((s) => ({
            ...s,
            step: "completing",
            currentQuestion: null,
            questionCount: s.questionCount + 1,
            isLoading: false,
          }));
          // Auto-finalize
        } else {
          setState((s) => ({
            ...s,
            currentQuestion: data.next_question!,
            questionCount: s.questionCount + 1,
            isLoading: false,
          }));
        }
        return done;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to submit answer");
        return false;
      }
    },
    [state.sessionId],
  );

  // ── 5. Complete + finalize ────────────────────────────────────────────────
  const completeAndFinalize = useCallback(async () => {
    if (!state.sessionId || !state.verificationId) return;
    setState((s) => ({ ...s, step: "completing", isLoading: true, error: null }));
    try {
      await auditApi.completeInterrogation(state.sessionId);
      const verdict = await auditApi.finalizeProjectVerification(state.verificationId);
      setState((s) => ({ ...s, step: "verdict", verdict, isLoading: false }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to finalize verification");
    }
  }, [state.sessionId, state.verificationId]);

  const reset = useCallback(() => setState(INITIAL), []);

  return {
    ...state,
    startVerification,
    submitRepos,
    recheckAuditDoc,
    startInterrogation,
    submitAnswer,
    completeAndFinalize,
    reset,
  };
}
