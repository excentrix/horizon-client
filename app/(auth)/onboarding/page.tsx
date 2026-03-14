"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const ACCEPTED_EXT = ".pdf,.png,.jpg,.jpeg";

type Stage = "idle" | "uploading" | "ready" | "failed";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");

  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [timeline, setTimeline] = useState("");
  const [constraints, setConstraints] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);

  const statusCopy = useMemo(() => {
    if (stage === "uploading") return "Uploading resume...";
    if (stage === "ready") return "Resume uploaded. VELO analysis started in background.";
    if (stage === "failed") return error || "Resume analysis failed.";
    return "Upload resume to start VELO analysis.";
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
    if (!file || !targetRole.trim()) return false;
    setError("");
    setStage("uploading");

    try {
      const form = new FormData();
      form.append("resume", file);
      form.append("target_role", targetRole.trim());
      form.append("target_company", targetCompany.trim());
      form.append("timeline", timeline.trim());
      form.append("constraints", constraints.trim());
      const payload = await authApi.uploadResume(form);

      setStage("ready");
      if (payload.job_id) {
        setJobId(payload.job_id);
        window.localStorage.setItem("resumeAnalysisJobId", payload.job_id);
      }
      return true;
    } catch (e) {
      setStage("failed");
      setError(e instanceof Error ? e.message : "Upload failed");
      return false;
    }
  };

  const canContinue = Boolean(file) && Boolean(targetRole.trim());

  const handleGetStarted = async () => {
    if (stage === "ready" && jobId) {
      router.push("/chat");
      return;
    }
    const ok = await parseResume();
    if (ok) {
      router.push("/chat");
    }
  };

  useEffect(() => {
    if (!user) {
      router.replace("/register");
    }
  }, [router, user]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f6f4ff]">
      <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Welcome to{" "}
            <span className="inline-block -rotate-1 rounded-md border-2 border-black bg-[#fcd34d] px-2 py-1 text-black shadow-[6px_6px_0_0_#000]">
              Horizon
            </span>
          </h1>
          <p className="mt-3 text-base text-gray-700">
            Upload your resume once. VELO runs analysis in the background while you start with your mentor.
          </p>
        </div>

        <Card className="w-full max-w-3xl border-2 border-black bg-white shadow-[10px_10px_0_0_#000]">
          <CardHeader>
            <CardTitle className="text-2xl">Onboarding</CardTitle>
            <CardDescription>Upload resume and target details to initialize your personalized roadmap context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="target-role">Target role *</Label>
                <Input id="target-role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g., Backend Engineer" />
              </div>
              <div>
                <Label htmlFor="target-company">Target company (optional)</Label>
                <Input id="target-company" value={targetCompany} onChange={(e) => setTargetCompany(e.target.value)} placeholder="e.g., Google" />
              </div>
              <div>
                <Label htmlFor="timeline">Timeline</Label>
                <Input id="timeline" value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g., 3 months" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="constraints">Constraints</Label>
                <Textarea id="constraints" value={constraints} onChange={(e) => setConstraints(e.target.value)} placeholder="e.g., 2 hrs/day weekdays" className="min-h-[90px]" />
              </div>
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
                  <Upload className="mb-3 h-7 w-7 text-gray-500" />
                  <p className="text-sm font-medium text-gray-700">Drop resume here or click to browse</p>
                  <p className="mt-1 text-xs text-gray-500">PDF / PNG / JPG · max 10MB</p>
                </>
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
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
                    Uploading resume...
                  </>
                ) : (
                  <>
                    Upload & Open Mentor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
