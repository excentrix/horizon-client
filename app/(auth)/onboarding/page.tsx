"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/heic", "image/heif"];
const ACCEPTED_EXT = ".pdf,.png,.jpg,.jpeg";

type Stage = "idle" | "uploading" | "ready" | "failed";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");

  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");

  const statusCopy = useMemo(() => {
    if (stage === "uploading") return "Uploading résumé...";
    if (stage === "ready") return "Résumé uploaded. VELO is extracting the projects you claim.";
    if (stage === "failed") return error || "Résumé analysis failed.";
    return "Upload your résumé to begin.";
  }, [error, stage]);

  const validateFile = (selectedFile: File): string | null => {
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) return "Please upload a PDF/JPG/PNG resume.";
    if (selectedFile.size > 10 * 1024 * 1024) return "File must be under 10MB.";
    return null;
  };

  const handleFile = (selectedFile: File) => {
    const fileError = validateFile(selectedFile);
    if (fileError) {
      setError(fileError);
      return;
    }
    setError("");
    setFile(selectedFile);
  };

  const parseResume = async (): Promise<boolean> => {
    if (!file) return false;
    setError("");
    setStage("uploading");

    try {
      const form = new FormData();
      form.append("resume", file);
      // Optional context — sharpens role-fit analysis, not required to verify.
      if (targetRole.trim()) form.append("target_role", targetRole.trim());
      if (targetCompany.trim()) form.append("target_company", targetCompany.trim());
      const payload = await authApi.uploadResume(form);

      setStage("ready");
      if (payload.job_id) {
        window.localStorage.setItem("resumeAnalysisJobId", payload.job_id);
      }
      return true;
    } catch (e) {
      setStage("failed");
      setError(e instanceof Error ? e.message : "Upload failed");
      return false;
    }
  };

  const canContinue = Boolean(file);

  // Mark onboarding complete explicitly so returning users are never looped back
  // here, then land them in the VELO verification hub (not the learning mentor).
  const finishOnboarding = async () => {
    try {
      await authApi.completeOnboarding();
    } catch {
      /* upload already sets the flag server-side; this is belt-and-suspenders */
    }
    await refreshProfile();
    router.push("/verify");
  };

  const handleGetStarted = async () => {
    if (stage === "ready") {
      await finishOnboarding();
      return;
    }
    const ok = await parseResume();
    if (ok) await finishOnboarding();
  };

  useEffect(() => {
    if (!user) {
      router.replace("/register");
    }
  }, [router, user]);

  if (!user) return null;

  return (
    <OnboardingShell
      title="Verify the work on your résumé"
      subtitle="Upload your résumé — VELO extracts the projects you claim, then interrogates you on each so you can defend them into a verifiable credential."
    >
      <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="target-role">Target role (optional)</Label>
                <Input id="target-role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g., Backend Engineer" />
              </div>
              <div>
                <Label htmlFor="target-company">Target company (optional)</Label>
                <Input id="target-company" value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} placeholder="e.g., Google" />
              </div>
              <p className="md:col-span-2 -mt-1 text-xs text-muted-foreground">
                Optional — sharpens how VELO scores your role fit. You can verify without it.
              </p>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) handleFile(dropped);
              }}
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all",
                isDragging ? "border-black bg-[#fef9c3]" : "border-black/30 bg-[#f8fafc] hover:bg-[#f1f5f9]",
                file && "border-emerald-500 bg-emerald-50"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {!file ? (
                <>
                  <Upload className="mb-3 h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Drop resume here or click to browse</p>
                  <p className="mt-1 text-xs text-muted-foreground">PDF / PNG / JPG · max 10MB</p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{file.name}</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXT}
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) handleFile(selected);
                }}
              />
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-sm">
                {stage === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : stage === "failed" ? (
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                ) : stage === "ready" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Upload className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{statusCopy}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGetStarted} disabled={!canContinue || stage === "uploading"}>
                {stage === "uploading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading résumé...
                  </>
                ) : (
                  <>
                    Upload &amp; start verifying
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
      </div>
    </OnboardingShell>
  );
}
