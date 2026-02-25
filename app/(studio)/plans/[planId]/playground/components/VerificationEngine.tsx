import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Link, FileText, Upload, ShieldCheck, CheckCircle2 } from "lucide-react";

interface VerificationEngineProps {
  taskId: string;
  verificationMethod: string;
  verificationCriteria: string;
  taskDescription: string;
  verificationDetailedInstructions?: string; // AI-generated, specific step-by-step instructions
  onProofSubmit: (type: "link" | "text" | "file", content: string | File) => Promise<void>;
  isSubmitting: boolean;
}

export function VerificationEngine({
  taskId,
  verificationMethod,
  verificationCriteria,
  taskDescription,
  verificationDetailedInstructions,
  onProofSubmit,
  isSubmitting,
}: VerificationEngineProps) {
  void taskId;
  const allowedTypes = useMemo(() => {
    const v = verificationMethod.toLowerCase();
    if (v.includes("github") || v.includes("repo") || v.includes("link")) return ["link"] as string[];
    if (v.includes("file") || v.includes("upload")) return ["file"] as string[];
    if (v.includes("code_execution")) return ["text"] as string[];
    return ["text", "link", "file"] as string[];
  }, [verificationMethod]);

  const [activeTab, setActiveTab] = useState<"link" | "text" | "file">(allowedTypes[0] as "link" | "text" | "file");
  const [rubricAcknowledged, setRubricAcknowledged] = useState(false);

  const [linkUrl, setLinkUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Challenge Brief */}
        <div className="space-y-3 bg-amber-50/50 p-5 rounded-lg border border-amber-100">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-800 flex items-center gap-2">
            Mission Brief
          </h4>
          <p className="text-sm text-slate-700 leading-relaxed font-medium">
            {taskDescription || "Complete the task outlined in your learning plan."}
          </p>
        </div>

        {/* The Formal Rubric */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            Success Rubric & Instructions
          </h4>
          <div className="bg-white border text-sm border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b bg-slate-50 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-medium text-slate-700">
                Required Proof Type: <span className="text-emerald-700 font-bold capitalize bg-emerald-100/50 px-2 py-0.5 rounded-md">{readableMethod}</span>
              </div>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                <span className="font-semibold text-slate-700">Instructions:</span>{" "}
                {verificationDetailedInstructions || submissionInstructions}
              </p>
            </div>
            <div className="p-5 space-y-3 bg-white">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex gap-3 text-slate-600">
                  <span className="text-blue-500 font-bold shrink-0">{idx + 1}.</span>
                  <p className="leading-relaxed">{rule}</p>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div 
                  className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${rubricAcknowledged ? 'bg-amber-500 border-amber-500 text-white' : 'border-amber-300 bg-white'}`}
                  onClick={() => setRubricAcknowledged(!rubricAcknowledged)}
                >
                  {rubricAcknowledged && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <span className="text-xs font-medium text-amber-900">
                  I confirm that my submission meets all stated rubric criteria above.
                </span>
              </label>
            </div>
          </div>
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
    </div>
  );
}
