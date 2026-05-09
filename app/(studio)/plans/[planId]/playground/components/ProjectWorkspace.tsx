"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { planningApi } from "@/lib/api";
import type {
  LearningProjectShape,
  ProjectPhase,
  ProjectSuggestion,
  ProjectPhaseShape,
  GateStatus,
} from "@/types";
import { ProjectVerificationPrompt } from "./ProjectVerificationPrompt";

// ── Phase meta ─────────────────────────────────────────────────────────────

const PHASE_ORDER: ProjectPhase[] = [
  "scoping", "planning", "building", "documenting",
  "submitting", "verifying", "case_study", "completed",
];

const PHASE_LABELS: Record<ProjectPhase, string> = {
  scoping:     "Scope",
  planning:    "Plan",
  building:    "Build",
  documenting: "Document",
  submitting:  "Submit",
  verifying:   "Verify",
  case_study:  "Case Study",
  completed:   "Done",
};

const PHASE_ICONS: Record<ProjectPhase, string> = {
  scoping:     "🎯",
  planning:    "🗺️",
  building:    "🔨",
  documenting: "📝",
  submitting:  "📦",
  verifying:   "🔍",
  case_study:  "📖",
  completed:   "🏆",
};

const PHASE_DESC: Record<ProjectPhase, string> = {
  scoping:     "Define what you're building, why, and what success looks like.",
  planning:    "Break your project into milestones with expected outputs.",
  building:    "Do the work. Submit evidence for each milestone.",
  documenting: "Write up your decisions, rationale, and process.",
  submitting:  "Submit your final artifact — repo, doc, design file, or demo.",
  verifying:   "VELO verifies your project through a technical interview.",
  case_study:  "Write a portfolio-grade case study of what you built and learned.",
  completed:   "Your project is verified and added to your portfolio.",
};

// ── Phase gate status helper ───────────────────────────────────────────────

function getPhaseGateStatus(project: LearningProjectShape, phase: ProjectPhase): GateStatus {
  const map: Partial<Record<ProjectPhase, GateStatus>> = {
    scoping:     project.scope_gate_status,
    planning:    project.plan_gate_status,
    building:    project.build_gate_status,
    documenting: project.methodology_gate_status,
    submitting:  project.submission_gate_status,
    case_study:  project.case_study_gate_status,
  };
  return map[phase] ?? "pending";
}

// ── Gate status badge ──────────────────────────────────────────────────────

