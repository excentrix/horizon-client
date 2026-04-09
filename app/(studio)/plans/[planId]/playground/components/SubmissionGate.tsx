import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, UploadCloud, Github, Code, FileText, CheckSquare } from "lucide-react";

interface SubmissionGateProps {
  taskId: string;
  verificationMethod?: string;
  verificationCriteria?: string;
  isSubmitting: boolean;
  onSubmit: (type: "link" | "text" | "file", content: string | File) => void;
  sandboxCode?: string;
}

export function SubmissionGate({
  taskId,
  verificationMethod = "manual_rubric",
  verificationCriteria,
  isSubmitting,
  onSubmit,
  sandboxCode,
}: SubmissionGateProps) {
  void taskId;
  const [activeTab, setActiveTab] = useState<"link" | "text" | "file">(
    verificationMethod === "github_repo" ? "link" : "text"
  );
  const [linkInput, setLinkInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [fileInput, setFileInput] = useState<File | null>(null);

  const allowedTypes = useMemo(() => {
    const v = verificationMethod.toLowerCase();
    if (v.includes("github") || v.includes("repo") || v.includes("link")) return ["link"] as string[];
    if (v.includes("file") || v.includes("upload")) return ["file"] as string[];
    if (v.includes("code_execution")) return ["text"] as string[]; // We submit code as text
    return ["text", "link", "file"] as string[];
  }, [verificationMethod]);

  // Sync active tab to allowed types if it's restricted
  if (!allowedTypes.includes(activeTab)) {
    setActiveTab(allowedTypes[0] as "link" | "text" | "file");
  }

  const handleManualSubmit = () => {
    if (verificationMethod === "code_execution") {
      onSubmit("text", sandboxCode || "// No code provided");
      return;
    }
    if (activeTab === "link") onSubmit("link", linkInput);
    if (activeTab === "text") onSubmit("text", textInput);
    if (activeTab === "file" && fileInput) onSubmit("file", fileInput);
  };

  const getVerificationIcon = () => {
    if (verificationMethod === "github_repo") return <Github className="h-4 w-4 text-primary" />;
    if (verificationMethod === "code_execution") return <Code className="h-4 w-4 text-primary" />;
    if (verificationMethod === "file_upload") return <UploadCloud className="h-4 w-4 text-primary" />;
    if (verificationMethod === "text_analysis") return <FileText className="h-4 w-4 text-primary" />;
    return <CheckSquare className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-primary/20 bg-primary/5 p-6 shadow-inner">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-primary/20">
          {getVerificationIcon()}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-primary/90 tracking-tight">Proof of Work Requires</h3>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {verificationCriteria || "Provide evidence that you've completed this task."}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-white p-5 border border-slate-200">
        {verificationMethod === "code_execution" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-slate-700 text-center py-4 bg-slate-50 border border-dashed rounded-lg">
              Sandbox code will be automatically submitted as proof.
            </p>
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleManualSubmit}
              disabled={isSubmitting || !sandboxCode}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isSubmitting ? "Verifying Code..." : "Submit Sandbox Code"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {allowedTypes.length > 1 && (
              <div className="flex items-center gap-2 border-b pb-3">
                {allowedTypes.map(type => (
                  <Button
                    key={type}
                    variant={activeTab === type ? "default" : "ghost"}
                    size="sm"
                    className="capitalize text-xs font-semibold"
                    onClick={() => setActiveTab(type as "link" | "text" | "file")}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            )}
            
            {activeTab === "link" && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  {verificationMethod === "github_repo" ? "Repository URL" : "Resource Link"}
                </Label>
                <Input
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="https://github.com/..."
                  className="bg-slate-50"
                />
              </div>
            )}

            {activeTab === "text" && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Written Summary / Reflection</Label>
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Explain what you built or learned..."
                  className="min-h-[120px] bg-slate-50"
                />
              </div>
            )}

            {activeTab === "file" && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Upload Artifact</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    className="text-xs bg-slate-50"
                    onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleManualSubmit}
              disabled={
                isSubmitting ||
                (activeTab === "link" && !linkInput) ||
                (activeTab === "text" && !textInput) ||
                (activeTab === "file" && !fileInput)
              }
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isSubmitting ? "Submitting..." : "Submit Proof"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
