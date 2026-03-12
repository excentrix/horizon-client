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
  | "roadmap_launch";

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
      setCurrentStep(queryStep || (data.current_step as VeloStep));
      setTrack(data.chosen_track);
      if (data.latest_audit) {
        setAuditId(String(data.latest_audit));
      } else if (queryAudit) {
        setAuditId(queryAudit);
      }
    } catch {
      if (queryStep) setCurrentStep(queryStep);
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
      setCurrentStep(result.next_step as VeloStep);
      await auditApi.advanceOnboardingSession(result.next_step as VeloStep);
    },
    []
  );

  const submitEvidence = useCallback(
    async (payload: FormData | Record<string, unknown>) => {
      const result = await auditApi.onboardingEvidence(payload);
      setAuditId(result.audit_id);
      setTrack(result.track);
      setAuditMode(result.audit_mode);
      setCurrentStep(result.next_step as VeloStep);
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
    await auditApi.advanceOnboardingSession(nextStep);
    setCurrentStep(nextStep);
  }, []);

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
    reloadSession: loadSession,
  };
}
