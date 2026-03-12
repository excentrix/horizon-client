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

const STEP_LABELS: Record<VeloStep, string> = {
  discovery: "Discovery",
  evidence_intake: "Evidence Intake",
  audit_readiness: "Audit Readiness Check",
  audit_session: "Audit Session",
  insight_brief: "VELO Insight Brief",
  mentor_personalization: "Mentor Personalization",
  roadmap_launch: "Roadmap Launch",
};

const READINESS_QUIZ = [
  {
    id: "logic_1",
    question: "Which answer best reflects evidence-backed work?",
    options: ["I can show artifacts and outcomes", "I watched tutorials", "I skimmed docs"],
    correctIndex: 0,
  },
  {
    id: "logic_2",
    question: "What should happen before roadmap generation?",
    options: ["Mentor context confirmation", "Skip to plan", "Public publish"],
    correctIndex: 0,
  },
  {
    id: "logic_3",
    question: "When is full verification required?",
    options: ["Public employer-facing promotion", "Private learning only", "Never"],
    correctIndex: 0,
  },
];

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
    checklist,
    isLoadingSession,
    runDiscovery,
    submitEvidence,
    loadReport,
    loadEligibility,
    advanceStep,
    setCurrentStep,
  } = useVeloOnboardingFlow();

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumePayload, setResumePayload] = useState<Record<string, unknown>>({});
  const [resumeProjects, setResumeProjects] = useState<Array<Record<string, unknown>>>([]);
  const [repoUrl, setRepoUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [projectTitle, setProjectTitle] = useState("Flagship Project");

  const [discovery, setDiscovery] = useState({
    has_resume: true,
    education_stage: "year_2",
    domain_family: "tech",
    has_projects: true,
  });

  const [starterAnswers, setStarterAnswers] = useState<Record<string, number>>({
    q1: 2,
    q2: 2,
    q3: 2,
  });

  const [readinessAnswers, setReadinessAnswers] = useState<Record<string, number>>({});
  const [claimingSlot, setClaimingSlot] = useState(false);
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
          if (parsedProjects[0]?.repo_url) {
            setRepoUrl(String(parsedProjects[0].repo_url));
          }
          if (parsedProjects[0]?.description) {
            setSummary(String(parsedProjects[0].description));
          }
          if (parsedProjects[0]?.title) {
            setProjectTitle(String(parsedProjects[0].title));
          }
        }
      } catch {
        // ignore bootstrap failures
      }
    };
    if (!isLoadingSession) {
      void hydrate();
    }
  }, [isLoadingSession]);

  useEffect(() => {
    const syncAuditState = async () => {
      if (!auditId) return;
      try {
        const eligibilitySnapshot = await loadEligibility(auditId);
        await loadReport(auditId);
        if (eligibilitySnapshot.can_generate_roadmap && currentStep === "mentor_personalization") {
          await advanceStep("roadmap_launch");
        }
      } catch {
        // report may not exist before audit completion
      }
    };
    if (auditId) {
      void syncAuditState();
    }
  }, [advanceStep, auditId, currentStep, loadEligibility, loadReport]);

  const readinessScore = useMemo(
    () =>
      READINESS_QUIZ.reduce((acc, q) => {
        if (readinessAnswers[q.id] === q.correctIndex) return acc + 1;
        return acc;
      }, 0),
    [readinessAnswers]
  );

  const trustBanner = useMemo(() => {
    if (!eligibility) return "Learning allowed";
    if (eligibility.can_promote_public) return "Public verification complete";
    if (eligibility.can_generate_roadmap) return "Public verification pending";
    return "Learning allowed";
  }, [eligibility]);

  const handleAnalyzeResume = async () => {
    if (!resumeFile) return;
    setSubmitting(true);
    setStatusMessage(null);
    try {
      const form = new FormData();
      form.append("resume", resumeFile);
      const uploaded = await authApi.uploadResume(form);
      const payload = (uploaded.resume_payload || {}) as Record<string, unknown>;
      setResumePayload(payload);
      const parsedProjects = Array.isArray(payload.projects)
        ? (payload.projects as Array<Record<string, unknown>>)
        : [];
      setResumeProjects(parsedProjects);
      if (!projectTitle && parsedProjects[0]?.title) {
        setProjectTitle(String(parsedProjects[0].title));
      }
      if (!repoUrl && (parsedProjects[0]?.repo_url || parsedProjects[0]?.github_url)) {
        setRepoUrl(String(parsedProjects[0].repo_url || parsedProjects[0].github_url));
      }
      if (!summary && (parsedProjects[0]?.description || payload.professional_summary)) {
        setSummary(String(parsedProjects[0]?.description || payload.professional_summary || ""));
      }
      setStatusMessage("Resume parsed. Review and continue.");
    } catch {
      setStatusMessage("Resume parsing failed. Continue with manual builder.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscovery = async () => {
    setSubmitting(true);
    setStatusMessage(null);
    try {
      await runDiscovery(discovery);
      setStatusMessage("Track selected. Continue with evidence intake.");
    } catch {
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
      form.append("project_title", projectTitle);
      if (repoUrl.trim()) form.append("repo_url", repoUrl.trim());
      if (summary.trim()) {
        form.append("summary", summary.trim());
        form.append("narrative_text", summary.trim());
      }
      if (resumeFile) form.append("resume", resumeFile);
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
      setStatusMessage("Evidence mapped successfully.");
      if (result.next_step === "insight_brief" && result.audit_id) {
        await loadReport(result.audit_id);
        await loadEligibility(result.audit_id);
      }
    } catch {
      setStatusMessage("Evidence intake failed. Check required fields.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClaimSlot = async () => {
    if (!auditId) return;
    setClaimingSlot(true);
    setStatusMessage(null);
    try {
      const response = await auditApi.claimQueueSlot({
        audit_id: auditId,
        quiz_score: readinessScore,
        quiz_payload: { answers: readinessAnswers },
      });
      if (response.status !== "claimed") {
        setStatusMessage(response.message || "Slot claim failed.");
        return;
      }
      await advanceStep("audit_session");
      setStatusMessage("Slot claimed. Start your 5-minute VELO session.");
    } catch {
      setStatusMessage("Slot claim failed.");
    } finally {
      setClaimingSlot(false);
    }
  };

  const handleStartInterrogation = async () => {
    if (!auditId) return;
    setStatusMessage(null);
    try {
      const started = await auditApi.startInterrogation(auditId);
      setInterrogation({
        sessionId: started.session_id,
        question: started.question,
        questionIndex: started.question_index,
        totalQuestions: started.total_questions,
      });
      questionStartRef.current = Date.now();
    } catch {
      setStatusMessage("Unable to start VELO session.");
    }
  };

  const handleSubmitAnswer = async () => {
    if (!interrogation || !answer.trim()) return;
    setSubmittingAnswer(true);
    setStatusMessage(null);
    try {
      const latency = questionStartRef.current
        ? Date.now() - questionStartRef.current
        : undefined;
      const response = await auditApi.answerInterrogation(interrogation.sessionId, {
        answer,
        latency_ms: latency,
      });
      setAnswer("");
      if (response.status === "complete") {
        const completed = await auditApi.completeInterrogation(interrogation.sessionId);
        await loadReport(completed.audit_id);
        await loadEligibility(completed.audit_id);
        await advanceStep("insight_brief");
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
      await advanceStep("mentor_personalization");
      router.push(handoff.chat_url);
    } catch {
      setStatusMessage("Unable to start mentor handoff.");
    } finally {
      setStartingHandoff(false);
    }
  };

  const renderDiscovery = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Discovery</h2>
      <p className="text-sm text-muted-foreground">Answer 3 quick questions so VELO can choose the right onboarding track.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Do you have a resume?
          <Select
            value={discovery.has_resume ? "yes" : "no"}
            onValueChange={(value) => setDiscovery((prev) => ({ ...prev, has_resume: value === "yes" }))}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Primary domain
          <Select
            value={discovery.domain_family}
            onValueChange={(value) => setDiscovery((prev) => ({ ...prev, domain_family: value }))}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
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
        <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Education stage
          <Select
            value={discovery.education_stage}
            onValueChange={(value) => setDiscovery((prev) => ({ ...prev, education_stage: value }))}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first_year">First year</SelectItem>
              <SelectItem value="year_2">Second year</SelectItem>
              <SelectItem value="year_3">Third year</SelectItem>
              <SelectItem value="year_4">Fourth year+</SelectItem>
              <SelectItem value="working_professional">Working professional</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Do you already have project evidence?
          <Select
            value={discovery.has_projects ? "yes" : "no"}
            onValueChange={(value) => setDiscovery((prev) => ({ ...prev, has_projects: value === "yes" }))}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </div>
      <Button onClick={handleDiscovery} disabled={submitting} className="border-[3px] border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15">
        {submitting ? "Routing..." : "Continue"}
      </Button>
    </div>
  );

  const renderEvidence = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Evidence Intake</h2>
      <p className="text-sm text-muted-foreground">
        Track: <span className="font-medium">{track}</span> · Mode: <span className="font-medium">{auditMode}</span>
      </p>

      {track === "resume_track" ? (
        <div className="space-y-3 rounded-md border-[2px] border-border p-4">
          <p className="text-sm text-muted-foreground">Upload resume (optional if already parsed in profile).</p>
          <Input
            type="file"
            onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
            className="bg-background border-border text-foreground"
          />
          <Button onClick={handleAnalyzeResume} disabled={!resumeFile || submitting} variant="outline" className="border-[2px] border-border text-foreground">
            Analyze Resume
          </Button>
          {Object.keys(resumePayload).length ? (
            <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Extracted Resume Data</p>
              <p className="text-sm text-muted-foreground">
                Skills: {Array.isArray(resumePayload.skills) && (resumePayload.skills as string[]).length
                  ? (resumePayload.skills as string[]).slice(0, 8).join(", ")
                  : "Not detected"}
              </p>
              <p className="text-sm text-muted-foreground">
                Experience entries: {Array.isArray(resumePayload.experience) ? (resumePayload.experience as unknown[]).length : 0}
              </p>
              <p className="text-sm text-muted-foreground">
                Projects detected: {resumeProjects.length}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <label className="space-y-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Flagship project / artifact title
        <Input
          value={projectTitle}
          onChange={(event) => setProjectTitle(event.target.value)}
          className="bg-background border-border text-foreground"
        />
      </label>

      {track === "resume_track" && resumeProjects.length ? (
        <div className="rounded-md border-[2px] border-border p-4 space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Review & Edit Extracted Projects</p>
          {resumeProjects.slice(0, 3).map((project, index) => (
            <div key={`resume-project-${index}`} className="rounded-md border border-border p-3 space-y-2">
              <Input
                value={String(project.title || "")}
                onChange={(event) =>
                  setResumeProjects((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, title: event.target.value } : item
                    )
                  )
                }
                placeholder="Project title"
                className="bg-background border-border text-foreground"
              />
              <Input
                value={String(project.repo_url || project.github_url || "")}
                onChange={(event) =>
                  setResumeProjects((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, repo_url: event.target.value } : item
                    )
                  )
                }
                placeholder="GitHub / artifact URL"
                className="bg-background border-border text-foreground"
              />
              <Button
                type="button"
                variant="outline"
                className="border-border"
                onClick={() => {
                  setProjectTitle(String(project.title || "Flagship Project"));
                  setRepoUrl(String(project.repo_url || project.github_url || ""));
                  setSummary(String(project.description || ""));
                }}
              >
                Use as flagship
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <label className="space-y-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
        GitHub / artifact URL (optional)
        <Input
          value={repoUrl}
          onChange={(event) => setRepoUrl(event.target.value)}
          placeholder="https://github.com/... or portfolio artifact URL"
          className="bg-background border-border text-foreground"
        />
      </label>

      <label className="space-y-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Technical / domain deep dive
        <Textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Describe what you built, your decisions, trade-offs, and impact."
          className="min-h-[120px] bg-background border-border text-foreground"
        />
      </label>

      {track === "builder_track" ? (
        <div className="rounded-md border-[2px] border-border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Starter diagnostic (lightweight):</p>
          {["q1", "q2", "q3"].map((qid, idx) => (
            <label key={qid} className="space-y-1 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Scenario {idx + 1} confidence (0-3)
              <Select
                value={String(starterAnswers[qid] ?? 2)}
                onValueChange={(value) =>
                  setStarterAnswers((prev) => ({ ...prev, [qid]: Number(value) }))
                }
              >
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
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

      <Button
        onClick={handleEvidenceSubmit}
        disabled={submitting || (!summary.trim() && !repoUrl.trim() && !Object.keys(resumePayload).length)}
        className="border-[3px] border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15"
      >
        {submitting ? "Saving..." : "Continue"}
      </Button>
    </div>
  );

  const renderAuditReadiness = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Audit Readiness Check</h2>
      <p className="text-sm text-muted-foreground">Claim your audit slot before entering the VELO session.</p>
      {READINESS_QUIZ.map((question) => (
        <div key={question.id} className="rounded-md border-[2px] border-border p-3">
          <p className="text-sm text-foreground">{question.question}</p>
          <div className="mt-2 grid gap-2">
            {question.options.map((option, index) => (
              <button
                key={option}
                type="button"
                onClick={() => setReadinessAnswers((prev) => ({ ...prev, [question.id]: index }))}
                className={`rounded border px-3 py-2 text-left text-sm ${
                  readinessAnswers[question.id] === index
                    ? "border-primary/30 bg-primary/10"
                    : "border-border"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Score: {readinessScore}/{READINESS_QUIZ.length}</span>
        <Button onClick={handleClaimSlot} disabled={claimingSlot || !auditId} className="border-[3px] border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15">
          {claimingSlot ? "Claiming..." : "Claim Slot"}
        </Button>
      </div>
    </div>
  );

  const renderAuditSession = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Audit Session</h2>
      {!interrogation ? (
        <Button onClick={handleStartInterrogation} disabled={!auditId} className="border-[3px] border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15">
          Start 5-minute Interrogation
        </Button>
      ) : (
        <div className="space-y-3 rounded-md border-[2px] border-border p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Question {interrogation.questionIndex + 1}/{interrogation.totalQuestions}
          </p>
          <p className="text-sm text-foreground">{interrogation.question}</p>
          <Textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            className="min-h-[120px] bg-background border-border text-foreground"
            placeholder="Answer with concrete choices and trade-offs."
          />
          <Button onClick={handleSubmitAnswer} disabled={submittingAnswer || !answer.trim()} className="border-[3px] border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15">
            {submittingAnswer ? "Submitting..." : "Submit Answer"}
          </Button>
        </div>
      )}
    </div>
  );

  const renderInsightBrief = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">VELO Insight Brief</h2>
      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border-[2px] border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">H_m Score</p>
              <p className="text-2xl font-semibold">{report.scores.hm_score ?? "-"}</p>
            </div>
            <div className="rounded-md border-[2px] border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Eligibility</p>
              <p className="text-sm text-foreground">{report.roadmap_eligibility}</p>
            </div>
            <div className="rounded-md border-[2px] border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Verification Tier</p>
              <p className="text-sm text-foreground">{report.verification_tier}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border-[2px] border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Focus areas</p>
              <ul className="mt-2 list-disc pl-4 text-sm text-foreground/90">
                {(report.direction_overview?.focus_areas || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border-[2px] border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">Risk areas</p>
              <ul className="mt-2 list-disc pl-4 text-sm text-foreground/90">
                {(report.direction_overview?.risk_areas || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="rounded-md border-[2px] border-border p-3 space-y-3">
            <p className="text-xs uppercase text-muted-foreground">Readiness narrative</p>
            <p className="text-sm text-foreground/90">{report.direction_overview?.readiness_narrative}</p>
            <Button onClick={handleMentorHandoff} disabled={startingHandoff || !auditId} className="border-[3px] border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15">
              {startingHandoff ? "Opening mentor..." : "Continue with Mentor"}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Complete the audit session to generate your insight brief.</p>
      )}
    </div>
  );

  const renderMentorAndLaunch = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        {currentStep === "roadmap_launch" ? "Roadmap Launch" : "Mentor Personalization"}
      </h2>
      <p className="text-sm text-muted-foreground">
        Complete mentor intake in chat first. Once mentor context is confirmed, roadmap generation is unlocked.
      </p>
      <div className="rounded-md border-[2px] border-border p-4 space-y-2 text-sm">
        <p>Mentor context status: <span className="font-medium">{eligibility?.mentor_context_status || report?.mentor_context_status || "pending"}</span></p>
        <p>Roadmap eligibility: <span className="font-medium">{eligibility?.roadmap_eligibility || report?.roadmap_eligibility || "not_ready"}</span></p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => router.push(`/chat?context=velo_intake&audit=${auditId || ""}`)}
          className="border-[3px] border-primary/30 bg-primary/10 text-foreground hover:bg-primary/15"
        >
          Continue with Mentor
        </Button>
        <Button
          variant="outline"
          disabled={!eligibility?.can_generate_roadmap}
          onClick={() => router.push("/chat")}
          className="border-[2px] border-border text-foreground disabled:opacity-50"
        >
          Generate Roadmap in Chat
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            if (!auditId) return;
            const refreshed = await loadEligibility(auditId);
            if (refreshed.can_generate_roadmap) {
              await advanceStep("roadmap_launch");
              setStatusMessage("Mentor context confirmed. You can now generate roadmap.");
            } else {
              setStatusMessage("Mentor context still pending. Finish chat intake first.");
            }
          }}
          className="text-muted-foreground"
        >
          Refresh Status
        </Button>
      </div>
      {eligibility?.can_generate_roadmap ? (
        <p className="text-sm text-emerald-700">
          You are ready. Next step: generate your personalized roadmap in chat.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          You’ll stop seeing redirects after mentor context is confirmed.
        </p>
      )}
    </div>
  );

  const renderStep = () => {
    if (isLoadingSession) {
      return <p className="text-sm text-muted-foreground">Loading VELO onboarding...</p>;
    }
    switch (currentStep) {
      case "discovery":
        return renderDiscovery();
      case "evidence_intake":
        return renderEvidence();
      case "audit_readiness":
        return renderAuditReadiness();
      case "audit_session":
        return renderAuditSession();
      case "insight_brief":
        return renderInsightBrief();
      case "mentor_personalization":
      case "roadmap_launch":
        return renderMentorAndLaunch();
      default:
        return renderDiscovery();
    }
  };

  const manualStepJump = (step: VeloStep) => {
    setCurrentStep(step);
    void advanceStep(step);
  };

  return (
    <VeloShell>
      <div className="rounded-md border-[3px] border-border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Universal Onboarding 2.0</h2>
          <Badge variant="secondary" className="bg-primary/10 text-foreground">{trustBanner}</Badge>
        </div>
        <div className="grid gap-2 md:grid-cols-5 text-xs">
          <StatusChip label="Profile Captured" done={checklist.profileCaptured} />
          <StatusChip label="Evidence Mapped" done={checklist.evidenceMapped} />
          <StatusChip label="Audit Completed" done={checklist.auditCompleted} />
          <StatusChip label="Mentor Context Confirmed" done={checklist.mentorContextConfirmed} />
          <StatusChip label="Roadmap Generated" done={checklist.roadmapGenerated} />
        </div>
      </div>

      <div className="rounded-md border-[3px] border-border p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STEP_LABELS) as VeloStep[]).map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => manualStepJump(step)}
              className={`rounded border px-2 py-1 text-[11px] ${currentStep === step ? "border-primary/30 bg-primary/10" : "border-border"}`}
            >
              {STEP_LABELS[step]}
            </button>
          ))}
        </div>
        {renderStep()}
        {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
      </div>
    </VeloShell>
  );
}

function StatusChip({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`rounded border px-2 py-1 ${done ? "border-primary/30 bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}>
      {label}
    </div>
  );
}
