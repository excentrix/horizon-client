import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Link, FileText, Upload, ShieldCheck, CheckCircle2, Loader2, Trophy, AlertTriangle, ExternalLink, ArrowRight, ListChecks, ClipboardList, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ArtifactVerifiedEvent {
  type: string;
  artifact_id: string;
  task_id: string | null;
  verification_score: number;
  verification_status: string;
  passed: boolean;
  strengths: string[];
  suggestions: string[];
  verdict_summary?: string;
  criteria_count?: number;
}

interface VerificationEngineProps {
  taskId: string;
  verificationMethod: string;
  verificationCriteria: string;
  taskDescription: string;
  verificationDetailedInstructions?: string;
  // Richer AI-generated challenge fields
  problemStatement?: string;
  acceptanceCriteria?: string[];
  exampleInputsOutputs?: string;
  submissionNote?: string;
  problemSet?: Array<{
    id?: string;
    title?: string;
    difficulty?: string;
    prompt?: string;
    input_contract?: string;
    output_contract?: string;
    self_check_cases?: Array<string | { description?: string; input?: string; expected_output?: string }>;
    edge_cases?: string[];
    anti_cheat_signals?: string[];
  }>;
  hiddenTestIntent?: string[];
  integrityNotice?: string;
  challengeLoading?: boolean;
  onProofSubmit: (type: "link" | "text" | "file", content: string | File) => Promise<void>;
  isSubmitting: boolean;
  prefilledFile?: File | null;
  isVerifying?: boolean;
  verificationResult?: ArtifactVerifiedEvent | null;
  onNextTask?: () => void;
}

