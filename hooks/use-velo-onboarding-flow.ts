"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { auditApi } from "@/lib/api";
import type {
  AuditReport,
  VeloAuditMode,
  VeloOnboardingSession,
  VeloOnboardingTrack,
  VeloRoadmapEligibility,
} from "@/types";

export type VeloStep =
  | "discovery"
  | "evidence_intake"
  | "audit_readiness"
  | "audit_session"
  | "insight_brief"
  | "mentor_personalization"
  | "roadmap_launch"
  | "mentor_and_roadmap";

const normalizeStep = (step: string | null | undefined): VeloStep => {
  if (step === "mentor_personalization" || step === "roadmap_launch") {
    return "mentor_and_roadmap";
  }
  if (step === "audit_readiness") {
    return "audit_session";
  }
  if (
    step === "discovery" ||
    step === "evidence_intake" ||
    step === "audit_readiness" ||
    step === "audit_session" ||
    step === "insight_brief" ||
    step === "mentor_and_roadmap"
  ) {
    return step;
  }
  return "discovery";
};

export function useVeloOnboardingFlow() {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<VeloOnboardingSession | null>(null);
  const [currentStep, setCurrentStep] = useState<VeloStep>("discovery");
  const [track, setTrack] = useState<VeloOnboardingTrack>("resume_track");
  const [auditMode, setAuditMode] = useState<VeloAuditMode>("full_forensic");
  const [domainFamily, setDomainFamily] = useState<string>("tech");
  const [auditId, setAuditId] = useState<string | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [eligibility, setEligibility] = useState<{
    roadmap_eligibility: VeloRoadmapEligibility;
    can_generate_roadmap: boolean;
    can_promote_public: boolean;
    mentor_context_status: "pending" | "confirmed";
    verification_tier: "starter" | "full";
  } | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const queryAudit = searchParams.get("audit");
  const queryStep = searchParams.get("step") as VeloStep | null;

  const loadSession = useCallback(async () => {
    setIsLoadingSession(true);
    try {
      const data = await auditApi.getOnboardingSession();
      setSession(data);
      setCurrentStep(normalizeStep(queryStep || data.current_step));
      setTrack(data.chosen_track);
      if (data.latest_audit) {
        setAuditId(String(data.latest_audit));
      } else if (queryAudit) {
        setAuditId(queryAudit);
      }
    } catch {
      if (queryStep) setCurrentStep(normalizeStep(queryStep));
      if (queryAudit) setAuditId(queryAudit);
    } finally {
      setIsLoadingSession(false);
    }
  }, [queryAudit, queryStep]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const runDiscovery = useCallback(
    async (answers: {
      has_resume?: boolean;
      education_stage?: string;
      domain_family?: string;
      has_projects?: boolean;
    }) => {
      const result = await auditApi.onboardingDiscovery({ answers });
      setTrack(result.track);
      setAuditMode(result.audit_mode);
      setDomainFamily(result.domain_family);
      const nextStep = normalizeStep(result.next_step);
      setCurrentStep(nextStep);
      await auditApi.advanceOnboardingSession(nextStep);
    },
    []
  );

  const submitEvidence = useCallback(
    async (payload: FormData | Record<string, unknown>) => {
      const result = await auditApi.onboardingEvidence(payload);
      setAuditId(result.audit_id);
      setTrack(result.track);
      setAuditMode(result.audit_mode);
      setCurrentStep(normalizeStep(result.next_step));
      return result;
    },
    []
  );

  const loadReport = useCallback(async (audit: string) => {
    const data = await auditApi.getReport(audit);
    setReport(data);
    return data;
  }, []);

  const loadEligibility = useCallback(async (audit: string) => {
    const data = await auditApi.getEligibility(audit);
    setEligibility(data);
    return data;
  }, []);

  const advanceStep = useCallback(async (nextStep: VeloStep) => {
    const normalized = normalizeStep(nextStep);
    await auditApi.advanceOnboardingSession(normalized);
    setCurrentStep(normalized);
  }, []);

  const saveDraft = useCallback(
    async (step: VeloStep, payload: Record<string, unknown>) => {
      await auditApi.saveOnboardingDraft({
        step,
        payload,
        client_saved_at: new Date().toISOString(),
      });
      setSession((prev) =>
        prev
          ? {
              ...prev,
              step_state: {
                ...(prev.step_state || {}),
                [step]: {
                  ...((prev.step_state || {})[step] || {}),
                  ...payload,
                },
              },
            }
          : prev
      );
    },
    []
  );

  const checklist = useMemo(() => {
    const flags = session?.completion_flags || {};
    return {
      profileCaptured: Boolean(flags.profile_captured),
      evidenceMapped: Boolean(flags.evidence_mapped),
      auditCompleted: Boolean(flags.audit_completed),
      mentorContextConfirmed:
        report?.mentor_context_status === "confirmed" ||
        eligibility?.mentor_context_status === "confirmed",
      roadmapGenerated: Boolean(flags.roadmap_generated),
    };
  }, [eligibility?.mentor_context_status, report?.mentor_context_status, session?.completion_flags]);

  return {
    session,
    currentStep,
    track,
    auditMode,
    domainFamily,
    auditId,
    report,
    eligibility,
    checklist,
    isLoadingSession,
    setCurrentStep,
    setAuditId,
    setReport,
    runDiscovery,
    submitEvidence,
    loadReport,
    loadEligibility,
    advanceStep,
    saveDraft,
    reloadSession: loadSession,
  };
}