function GateBadge({ status }: { status: GateStatus }) {
  const styles: Record<GateStatus, string> = {
    pending:        "bg-slate-100 text-slate-500 border-slate-200",
    passed:         "bg-emerald-50 text-emerald-700 border-emerald-200",
    needs_revision: "bg-red-50 text-red-600 border-red-200",
    mentor_pending: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const labels: Record<GateStatus, string> = {
    pending:        "Not submitted",
    passed:         "Passed",
    needs_revision: "Needs revision",
    mentor_pending: "Awaiting mentor",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ── Phase stepper ─────────────────────────────────────────────────────────

function PhaseStepper({ current }: { current: ProjectPhase }) {
  const currentIdx = PHASE_ORDER.indexOf(current);
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {PHASE_ORDER.map((phase, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={phase} className="flex items-center">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
              done    ? "bg-emerald-500 text-white" :
              active  ? "bg-violet-600 text-white ring-2 ring-violet-300" :
                        "bg-slate-100 text-slate-400 border border-slate-200"
            }`}>
              {done ? "✓" : PHASE_ICONS[phase]}
            </div>
            <span className={`mx-1 hidden text-[10px] font-medium lg:block ${
              active ? "text-slate-900" : done ? "text-emerald-600" : "text-slate-400"
            }`}>
              {PHASE_LABELS[phase]}
            </span>
            {i < PHASE_ORDER.length - 1 && (
              <div className={`h-px w-6 shrink-0 ${i < currentIdx ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Shared input styles ────────────────────────────────────────────────────

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition";
const textareaCls = `${inputCls} resize-none`;

// ── Suggestion panel ───────────────────────────────────────────────────────

function SuggestionPanel({
  project,
  onChosen,
}: {
  project: LearningProjectShape;
  onChosen: (updated: LearningProjectShape) => void;
}) {
  const options = project.suggestion_context?.options_shown ?? [];
  const [selected, setSelected] = useState<number | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleChoose() {
    if (selected === null && !customMode) return;
    setLoading(true);
    setFeedback(null);
    try {
      const payload = customMode
        ? { custom_proposal: { title: customTitle, description: customDesc } }
        : { chosen_index: selected! };
      const result = await planningApi.chooseSuggestion(project.id, payload);
      if ("accepted" in result && result.accepted === false) {
        setFeedback(result.feedback);
      } else {
        onChosen(result as LearningProjectShape);
      }
    } catch {
      setFeedback("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Choose Your Project</h3>
        <p className="mt-1 text-sm text-slate-500">
          These are tailored to the concepts you just studied. Pick one, customise it, or propose your own.
        </p>
      </div>

      {options.length > 0 && !customMode && (
        <div className="space-y-3">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                selected === i
                  ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{opt.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{opt.description}</p>
                  <p className="mt-1.5 text-xs text-violet-600">{opt.why_good_fit}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(opt.concepts_covered ?? []).map((c) => (
                      <span key={c} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{c}</span>
                    ))}
                  </div>
                </div>
                <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition ${
                  selected === i ? "border-violet-500 bg-violet-500" : "border-slate-300"
                }`} />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                {opt.estimated_effort} · Deliverable: {opt.deliverable}
              </p>
            </button>
          ))}
        </div>
      )}

      {!customMode ? (
        <button onClick={() => setCustomMode(true)} className="text-xs text-slate-400 underline hover:text-slate-600">
          Propose my own project instead
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-700">Your Proposal</p>
          <input
            className={inputCls}
            placeholder="Project title"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
          />
          <textarea
            rows={3}
            className={textareaCls}
            placeholder="What will you build and why?"
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
          />
          <button onClick={() => setCustomMode(false)} className="text-xs text-slate-400 underline hover:text-slate-600">
            Back to suggestions
          </button>
        </div>
      )}

      {feedback && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          {feedback}
        </div>
      )}

      <button
        onClick={handleChoose}
        disabled={loading || (!customMode && selected === null) || (customMode && !customTitle)}
        className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
      >
        {loading ? "Checking…" : "Start with this project →"}
      </button>
    </div>
  );
}

// ── Gate attempt button ────────────────────────────────────────────────────

function GateAttemptButton({
  project,
  onAdvanced,
}: {
  project: LearningProjectShape;
  onAdvanced: (updated: LearningProjectShape) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const gateStatus = getPhaseGateStatus(project, project.current_phase);

  if (gateStatus === "mentor_pending") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        <p className="font-semibold">Awaiting mentor review</p>
        <p className="mt-1 text-xs text-amber-600">Your submission is with your mentor. You'll be notified when they respond.</p>
      </div>
    );
  }

  async function attempt() {
    setLoading(true);
    setIssues([]);
    setSuggestions([]);
    try {
      const result = await planningApi.attemptPhaseGate(project.id);
      if (result.advanced) {
        onAdvanced(result.project);
      } else {
        setIssues(result.issues ?? []);
        setSuggestions(result.suggestions ?? []);
      }
    } catch {
      setIssues(["Something went wrong. Please try again."]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {issues.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-red-600">Fix these before advancing:</p>
          <ul className="space-y-1.5">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-red-700">
                <span className="mt-0.5 shrink-0 text-red-500">✗</span> {issue}
              </li>
            ))}
          </ul>
          {suggestions.length > 0 && (
            <>
              <p className="mt-3 text-xs font-semibold text-slate-600">Suggestions:</p>
              <ul className="space-y-1.5">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-0.5 shrink-0 text-violet-500">→</span> {s}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <button
        onClick={attempt}
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
      >
        {loading ? "Checking…" : `Submit ${PHASE_LABELS[project.current_phase]} →`}
      </button>
    </div>
  );
}

// ── Phase-specific content panels ──────────────────────────────────────────

function PhasePanel({ project, onUpdate }: { project: LearningProjectShape; onUpdate: (p: LearningProjectShape) => void }) {
  const phase = project.current_phase;

  if (phase === "scoping")     return <ScopingPanel project={project} onUpdate={onUpdate} />;
  if (phase === "planning")    return <PlanningPanel project={project} onUpdate={onUpdate} />;
  if (phase === "building")    return <BuildingPanel project={project} onUpdate={onUpdate} />;
  if (phase === "documenting") return <DocumentingPanel project={project} onUpdate={onUpdate} />;
  if (phase === "submitting")  return <SubmittingPanel project={project} onUpdate={onUpdate} />;
  if (phase === "verifying")   return <VerifyingPanel project={project} />;
  if (phase === "case_study")  return <CaseStudyPanel project={project} onUpdate={onUpdate} />;
  if (phase === "completed")   return <CompletedPanel project={project} />;
  return null;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-700 mb-1">{children}</label>;
}

function HintText({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] text-slate-400">{children}</p>;
}

function SaveButton({ saving, label = "Save" }: { saving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
    >
      {saving ? "Saving…" : label}
    </button>
  );
}

// Scoping
function ScopingPanel({ project, onUpdate }: { project: LearningProjectShape; onUpdate: (p: LearningProjectShape) => void }) {
  const scope = project.scope_document as Record<string, string | string[]>;
  const [form, setForm] = useState({
    problem:          String(scope.problem ?? ""),
    objectives:       (scope.objectives as string[] ?? []).join("\n"),
    success_criteria: (scope.success_criteria as string[] ?? []).join("\n"),
    out_of_scope:     (scope.out_of_scope as string[] ?? []).join("\n"),
    constraints:      (scope.constraints as string[] ?? []).join("\n"),
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await planningApi.updateProjectScope(project.id, {
        problem:          form.problem,
        objectives:       form.objectives.split("\n").filter(Boolean),
        success_criteria: form.success_criteria.split("\n").filter(Boolean),
        out_of_scope:     form.out_of_scope.split("\n").filter(Boolean),
        constraints:      form.constraints.split("\n").filter(Boolean),
      });
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  }

  const fields: Array<{ key: keyof typeof form; label: string; hint: string; rows: number }> = [
    { key: "problem",          label: "Problem Statement",  hint: "What problem are you solving and for whom?",           rows: 4 },
    { key: "objectives",       label: "Objectives",         hint: "One objective per line — specific and measurable",     rows: 3 },
    { key: "success_criteria", label: "Success Criteria",   hint: "One criterion per line — how will you know you're done?", rows: 3 },
    { key: "out_of_scope",     label: "Out of Scope",       hint: "One item per line — what are you NOT building?",       rows: 3 },
    { key: "constraints",      label: "Constraints",        hint: "One constraint per line — time, tech, resources",      rows: 3 },
  ];

  return (
    <div className="space-y-4">
      {fields.map(({ key, label, hint, rows }) => (
        <div key={key}>
          <SectionLabel>{label}</SectionLabel>
          <HintText>{hint}</HintText>
          <textarea
            rows={rows}
            className={textareaCls}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          />
        </div>
      ))}
      <SaveButton saving={saving} />
    </div>
  );
}

// Planning
function PlanningPanel({ project, onUpdate }: { project: LearningProjectShape; onUpdate: (p: LearningProjectShape) => void }) {
  const [milestones, setMilestones] = useState(project.milestones);
  const [saving, setSaving] = useState(false);

  function addMilestone() {
    setMilestones((m) => [
      ...m,
      { id: `ms-${Date.now()}`, title: "", description: "", expected_output: "", status: "pending" as const },
    ]);
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await planningApi.updateProjectMilestones(project.id, milestones);
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Define your milestones. Each needs a title, description, and expected output.</p>
      {milestones.map((m, i) => (
        <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Milestone {i + 1}</p>
          {(["title", "description", "expected_output"] as const).map((field) => (
            <div key={field}>
              <SectionLabel>{field.replace("_", " ")}</SectionLabel>
              <input
                className={inputCls}
                value={m[field] ?? ""}
                onChange={(e) => setMilestones((ms) => ms.map((x, j) => j === i ? { ...x, [field]: e.target.value } : x))}
              />
            </div>
          ))}
        </div>
      ))}
      <div className="flex gap-3">
        <button
          onClick={addMilestone}
          className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors"
        >
          + Add Milestone
        </button>
        <SaveButton saving={saving} label="Save Plan" />
      </div>
    </div>
  );
}

// Building
function BuildingPanel({ project, onUpdate }: { project: LearningProjectShape; onUpdate: (p: LearningProjectShape) => void }) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, string>>({});

  async function submit(milestoneId: string) {
    setSubmitting(milestoneId);
    try {
      const updated = await planningApi.submitMilestone(project.id, milestoneId, contents[milestoneId] ?? "");
      onUpdate(updated);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Submit evidence for each milestone as you complete it.</p>
      {project.milestones.map((m) => {
        const existing = project.milestone_submissions.find((s) => s.milestone_id === m.id);
        return (
          <div key={m.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">{m.title}</p>
              {existing && <GateBadge status={existing.status === "approved" ? "passed" : existing.status === "needs_revision" ? "needs_revision" : "pending"} />}
            </div>
            <p className="text-xs text-slate-500">Expected: {m.expected_output}</p>
            <textarea
              rows={3}
              className={textareaCls}
              placeholder="Describe what you built for this milestone…"
              defaultValue={existing?.content ?? ""}
              onChange={(e) => setContents((c) => ({ ...c, [m.id]: e.target.value }))}
            />
            {existing?.feedback && (
              <p className="text-xs text-amber-600">Feedback: {existing.feedback}</p>
            )}
            <button
              onClick={() => submit(m.id)}
              disabled={submitting === m.id}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              {submitting === m.id ? "Submitting…" : existing ? "Update" : "Submit"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Documenting
function DocumentingPanel({ project, onUpdate }: { project: LearningProjectShape; onUpdate: (p: LearningProjectShape) => void }) {
  const [doc, setDoc] = useState(project.methodology_doc);
  const [template, setTemplate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!project.methodology_doc) {
      planningApi.getMethodologyTemplate(project.id).then((r) => setTemplate(r.template)).catch(() => {});
    }
  }, [project.id, project.methodology_doc]);

  async function save() {
    setSaving(true);
    try {
      const updated = await planningApi.updateMethodologyDoc(project.id, doc);
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  }

  const feedback = project.methodology_gate_feedback as Record<string, unknown>;
  const issues = (feedback?.issues ?? []) as string[];

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Document your decisions and process. Fill each section — be specific and concrete.
      </p>
      {issues.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
          {issues.map((issue, i) => (
            <p key={i} className="text-xs text-red-600">✗ {issue}</p>
          ))}
        </div>
      )}
      {!doc && template && (
        <button
          onClick={() => setDoc(template)}
          className="rounded-lg border border-dashed border-violet-400 px-4 py-2 text-xs text-violet-600 hover:bg-violet-50 transition-colors"
        >
          Load pre-filled template
        </button>
      )}
      <textarea
        rows={20}
        className={`${textareaCls} font-mono`}
        placeholder={"# Your Project Title\n\n## Architecture\n…"}
        value={doc}
        onChange={(e) => setDoc(e.target.value)}
      />
      <SaveButton saving={saving} label="Save Document" />
    </div>
  );
}

// Submitting
function SubmittingPanel({ project, onUpdate }: { project: LearningProjectShape; onUpdate: (p: LearningProjectShape) => void }) {
  const ARTIFACT_TYPES = [
    { value: "github_repo",   label: "GitHub Repo" },
    { value: "document",      label: "Document / PDF" },
    { value: "design_file",   label: "Design File (Figma etc.)" },
    { value: "presentation",  label: "Presentation" },
    { value: "notebook",      label: "Notebook (Jupyter etc.)" },
    { value: "demo_url",      label: "Live Demo URL" },
    { value: "other",         label: "Other" },
  ] as const;

  const [artifacts, setArtifacts] = useState(project.submission_artifacts);
  const [saving, setSaving] = useState(false);

  function add() {
    setArtifacts((a) => [...a, { type: "github_repo", url: "", label: "" }]);
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await planningApi.updateArtifacts(project.id, artifacts);
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Submit your final artifact. Add all relevant links.</p>
      {artifacts.map((a, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <select
            className={inputCls}
            value={a.type}
            onChange={(e) => setArtifacts((arr) => arr.map((x, j) => j === i ? { ...x, type: e.target.value as typeof a.type } : x))}
          >
            {ARTIFACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            className={inputCls}
            placeholder="URL"
            value={a.url}
            onChange={(e) => setArtifacts((arr) => arr.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
          />
          <input
            className={inputCls}
            placeholder="Label (e.g. Main App)"
            value={a.label}
            onChange={(e) => setArtifacts((arr) => arr.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
          />
        </div>
      ))}
      <div className="flex gap-3">
        <button
          onClick={add}
          className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors"
        >
          + Add Artifact
        </button>
        <SaveButton saving={saving} />
      </div>
    </div>
  );
}

// Verifying — delegates to VELO flow via ProjectVerificationPrompt
function VerifyingPanel({ project }: { project: LearningProjectShape }) {
  if (project.verification_verdict && project.verification_verdict !== "pending") {
    const isVerified = project.verification_verdict === "verified";
    return (
      <div className={`rounded-xl border p-5 ${
        isVerified
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : project.verification_verdict === "suspicious"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-red-200 bg-red-50 text-red-600"
      }`}>
        <p className="text-sm font-semibold capitalize">
          VELO verdict: {project.verification_verdict}
        </p>
        {isVerified && (
          <p className="mt-1 text-xs opacity-80">
            Your project has been verified. Continue to the Case Study phase.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
        <p className="text-sm font-semibold text-violet-900">VELO Verification</p>
        <p className="mt-1.5 text-xs text-violet-700">
          VELO will review your artifacts, validate your documentation, and conduct
          a domain-specific technical interview to confirm what you built.
        </p>
      </div>
      <ProjectVerificationPrompt
        taskId={project.task_id ?? ""}
        taskTitle={project.title}
      />
    </div>
  );
}

// Case Study
function CaseStudyPanel({ project, onUpdate }: { project: LearningProjectShape; onUpdate: (p: LearningProjectShape) => void }) {
  type CaseStudyKey = "problem" | "approach" | "key_decisions" | "what_failed" | "outcome" | "if_more_time" | "learnings";
  const [cs, setCs] = useState<Record<CaseStudyKey, string>>({
    problem:       String((project.case_study as Record<string, unknown>)?.problem ?? ""),
    approach:      String((project.case_study as Record<string, unknown>)?.approach ?? ""),
    key_decisions: String((project.case_study as Record<string, unknown>)?.key_decisions ?? ""),
    what_failed:   String((project.case_study as Record<string, unknown>)?.what_failed ?? ""),
    outcome:       String((project.case_study as Record<string, unknown>)?.outcome ?? ""),
    if_more_time:  String((project.case_study as Record<string, unknown>)?.if_more_time ?? ""),
    learnings:     String((project.case_study as Record<string, unknown>)?.learnings ?? ""),
  });
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);

  async function loadDraft() {
    setDrafting(true);
    try {
      const { draft } = await planningApi.getCaseStudyDraft(project.id);
      setCs((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next) as CaseStudyKey[]) {
          const val = (draft as Record<string, unknown>)[key];
          if (val && !next[key]) next[key] = Array.isArray(val) ? val.join("\n") : String(val);
        }
        return next;
      });
    } finally {
      setDrafting(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await planningApi.updateCaseStudy(project.id, cs);
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  }

  const fields: Array<{ key: CaseStudyKey; label: string }> = [
    { key: "problem",       label: "Problem" },
    { key: "approach",      label: "Approach" },
    { key: "key_decisions", label: "Key Decisions" },
    { key: "what_failed",   label: "What Failed" },
    { key: "outcome",       label: "Outcome" },
    { key: "if_more_time",  label: "If I Had More Time" },
    { key: "learnings",     label: "Learnings" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Write a portfolio-grade case study from your project experience.</p>
        <button
          onClick={loadDraft}
          disabled={drafting}
          className="rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-40 transition-colors"
        >
          {drafting ? "Drafting…" : "✨ AI Draft"}
        </button>
      </div>
      {fields.map(({ key, label }) => (
        <div key={key}>
          <SectionLabel>{label}</SectionLabel>
          <textarea
            rows={3}
            className={textareaCls}
            value={cs[key]}
            onChange={(e) => setCs((c) => ({ ...c, [key]: e.target.value }))}
          />
        </div>
      ))}
      <SaveButton saving={saving} label="Save Case Study" />
    </div>
  );
}

// Completed
function CompletedPanel({ project }: { project: LearningProjectShape }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3">
      <p className="text-4xl">🏆</p>
      <p className="text-lg font-bold text-emerald-700">Project Complete</p>
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{project.title}</span> has been verified
        and added to your portfolio.
      </p>
    </div>
  );
}

// ── Dynamic phase stepper (milestone-scoped) ──────────────────────────────

function DynamicPhaseStepper({
  phases,
  activeTaskId,
}: {
  phases: ProjectPhaseShape[];
  activeTaskId: string;
}) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {phases.map((phase, i) => {
        const isActive = phase.task_id === activeTaskId;
        const isDone = phase.gate_status === "passed";
        return (
          <div key={phase.phase_id} className="flex items-center">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
              isDone   ? "bg-emerald-500 text-white" :
              isActive ? "bg-violet-600 text-white ring-2 ring-violet-300" :
                         "bg-slate-100 text-slate-400 border border-slate-200"
            }`}>
              {isDone ? "✓" : i + 1}
            </div>
            <span className={`mx-1 hidden max-w-[80px] truncate text-[10px] font-medium lg:block ${
              isActive ? "text-slate-900" : isDone ? "text-emerald-600" : "text-slate-400"
            }`}>
              {phase.label}
            </span>
            {i < phases.length - 1 && (
              <div className={`h-px w-6 shrink-0 ${isDone ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Dynamic deliverable panel (milestone-scoped) ──────────────────────────

const FIELD_LABELS: Record<string, string> = {
  problem_statement:  "Problem Statement",
  objectives:         "Objectives",
  success_criteria:   "Success Criteria",
  out_of_scope:       "Out of Scope",
  constraints:        "Constraints",
  schema_description: "Schema Description",
  entities_and_fields: "Entities & Fields",
  relationships:      "Relationships",
  sample_queries:     "Sample Queries",
  design_decisions:   "Design Decisions",
  implementation_notes: "Implementation Notes",
  how_to_run:         "How to Run",
  test_cases_passed:  "Test Cases Passed",
  repository_url:     "Repository URL",
  presentation_url:   "Presentation URL",
  key_points:         "Key Points",
  audience:           "Audience",
  demo_notes:         "Demo Notes",
  main_deliverable:   "Main Deliverable",
  approach:           "Approach",
  outcome:            "Outcome",
};

const URL_FIELDS = new Set(["repository_url", "presentation_url"]);
const MONOSPACE_FIELDS = new Set(["entities_and_fields", "sample_queries", "schema_description"]);

function DynamicDeliverablePanel({
  project,
  phase,
  onUpdate,
}: {
  project: LearningProjectShape;
  phase: ProjectPhaseShape;
  onUpdate: (updated: LearningProjectShape) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    () => {
      const sub = phase.submission ?? {};
      return Object.fromEntries(phase.form_fields.map((f) => [f, String(sub[f] ?? "")]));
    }
  );
  const [saving, setSaving] = useState(false);
  const [gating, setGating] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await planningApi.updatePhaseSubmission(project.id, phase.task_id, values);
      onUpdate(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleGate() {
    setGating(true);
    setIssues([]);
    try {
      const result = await planningApi.attemptPhaseGate(project.id, phase.task_id);
      if (result.advanced) {
        onUpdate(result.project);
      } else {
        setIssues(result.issues ?? []);
      }
    } catch {
      setIssues(["Something went wrong. Please try again."]);
    } finally {
      setGating(false);
    }
  }

  return (
    <div className="space-y-4">
      {phase.gate_status === "passed" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ This phase is complete.
        </div>
      )}
      {phase.form_fields.map((field) => {
        const isUrl = URL_FIELDS.has(field);
        const isMono = MONOSPACE_FIELDS.has(field);
        const label = FIELD_LABELS[field] ?? field.replace(/_/g, " ");
        return (
          <div key={field}>
            <SectionLabel>{label}</SectionLabel>
            {isUrl ? (
              <input
                type="url"
                className={inputCls}
                value={values[field] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                placeholder="https://"
              />
            ) : (
              <textarea
                rows={4}
                className={`${textareaCls} ${isMono ? "font-mono text-xs" : ""}`}
                value={values[field] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
              />
            )}
          </div>
        );
      })}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {phase.gate_status !== "passed" && (
          <button
            onClick={handleGate}
            disabled={gating}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40 transition-colors"
          >
            {gating ? "Checking…" : "Submit & Check Gate"}
          </button>
        )}
      </div>

      {issues.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-1.5">
          <p className="text-xs font-semibold text-red-600">Fix these before advancing:</p>
          {issues.map((issue, i) => (
            <p key={i} className="flex items-start gap-2 text-xs text-red-700">
              <span className="mt-0.5 shrink-0">✗</span> {issue}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dynamic workspace (milestone-scoped project) ──────────────────────────

function DynamicWorkspace({
  project,
  taskId,
  onUpdate,
  phasePanelRef,
  phaseHighlighted,
}: {
  project: LearningProjectShape;
  taskId: string;
  onUpdate: (updated: LearningProjectShape) => void;
  phasePanelRef: React.RefObject<HTMLDivElement | null>;
  phaseHighlighted: boolean;
}) {
  const phases = project.phases ?? [];
  const activePhase = phases.find((p) => p.task_id === taskId) ?? phases[0];

  if (!activePhase) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No phases found for this milestone.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <DynamicPhaseStepper phases={phases} activeTaskId={taskId} />
      </div>

      <div
        ref={phasePanelRef}
        className={`rounded-xl border bg-white shadow-sm transition-all duration-500 ${
          phaseHighlighted ? "border-violet-400 ring-2 ring-violet-300/40" : "border-slate-200"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{activePhase.label}</h3>
              <GateBadge status={activePhase.gate_status} />
            </div>
            <p className="text-xs text-slate-500 capitalize">
              {activePhase.deliverable_type} deliverable · Phase {activePhase.order + 1} of {phases.length}
            </p>
          </div>
        </div>
        <div className="p-5">
          <DynamicDeliverablePanel project={project} phase={activePhase} onUpdate={onUpdate} />
        </div>
      </div>
    </div>
  );
}

// ── Legacy workspace (task-scoped, backward-compat) ───────────────────────

function LegacyWorkspace({
  project,
  onUpdate,
  phasePanelRef,
  phaseHighlighted,
}: {
  project: LearningProjectShape;
  onUpdate: (updated: LearningProjectShape) => void;
  phasePanelRef: React.RefObject<HTMLDivElement | null>;
  phaseHighlighted: boolean;
}) {
  const needsSuggestion = !project.suggestion_context?.chosen_index && !project.suggestion_context?.custom_proposal;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <PhaseStepper current={project.current_phase} />
      </div>

      <div
        ref={phasePanelRef}
        className={`rounded-xl border bg-white shadow-sm transition-all duration-500 ${
          phaseHighlighted ? "border-violet-400 ring-2 ring-violet-300/40" : "border-slate-200"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="text-2xl">{PHASE_ICONS[project.current_phase]}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{PHASE_LABELS[project.current_phase]}</h3>
              <GateBadge status={getPhaseGateStatus(project, project.current_phase)} />
            </div>
            <p className="text-xs text-slate-500">{PHASE_DESC[project.current_phase]}</p>
          </div>
          {project.similarity_checked && (project.uniqueness_score ?? 1) < 0.75 && (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] text-amber-600">
              Similar project exists
            </span>
          )}
        </div>
        <div className="p-5">
          {needsSuggestion && project.current_phase === "scoping" ? (
            <SuggestionPanel project={project} onChosen={onUpdate} />
          ) : (
            <div className="space-y-6">
              <PhasePanel project={project} onUpdate={onUpdate} />
              {project.current_phase !== "completed" && project.current_phase !== "verifying" && (
                <div className="border-t border-slate-100 pt-4">
                  <GateAttemptButton project={project} onAdvanced={onUpdate} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ProjectWorkspace ──────────────────────────────────────────────────

interface ProjectWorkspaceProps {
  taskId: string;
  scrollToPhase?: string;
}

export function ProjectWorkspace({ taskId, scrollToPhase }: ProjectWorkspaceProps) {
  const [project, setProject] = useState<LearningProjectShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phaseHighlighted, setPhaseHighlighted] = useState(false);
  const phasePanelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await planningApi.initProject(taskId);
      setProject(data);
    } catch {
      setError("Could not load project workspace.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!scrollToPhase || !project || loading) return;
    const el = phasePanelRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (scrollToPhase === project.current_phase) {
      setPhaseHighlighted(true);
      const t = setTimeout(() => setPhaseHighlighted(false), 2000);
      return () => clearTimeout(t);
    }
  }, [scrollToPhase, project, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-violet-500" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error ?? "Project not found."}
      </div>
    );
  }

  // Milestone-scoped project with dynamic phases → DynamicWorkspace
  if ((project.phases ?? []).length > 0) {
    return (
      <DynamicWorkspace
        project={project}
        taskId={taskId}
        onUpdate={setProject}
        phasePanelRef={phasePanelRef}
        phaseHighlighted={phaseHighlighted}
      />
    );
  }

  // Legacy task-scoped project → LegacyWorkspace
  return (
    <LegacyWorkspace
      project={project}
      onUpdate={setProject}
      phasePanelRef={phasePanelRef}
      phaseHighlighted={phaseHighlighted}
    />
  );
}