export function VerificationEngine({
  taskId,
  verificationMethod,
  verificationCriteria,
  taskDescription,
  verificationDetailedInstructions,
  problemStatement,
  acceptanceCriteria,
  exampleInputsOutputs,
  submissionNote,
  problemSet,
  hiddenTestIntent,
  integrityNotice,
  challengeLoading = false,
  onProofSubmit,
  isSubmitting,
  prefilledFile,
  isVerifying,
  verificationResult,
  onNextTask,
}: VerificationEngineProps) {
  void taskId;
  const router = useRouter();
  const allowedTypes = useMemo(() => {
    const v = verificationMethod.toLowerCase();
    if (v.includes("github") || v.includes("repo") || v.includes("link")) return ["link"] as string[];
    if (v.includes("file") || v.includes("upload")) return ["file"] as string[];
    if (v.includes("code_execution")) return ["text"] as string[];
    return ["text", "link", "file"] as string[];
  }, [verificationMethod]);

  const [activeTab, setActiveTab] = useState<"link" | "text" | "file">(allowedTypes[0] as "link" | "text" | "file");
  const [rubricAcknowledged, setRubricAcknowledged] = useState(false);
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);

  const [linkUrl, setLinkUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (prefilledFile && allowedTypes.includes("file")) {
      setSelectedFile(prefilledFile);
      setActiveTab("file");
    }
  }, [prefilledFile, allowedTypes]);

  // Dynamic Rule Parsing
  const rules = useMemo(() => {
    if (!verificationCriteria) return ["Complete the primary objective."];
    // Split criteria by periods or newlines into manageable rules
    return verificationCriteria.split(/[.\\n]/).map(s => s.trim()).filter(s => s.length > 5);
  }, [verificationCriteria]);

  const readableMethod = useMemo(() => {
    const v = verificationMethod.toLowerCase();
    if (v.includes("auto_check")) return "Automated System Check";
    if (v.includes("github") || v.includes("repo")) return "GitHub Repository Link";
    if (v.includes("file") || v.includes("upload")) return "File / Asset Upload";
    if (v.includes("code_execution")) return "Code Execution Output";
    if (v.includes("manual")) return "Manual Mentor Review";
    return verificationMethod.replace(/_/g, " ");
  }, [verificationMethod]);

  const challenges = Array.isArray(problemSet) ? problemSet : [];
  const hasProblemSet = challenges.length > 0;
  const activeProblem = hasProblemSet ? challenges[Math.min(activeProblemIndex, challenges.length - 1)] : null;

  const submissionInstructions = useMemo(() => {
    const v = verificationMethod.toLowerCase();
    if (v.includes("auto_check") || v.includes("code_execution")) return "Run your code or the requested checks in your environment (Web Sandbox, local CLI, or Colab). Paste the execution output or your finalized script below.";
    if (v.includes("github") || v.includes("repo")) return "Push your finalized code to a public GitHub repository. Ensure your latest changes are committed, then paste the repository or commit URL below.";
    if (v.includes("file") || v.includes("upload")) return "Take a screenshot of your terminal output, or generate the requested file asset (e.g. PDF, image) and upload it here.";
    if (v.includes("text") || v.includes("analysis")) return "Paste your written reflection, architectural thoughts, or essay content below.";
    return "Provide the requested link, text block, or file matching the success criteria.";
  }, [verificationMethod]);

  const handleSubmit = async () => {
    if (!rubricAcknowledged) return;

    if (activeTab === "link" && linkUrl.trim()) {
      await onProofSubmit("link", linkUrl.trim());
    } else if (activeTab === "text" && textContent.trim()) {
      await onProofSubmit("text", textContent.trim());
    } else if (activeTab === "file" && selectedFile) {
      await onProofSubmit("file", selectedFile);
    }
  };

  const isFormValid = () => {
    if (!rubricAcknowledged) return false;
    if (activeTab === "link") return linkUrl.trim().length > 0;
    if (activeTab === "text") return textContent.trim().length > 0;
    if (activeTab === "file") return selectedFile !== null;
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-slate-900 border-b border-slate-800 p-5 shrink-0">
        <h3 className="flex items-center gap-2 font-bold text-white text-lg">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Neural Verification Engine
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Review the precise criteria before submitting your proof for verification.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Loading state while challenge is being generated */}
        {challengeLoading && (
          <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
            <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
            <p className="text-sm">Generating challenge details…</p>
          </div>
        )}

        {/* Problem Statement */}
        <div className="space-y-2 bg-amber-50/60 p-5 rounded-xl border border-amber-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Mission Brief
          </h4>
          <p className="text-sm text-slate-800 leading-relaxed font-medium">
            {activeProblem?.prompt || problemStatement || taskDescription || "Complete the task outlined in your learning plan."}
          </p>
          {hasProblemSet && (
            <div className="mt-3 flex flex-wrap gap-2">
              {challenges.map((problem, index) => (
                <Button
                  key={problem.id || `problem-${index}`}
                  type="button"
                  size="sm"
                  variant={activeProblemIndex === index ? "default" : "outline"}
                  className="h-7 text-[11px]"
                  onClick={() => setActiveProblemIndex(index)}
                >
                  {problem.title || `Problem ${index + 1}`}
                  {problem.difficulty ? ` · ${problem.difficulty}` : ""}
                </Button>
              ))}
            </div>
          )}
        </div>

        {activeProblem && (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Input Contract</p>
              <p className="text-sm text-slate-700 leading-relaxed">{activeProblem.input_contract || "Define clear function inputs before solving."}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Output Contract</p>
              <p className="text-sm text-slate-700 leading-relaxed">{activeProblem.output_contract || "Output must be deterministic and testable."}</p>
            </div>
          </div>
        )}

        {/* Acceptance Criteria */}
        {(acceptanceCriteria && acceptanceCriteria.length > 0) ? (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <ListChecks className="w-4 h-4" /> Acceptance Criteria
            </h4>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-slate-100">
                {acceptanceCriteria.map((criterion, idx) => (
                  <div key={idx} className="flex gap-3 px-5 py-3 text-sm text-slate-700">
                    <span className="text-emerald-500 font-bold shrink-0 mt-0.5">{idx + 1}.</span>
                    <p className="leading-relaxed">{criterion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Fallback to old criteria-based rules */
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <ListChecks className="w-4 h-4" /> Success Criteria
            </h4>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="divide-y divide-slate-100">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex gap-3 px-5 py-3 text-sm text-slate-700">
                    <span className="text-blue-500 font-bold shrink-0 mt-0.5">{idx + 1}.</span>
                    <p className="leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeProblem?.self_check_cases && activeProblem.self_check_cases.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Self-check Cases</h4>
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 space-y-2">
              {activeProblem.self_check_cases.map((caseItem, idx) => {
                if (typeof caseItem === "string") {
                  return (
                    <p key={`self-check-${idx}`} className="text-sm text-slate-700">
                      {idx + 1}. {caseItem}
                    </p>
                  );
                }
                return (
                  <div key={`self-check-${idx}`} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-800">
                      {idx + 1}. {caseItem.description || "Test case"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold">Input:</span> {caseItem.input || "(not specified)"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      <span className="font-semibold">Expected:</span> {caseItem.expected_output || "(not specified)"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeProblem?.anti_cheat_signals && activeProblem.anti_cheat_signals.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Authenticity Checks</h4>
            <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 space-y-2">
              {activeProblem.anti_cheat_signals.map((signal, idx) => (
                <p key={`integrity-${idx}`} className="text-sm text-slate-700">
                  {idx + 1}. {signal}
                </p>
              ))}
            </div>
          </div>
        )}

        {(integrityNotice || (hiddenTestIntent && hiddenTestIntent.length > 0)) && (
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2">Integrity Notice</p>
            <p className="text-sm text-rose-900/90 leading-relaxed">
              {integrityNotice || "Submissions are evaluated against hidden checks and behavioral quality signals."}
            </p>
            {hiddenTestIntent && hiddenTestIntent.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-rose-900/80 space-y-1">
                {hiddenTestIntent.slice(0, 4).map((intent, idx) => (
                  <li key={`hidden-intent-${idx}`}>{intent}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Submission instructions */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Info className="w-4 h-4" /> How to Submit
          </h4>
          <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-slate-700 mb-2">
              Required Proof Type:
              <span className="text-emerald-700 font-bold capitalize bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-xs">
                {readableMethod}
              </span>
            </div>
            {(verificationDetailedInstructions || submissionNote) && (
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {verificationDetailedInstructions || submissionNote || submissionInstructions}
              </p>
            )}
            {!(verificationDetailedInstructions || submissionNote) && (
              <p className="text-slate-600 leading-relaxed">{submissionInstructions}</p>
            )}
          </div>
        </div>

        {/* Example inputs/outputs if available */}
        {exampleInputsOutputs && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Example</h4>
            <pre className="bg-slate-900 text-slate-200 text-xs font-mono p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
              {exampleInputsOutputs}
            </pre>
          </div>
        )}

        {/* Rubric acknowledgment */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${rubricAcknowledged ? 'bg-amber-500 border-amber-500 text-white' : 'border-amber-300 bg-white'}`}
              onClick={() => setRubricAcknowledged(!rubricAcknowledged)}
            >
              {rubricAcknowledged && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <span className="text-xs font-medium text-amber-900">
              I confirm that my submission meets all stated criteria above.
            </span>
          </label>
        </div>

        {/* Input Form */}
        <div className={`transition-opacity duration-300 ${rubricAcknowledged ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="flex items-center gap-2 mb-4">
            {allowedTypes.map((type) => (
              <Button
                key={type}
                variant={activeTab === type ? "default" : "outline"}
                size="sm"
                className={`capitalize text-xs font-semibold ${activeTab === type ? 'bg-slate-800 text-white' : 'text-slate-500 bg-white border-slate-200'}`}
                onClick={() => setActiveTab(type as "link" | "text" | "file")}
              >
                {type === "link" && <Link className="w-3.5 h-3.5 mr-1.5" />}
                {type === "text" && <FileText className="w-3.5 h-3.5 mr-1.5" />}
                {type === "file" && <Upload className="w-3.5 h-3.5 mr-1.5" />}
                {type}
              </Button>
            ))}
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            {activeTab === "link" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 uppercase">Provider URL (e.g., GitHub, Gist, Figma)</label>
                <Input
                  placeholder="https://github.com/your-username/repo"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="bg-slate-50"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {activeTab === "text" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 uppercase">Workspace Code / Text Entry</label>
                <p className="text-xs tracking-tight text-slate-400">If using the Web Sandbox, paste your final code here. If you used Colab or Local CLI, paste your implementation or output.</p>
                <Textarea
                  placeholder="Paste your source code, reflective thoughts, or generated output here..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="min-h-[160px] font-mono text-sm bg-slate-50 resize-y"
                  disabled={isSubmitting}
                />
              </div>
            )}

            {activeTab === "file" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 uppercase">Upload Artifact</label>
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="bg-slate-50 cursor-pointer text-slate-600 file:bg-slate-100 file:text-slate-700 file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3"
                  disabled={isSubmitting}
                />
                {selectedFile && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {selectedFile.name} attached
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verifying spinner — shown while waiting for WS result */}
      {isVerifying && !verificationResult && (
        <div className="p-6 border-t border-slate-200 bg-white shrink-0">
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium text-slate-700">AI is reviewing your submission…</p>
            <p className="text-xs text-slate-400">This usually takes 10–30 seconds.</p>
          </div>
        </div>
      )}

      {/* Verification result panel */}
      {verificationResult && (
        <div className={cn(
          "p-6 border-t-4 shrink-0 bg-white space-y-4",
          verificationResult.passed ? "border-emerald-400" : "border-amber-400"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {verificationResult.passed
                ? <Trophy className="w-6 h-6 text-emerald-500" />
                : <AlertTriangle className="w-6 h-6 text-amber-500" />}
              <div>
                <p className="font-bold text-slate-800 text-lg">
                  {Math.round(verificationResult.verification_score * 100)}%
                </p>
                <Badge variant="outline" className={cn(
                  "text-xs",
                  verificationResult.passed
                    ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                    : "border-amber-300 text-amber-700 bg-amber-50"
                )}>
                  {verificationResult.passed ? "Pass" : "Needs Work"}
                </Badge>
              </div>
            </div>
          </div>
          {verificationResult.verdict_summary && (
            <p className="text-sm text-slate-600 italic leading-relaxed border-l-2 border-slate-200 pl-3">
              {verificationResult.verdict_summary}
            </p>
          )}
          {verificationResult.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">Strengths</p>
              <ul className="space-y-1">
                {verificationResult.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {verificationResult.suggestions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">Suggestions</p>
              <ul className="space-y-1">
                {verificationResult.suggestions.map((s, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-amber-500 shrink-0">•</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push("/portfolio")}>
              View in Portfolio <ExternalLink className="w-3.5 h-3.5" />
            </Button>
            {onNextTask && (
              <Button size="sm" className="gap-2 bg-slate-900 hover:bg-slate-800 text-white" onClick={onNextTask}>
                Next Task <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Submit button — hidden during verifying or after result */}
      {!isVerifying && !verificationResult && (
        <div className="p-5 border-t border-slate-200 bg-white shrink-0 shadow-sm">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-11 transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">Initiating Verification <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div></span>
            ) : (
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Trigger Verification Scan</span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
