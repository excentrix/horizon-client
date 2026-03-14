"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auditApi, authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VeloShell } from "@/components/velo/velo-shell";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVeloOnboardingFlow, type VeloStep } from "@/hooks/use-velo-onboarding-flow";
import { StepLoader } from "@/components/velo/step-loader";
import { StepFooterActions } from "@/components/velo/step-footer-actions";
import { StatusBanner } from "@/components/velo/status-banner";
import { ResumeReviewPanel } from "@/components/velo/resume-review-panel";
import { MentorReadinessCard } from "@/components/velo/mentor-readiness-card";
import { telemetry } from "@/lib/telemetry";

const STEP_ORDER: VeloStep[] = [
  "discovery",
  "evidence_intake",
  "audit_session",
  "insight_brief",
  "mentor_and_roadmap",
];

const STEP_LABELS: Record<VeloStep, string> = {
  discovery: "Discovery",
  evidence_intake: "Evidence Intake",
  audit_readiness: "Readiness",
  audit_session: "Audit Session",
  insight_brief: "Insight Brief",
  mentor_personalization: "Mentor Context",
  roadmap_launch: "Roadmap",
  mentor_and_roadmap: "Mentor + Roadmap",
};

export default function VeloOnboardingPage() {
  const router = useRouter();
  const {
    currentStep,
    track,
    auditMode,
    domainFamily,
    auditId,
    report,
    eligibility,
    session,
    isLoadingSession,
    runDiscovery,
    submitEvidence,
    loadReport,
    loadEligibility,
    advanceStep,
    saveDraft,
  } = useVeloOnboardingFlow();

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"info" | "success" | "error">("info");
  const [submitting, setSubmitting] = useState(false);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumePayload, setResumePayload] = useState<Record<string, unknown>>({});
  const [resumeProjects, setResumeProjects] = useState<Array<Record<string, unknown>>>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [projectTitle, setProjectTitle] = useState("Flagship Project");

  const [resumeParseState, setResumeParseState] = useState<"idle" | "uploading" | "analyzing" | "success" | "error">("idle");
  const [resumeJobId, setResumeJobId] = useState<string | null>(null);
  const [resumeJobStatus, setResumeJobStatus] = useState<"queued" | "running" | "completed" | "failed" | null>(null);
  const hydratedDraftRef = useRef(false);
  const lastDraftSignatureRef = useRef<string>("");
  const lastDraftSavedAtMsRef = useRef<number>(0);

  const [discovery, setDiscovery] = useState({
    has_resume: true,
    education_stage: "year_2",
    domain_family: "tech",
    has_projects: true,
  });
  const [profileBasics, setProfileBasics] = useState({
    target_role: "",
    target_company: "",
    timeline: "",
    constraints: "",
  });

  const [starterAnswers, setStarterAnswers] = useState<Record<string, number>>({
    q1: 2,
    q2: 2,
    q3: 2,
  });

  const [interrogation, setInterrogation] = useState<{
    sessionId: string;
    question: string | null;
    questionIndex: number;
    totalQuestions: number;
  } | null>(null);
  const [answer, setAnswer] = useState("");
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const questionStartRef = useRef<number | null>(null);
  const [startingHandoff, setStartingHandoff] = useState(false);

  const stepIndex = useMemo(() => Math.max(STEP_ORDER.indexOf(currentStep), 0), [currentStep]);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const profile = await authApi.getProfileDetail();
        if (profile.resume_payload) {
          const payload = profile.resume_payload as Record<string, unknown>;
          setResumePayload(payload);
          const parsedProjects = Array.isArray(payload.projects)
            ? (payload.projects as Array<Record<string, unknown>>)
            : [];
          setResumeProjects(parsedProjects);
          if (parsedProjects[0]?.repo_url) setRepoUrl(String(parsedProjects[0].repo_url));
          if (parsedProjects[0]?.description) setSummary(String(parsedProjects[0].description));
          if (parsedProjects[0]?.title) setProjectTitle(String(parsedProjects[0].title));
        }
      } catch {
        // ignore bootstrap failures
      }
    };
    if (!isLoadingSession) void hydrate();
  }, [isLoadingSession]);

  useEffect(() => {
    const stepState = session?.step_state || {};
    const discoveryState = (stepState.discovery as Record<string, unknown> | undefined) ?? {};
    const evidenceState = (stepState.evidence_intake as Record<string, unknown> | undefined) ?? (stepState.evidence as Record<string, unknown> | undefined) ?? {};

    if (Object.keys(discoveryState).length) {
      setDiscovery((prev) => ({
        ...prev,
        ...(discoveryState.answers as Record<string, unknown>),
      }) as typeof prev);
      const basics = (discoveryState.profile_basics as Record<string, unknown> | undefined) ?? {};
      setProfileBasics((prev) => ({
        ...prev,
        target_role: String(basics.target_role ?? prev.target_role),
        target_company: String(basics.target_company ?? prev.target_company),
        timeline: String(basics.timeline ?? prev.timeline),
        constraints: String(basics.constraints ?? prev.constraints),
      }));
    }

    if (!hydratedDraftRef.current && Object.keys(evidenceState).length) {
      setProjectTitle((prev) => String(evidenceState.project_title || prev));
      setRepoUrl((prev) => String(evidenceState.repo_url || prev));
      setSummary((prev) => String(evidenceState.summary || prev));
      const payload = evidenceState.resume_payload;
      if (payload && typeof payload === "object") {
        setResumePayload(payload as Record<string, unknown>);
        const parsedProjects = Array.isArray((payload as Record<string, unknown>).projects)
          ? ((payload as Record<string, unknown>).projects as Array<Record<string, unknown>>)
          : [];
        setResumeProjects(parsedProjects);
      }
      hydratedDraftRef.current = true;
    }

  }, [session?.step_state]);

  useEffect(() => {
    const syncAuditState = async () => {
      if (!auditId) return;
      try {
        const eligibilitySnapshot = await loadEligibility(auditId);
        await loadReport(auditId);
        if (eligibilitySnapshot.can_generate_roadmap && currentStep !== "mentor_and_roadmap") {
          await advanceStep("mentor_and_roadmap");
        }
      } catch {
        // report may not exist before audit completion
      }
    };
    if (auditId) void syncAuditState();
  }, [advanceStep, auditId, currentStep, loadEligibility, loadReport]);

  useEffect(() => {
    if (currentStep !== "evidence_intake") return;
    const draftPayload = {
      project_title: projectTitle,
      repo_url: repoUrl,
      summary,
      resume_payload: {
        ...resumePayload,
        projects: resumeProjects,
      },
    };
    const signature = JSON.stringify(draftPayload);
    if (signature === lastDraftSignatureRef.current) return;
    const timeout = window.setTimeout(async () => {
      if (Date.now() - lastDraftSavedAtMsRef.current < 4000) return;
      try {
        await saveDraft("evidence_intake", draftPayload);
        lastDraftSignatureRef.current = signature;
        lastDraftSavedAtMsRef.current = Date.now();
      } catch {
        // ignore autosave errors in UI loop
      }
    }, 2200);
    return () => window.clearTimeout(timeout);
  }, [currentStep, projectTitle, repoUrl, summary, resumePayload, resumeProjects, saveDraft]);


  const trustBanner = useMemo(() => {
    if (!eligibility) return "Learning allowed";
    if (eligibility.can_promote_public) return "Public verification complete";
    if (eligibility.can_generate_roadmap) return "Public verification pending";
    return "Learning allowed";
  }, [eligibility]);

  const handleAnalyzeResume = async () => {
    if (!resumeFile) return;
    telemetry.track("velo_resume_analyze_started", { step: currentStep });
    setSubmitting(true);
    setResumeParseState("uploading");
    setStatusMessage(null);
    try {
      const form = new FormData();
      form.append("resume", resumeFile);
      if (profileBasics.target_role.trim()) form.append("target_role", profileBasics.target_role.trim());
      if (profileBasics.target_company.trim()) form.append("target_company", profileBasics.target_company.trim());
      if (profileBasics.timeline.trim()) form.append("timeline", profileBasics.timeline.trim());
      if (profileBasics.constraints.trim()) form.append("constraints", profileBasics.constraints.trim().slice(0, 500));
      else if (summary.trim()) form.append("constraints", summary.trim().slice(0, 500));
      setResumeParseState("analyzing");
      const uploaded = await authApi.uploadResume(form);
      if (!uploaded.job_id) {
        throw new Error("Resume analysis job was not created.");
      }
      setResumeJobId(uploaded.job_id);
      setResumeJobStatus("queued");
      telemetry.track("velo_resume_analyze_queued", { job_id: uploaded.job_id });
      setStatusTone("info");
      setStatusMessage("Resume uploaded. Analysis is running in the background. You can continue to mentor.");
    } catch {
      telemetry.track("velo_resume_analyze_failed");
      setResumeParseState("error");
      setStatusTone("error");
      setStatusMessage("Resume parsing failed. You can continue manually.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!resumeJobId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await authApi.getResumeAnalysisStatus(resumeJobId);
        if (cancelled) return;
        setResumeJobStatus(status.status);
        if (status.status === "completed") {
          telemetry.track("velo_resume_analyze_completed", { job_id: status.job_id });
          const profile = await authApi.getProfileDetail();
          const payload = (profile.resume_payload || {}) as Record<string, unknown>;
          setResumePayload(payload);
          const parsedProjects = Array.isArray(payload.projects)
            ? (payload.projects as Array<Record<string, unknown>>)
            : [];
          setResumeProjects(parsedProjects);
          if (!projectTitle && parsedProjects[0]?.title) setProjectTitle(String(parsedProjects[0].title));
          if (!repoUrl && (parsedProjects[0]?.repo_url || parsedProjects[0]?.github_url)) {
            setRepoUrl(String(parsedProjects[0].repo_url || parsedProjects[0].github_url));
          }
          if (!summary && (parsedProjects[0]?.description || payload.professional_summary)) {
            setSummary(String(parsedProjects[0]?.description || payload.professional_summary || ""));
          }
          setResumeParseState("success");
          setStatusTone("success");
          setStatusMessage("Resume analysis completed. Review extracted context or continue.");
          return;
        }
        if (status.status === "failed") {
          telemetry.track("velo_resume_analyze_failed", { job_id: status.job_id });
          setResumeParseState("error");
          setStatusTone("error");
          setStatusMessage(status.error || "Resume analysis failed. Continue manually.");
          return;
        }
        window.setTimeout(poll, 2500);
      } catch {
        if (!cancelled) window.setTimeout(poll, 3000);
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [resumeJobId, projectTitle, repoUrl, summary]);

  const handleDiscovery = async () => {
    setSubmitting(true);
    setStatusMessage(null);
    try {
      await runDiscovery(discovery);
      await saveDraft("discovery", { answers: discovery, profile_basics: profileBasics });
      setStatusTone("success");
      setStatusMessage("Track selected. Continue to evidence intake.");
    } catch {
      setStatusTone("error");
      setStatusMessage("Unable to resolve onboarding track.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvidenceSubmit = async () => {
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const form = new FormData();
      form.append("track", track);
      form.append("audit_mode", auditMode);
      form.append("domain_family", domainFamily);
      if (profileBasics.target_role.trim()) form.append("target_role", profileBasics.target_role.trim());
      if (profileBasics.target_company.trim()) form.append("target_company", profileBasics.target_company.trim());
      if (profileBasics.timeline.trim()) form.append("timeline", profileBasics.timeline.trim());
      if (profileBasics.constraints.trim()) form.append("constraints", profileBasics.constraints.trim());
      form.append("project_title", projectTitle);
      if (repoUrl.trim()) form.append("repo_url", repoUrl.trim());
      if (summary.trim()) {
        form.append("summary", summary.trim());
        form.append("narrative_text", summary.trim());
      } else if (resumeJobId) {
        const pendingNarrative = "Resume analysis is running. Mentor intake will refine additional evidence.";
        form.append("summary", pendingNarrative);
        form.append("narrative_text", pendingNarrative);
      }
      form.append(
        "resume_payload",
        JSON.stringify({
          ...resumePayload,
          projects: resumeProjects,
        })
      );
      if (track === "builder_track") {
        form.append("starter_diagnostic", JSON.stringify({ answers: starterAnswers }));
      }

      const result = await submitEvidence(form);
      await saveDraft("evidence_intake", {
        project_title: projectTitle,
        repo_url: repoUrl,
        summary,
      });
      setStatusTone("success");
      setStatusMessage("Evidence mapped successfully.");
      if (result.next_step === "insight_brief" && result.audit_id) {
        await loadReport(result.audit_id);
        await loadEligibility(result.audit_id);
      }
    } catch {
      setStatusTone("error");
      setStatusMessage("Evidence intake failed. Fill required fields and retry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartInterrogation = async () => {
    if (!auditId) return;
    setStatusMessage(null);
    try {
      const started = await auditApi.startInterrogation(auditId);
      if (started.question_generation) {
        telemetry.track("velo_interrogation_question_source", {
          source: started.question_generation.source,
          fallback_reason: started.question_generation.fallback_reason,
        });
      }
      setInterrogation({
        sessionId: started.session_id,
        question: started.question,
        questionIndex: started.question_index,
        totalQuestions: started.total_questions,
      });
      questionStartRef.current = Date.now();
    } catch {
      setStatusTone("error");
      setStatusMessage("Unable to start audit session.");
    }
  };

  const handleSubmitAnswer = async () => {
    if (!interrogation || !answer.trim()) return;
    setSubmittingAnswer(true);
    setStatusMessage(null);
    try {
      const latency = questionStartRef.current ? Date.now() - questionStartRef.current : undefined;
      const response = await auditApi.answerInterrogation(interrogation.sessionId, {
        answer,
        latency_ms: latency,
      });
      setAnswer("");
      if (response.status === "complete") {
        const completed = await auditApi.completeInterrogation(interrogation.sessionId);
        if (completed.question_generation) {
          telemetry.track("velo_interrogation_question_source", {
            source: completed.question_generation.source,
            fallback_reason: completed.question_generation.fallback_reason,
            stage: "complete",
          });
        }
        await loadReport(completed.audit_id);
        await loadEligibility(completed.audit_id);
        await advanceStep("insight_brief");
        setStatusTone("success");
        setStatusMessage("Audit completed. Review your VELO insight brief.");
        return;
      }
      setInterrogation((prev) =>
        prev
          ? {
              ...prev,
              question: response.next_question,
              questionIndex: response.question_index || prev.questionIndex,
              totalQuestions: response.total_questions || prev.totalQuestions,
            }
          : prev
      );
      questionStartRef.current = Date.now();
    } catch {
      setStatusTone("error");
      setStatusMessage("Failed to submit answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleMentorHandoff = async () => {
    if (!auditId) return;
    setStartingHandoff(true);
    setStatusMessage(null);
    try {
      const handoff = await auditApi.mentorHandoff(auditId);
      await advanceStep("mentor_and_roadmap");
      router.push(handoff.chat_url);
    } catch {
      setStatusTone("error");
      setStatusMessage("Unable to start mentor handoff.");
    } finally {
      setStartingHandoff(false);
    }
  };

  const openMentorConversation = async () => {
    if (!auditId) return;
    const sessionConversation = session?.active_conversation_id;
    if (sessionConversation) {
      router.push(`/chat?context=velo_intake&audit=${auditId}&conversation=${sessionConversation}`);
      return;
    }
    await handleMentorHandoff();
  };

  const renderDiscovery = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Set your target first, then VELO will choose your onboarding track.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm text-foreground">
          Target role
          <Input
            value={profileBasics.target_role}
            onChange={(event) => setProfileBasics((prev) => ({ ...prev, target_role: event.target.value }))}
            placeholder="e.g., SDE-1 / Data Analyst"
          />
        </label>
        <label className="space-y-2 text-sm text-foreground">
          Target company (optional)
          <Input
            value={profileBasics.target_company}
            onChange={(event) => setProfileBasics((prev) => ({ ...prev, target_company: event.target.value }))}
            placeholder="e.g., Google / Deloitte"
          />
        </label>
        <label className="space-y-2 text-sm text-foreground">
          Timeline
          <Input
            value={profileBasics.timeline}
            onChange={(event) => setProfileBasics((prev) => ({ ...prev, timeline: event.target.value }))}
            placeholder="e.g., 3 months"
          />
        </label>
        <label className="space-y-2 text-sm text-foreground md:col-span-2">
          Constraints
          <Textarea
            value={profileBasics.constraints}
            onChange={(event) => setProfileBasics((prev) => ({ ...prev, constraints: event.target.value }))}
            placeholder="e.g., 2 hrs/day, exams in May, weekdays only"
            className="min-h-[90px]"
          />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-sm text-foreground">
          Do you have a resume?
          <Select
            value={discovery.has_resume ? "yes" : "no"}
            onValueChange={(value) => setDiscovery((prev) => ({ ...prev, has_resume: value === "yes" }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2 text-sm text-foreground">
          Primary domain
          <Select
            value={discovery.domain_family}
            onValueChange={(value) => setDiscovery((prev) => ({ ...prev, domain_family: value }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2 text-sm text-foreground">
          Education stage
          <Select
            value={discovery.education_stage}
            onValueChange={(value) => setDiscovery((prev) => ({ ...prev, education_stage: value }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="first_year">First year</SelectItem>
              <SelectItem value="year_2">Second year</SelectItem>
              <SelectItem value="year_3">Third year</SelectItem>
              <SelectItem value="year_4">Fourth year+</SelectItem>
              <SelectItem value="working_professional">Working professional</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2 text-sm text-foreground">
          Do you have project evidence?
          <Select
            value={discovery.has_projects ? "yes" : "no"}
            onValueChange={(value) => setDiscovery((prev) => ({ ...prev, has_projects: value === "yes" }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>
      <StepFooterActions
        onContinue={handleDiscovery}
        continueDisabled={submitting || !profileBasics.target_role.trim() || !profileBasics.timeline.trim()}
        continueLabel={submitting ? "Routing..." : "Continue"}
      />
    </div>
  );

  const renderEvidence = () => (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-3">
        <p className="text-sm font-medium text-foreground">Upload resume or continue manually</p>
        <p className="mt-1 text-xs text-muted-foreground">
          You can open mentor immediately while analysis runs in background.
        </p>
      </div>

      {track === "resume_track" ? (
        <div className="space-y-3 rounded-lg border bg-background p-4">
          <p className="text-sm text-muted-foreground">Resume upload</p>
          <Input type="file" onChange={(event) => setResumeFile(event.target.files?.[0] || null)} />
          <Button onClick={handleAnalyzeResume} disabled={!resumeFile || submitting || resumeJobStatus === "running"}>
            {resumeParseState === "uploading"
              ? "Uploading..."
              : resumeParseState === "analyzing"
                ? "Analyzing with AI..."
                : resumeJobStatus === "queued"
                  ? "Queued for analysis"
                  : resumeJobStatus === "running"
                    ? "Analysis running..."
                    : resumeJobStatus === "completed"
                      ? "Analysis completed"
                      : resumeJobStatus === "failed"
                        ? "Retry analysis"
                        : "Analyze resume"}
          </Button>
          {resumeJobStatus && resumeJobStatus !== "completed" && resumeJobStatus !== "failed" ? (
            <p className="text-sm text-muted-foreground">
              Analysis status: {resumeJobStatus === "queued" ? "Queued" : "Running"}...
            </p>
          ) : null}
          {resumeParseState === "success" ? (
            <p className="text-sm text-emerald-700">Resume parsed successfully. Continue below.</p>
          ) : null}
          {Object.keys(resumePayload).length ? (
            <div className="rounded-md border bg-muted/20 p-3 space-y-2 text-sm">
              <p>Skills: {Array.isArray(resumePayload.skills) && (resumePayload.skills as string[]).length
                ? (resumePayload.skills as string[]).slice(0, 8).join(", ")
                : "Not detected"}</p>
              <p>Experience entries: {Array.isArray(resumePayload.experience) ? (resumePayload.experience as unknown[]).length : 0}</p>
              <p>Projects detected: {resumeProjects.length}</p>
            </div>
          ) : null}
          {(resumeJobStatus === "queued" || resumeJobStatus === "running" || resumeJobStatus === "completed") ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-800">
                Analysis is running asynchronously. You can continue now and open mentor.
              </p>
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={() => void openMentorConversation()} disabled={startingHandoff || !auditId}>
                  Open Mentor
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="space-y-2 block text-sm text-foreground">
        Flagship project / artifact title
        <Input value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} />
      </label>

      <ResumeReviewPanel
        projects={resumeProjects}
        onProjectsChange={setResumeProjects}
        onUseFlagship={(project) => {
          setProjectTitle(String(project.title || "Flagship Project"));
          setRepoUrl(String(project.repo_url || project.github_url || ""));
          setSummary(String(project.description || ""));
        }}
      />

      <label className="space-y-2 block text-sm text-foreground">
        GitHub / artifact URL (optional)
        <Input
          value={repoUrl}
          onChange={(event) => setRepoUrl(event.target.value)}
          placeholder="https://github.com/... or portfolio artifact URL"
        />
      </label>

      <label className="space-y-2 block text-sm text-foreground">
        Technical / domain deep dive
        <Textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Describe what you built, your decisions, trade-offs, and impact."
          className="min-h-[120px]"
        />
      </label>

      {track === "builder_track" ? (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Starter diagnostic (lightweight)</p>
          {(["q1", "q2", "q3"] as const).map((qid, idx) => (
            <label key={qid} className="space-y-1 block text-sm text-foreground">
              Scenario {idx + 1} confidence (0-3)
              <Select
                value={String(starterAnswers[qid] ?? 2)}
                onValueChange={(value) => setStarterAnswers((prev) => ({ ...prev, [qid]: Number(value) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </label>
          ))}
        </div>
      ) : null}

      <StepFooterActions
        onBack={() => void advanceStep("discovery")}
        onContinue={handleEvidenceSubmit}
        continueDisabled={
          submitting ||
          (!summary.trim() && !repoUrl.trim() && !Object.keys(resumePayload).length && !resumeJobId)
        }
        continueLabel={submitting ? "Saving..." : "Continue"}
      />
    </div>
  );

  const renderAuditSession = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Complete the short interrogation to generate your VELO insight brief.</p>
      {!interrogation ? (
        <Button onClick={handleStartInterrogation} disabled={!auditId}>Start 5-minute interrogation</Button>
      ) : (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Question {interrogation.questionIndex + 1}/{interrogation.totalQuestions}</p>
          <p className="text-sm text-foreground">{interrogation.question}</p>
          <Textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            className="min-h-[120px]"
            placeholder="Answer with concrete choices and trade-offs."
          />
          <Button onClick={handleSubmitAnswer} disabled={submittingAnswer || !answer.trim()}>
            {submittingAnswer ? "Submitting..." : "Submit answer"}
          </Button>
        </div>
      )}
      <StepFooterActions onBack={() => void advanceStep("evidence_intake")} continueDisabled />
    </div>
  );

  const renderInsightBrief = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Here is your VELO diagnostic snapshot before mentor handoff.</p>
      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">H_m Score</p>
              <p className="text-2xl font-semibold">{report.scores.hm_score ?? "-"}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Eligibility</p>
              <p className="text-sm text-foreground">{report.roadmap_eligibility}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Verification Tier</p>
              <p className="text-sm text-foreground">{report.verification_tier}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Focus areas</p>
              <ul className="mt-2 list-disc pl-4 text-sm text-foreground/90">
                {(report.direction_overview?.focus_areas || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Risk areas</p>
              <ul className="mt-2 list-disc pl-4 text-sm text-foreground/90">
                {(report.direction_overview?.risk_areas || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-3">
            <p className="text-xs text-muted-foreground">Readiness narrative</p>
            <p className="text-sm text-foreground/90">{report.direction_overview?.readiness_narrative}</p>
            <Button onClick={handleMentorHandoff} disabled={startingHandoff || !auditId}>
              {startingHandoff ? "Opening mentor..." : "Continue with mentor"}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Complete the audit session to generate your insight brief.</p>
      )}
    </div>
  );

  const renderMentorRoadmap = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        VELO context + resume context are already loaded in chat. Mentor asks only missing details.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => router.push("/mirror")}>
          View Your Mirror
        </Button>
      </div>
      <MentorReadinessCard
        mentorContextStatus={eligibility?.mentor_context_status || report?.mentor_context_status || "pending"}
        roadmapEligibility={eligibility?.roadmap_eligibility || report?.roadmap_eligibility || "not_ready"}
        canGenerateRoadmap={Boolean(eligibility?.can_generate_roadmap)}
        onOpenMentor={() => void openMentorConversation()}
        onGenerateRoadmap={() => void openMentorConversation()}
      />
    </div>
  );

  const renderStep = () => {
    if (isLoadingSession) {
      return <p className="text-sm text-muted-foreground">Loading onboarding...</p>;
    }
    switch (currentStep) {
      case "discovery":
        return renderDiscovery();
      case "evidence_intake":
        return renderEvidence();
      case "audit_session":
        return renderAuditSession();
      case "insight_brief":
        return renderInsightBrief();
      case "mentor_personalization":
      case "roadmap_launch":
      case "mentor_and_roadmap":
        return renderMentorRoadmap();
      default:
        return renderDiscovery();
    }
  };

  return (
    <VeloShell>
      <div className="rounded-md border p-4 space-y-3 bg-background">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">Onboarding</h2>
          <Badge variant="secondary" className="bg-primary/10 text-foreground">{trustBanner}</Badge>
        </div>
        <StepLoader
          currentStep={currentStep}
          steps={STEP_ORDER.map((step) => ({ key: step, label: STEP_LABELS[step] }))}
        />
      </div>

      <div className="rounded-md border p-4 bg-background">
        <p className="mb-3 text-sm text-muted-foreground">Step {stepIndex + 1} of {STEP_ORDER.length}: {STEP_LABELS[currentStep]}</p>
        {renderStep()}
        {statusMessage ? <StatusBanner tone={statusTone} message={statusMessage} /> : null}
      </div>
    </VeloShell>
  );
}
