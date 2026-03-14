"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const ACCEPTED_EXT = ".pdf,.png,.jpg,.jpeg";
const MAX_SIZE_MB = 10;

export default function OnboardingStartPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [timeline, setTimeline] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) return "Please upload a PDF or image file (PNG, JPG).";
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `File must be under ${MAX_SIZE_MB}MB.`;
    return null;
  };

  const handleFile = useCallback((f: File) => {
    const err = validateFile(f);
    if (err) { setFileError(err); return; }
    setFileError(null);
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !targetRole.trim()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("target_role", targetRole.trim());
      if (targetCompany.trim()) formData.append("target_company", targetCompany.trim());
      if (timeline.trim()) formData.append("timeline", timeline.trim());

      const result = await authApi.uploadResume(formData);
      if (result.job_id) {
        localStorage.setItem("resumeAnalysisJobId", result.job_id);
      }
      telemetry.track("onboarding_resume_submitted", { has_target_role: true });
      router.push("/onboarding?step=evidence_intake");
    } catch (err) {
      telemetry.error("Onboarding resume upload failed", { error: err });
      telemetry.toastError("Upload failed", "Please try again.");
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(file && targetRole.trim() && !submitting);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Let&apos;s get to know you
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Upload your resume and we&apos;ll set up everything in the background while you talk to your mentor.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Resume upload */}
          <div>
            <Label className="mb-2 block text-sm font-medium text-gray-700">
              Resume <span className="text-gray-400">(PDF or image)</span>
            </Label>
            <div
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
                dragOver
                  ? "border-black bg-black/5"
                  : file
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <>
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                  <p className="text-sm font-medium text-emerald-700">{file.name}</p>
                  <p className="text-xs text-emerald-600">
                    {(file.size / 1024 / 1024).toFixed(1)} MB — click to replace
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Drop your resume here or <span className="font-medium text-black underline-offset-2 hover:underline">browse</span>
                  </p>
                  <p className="text-xs text-gray-400">PDF, PNG, JPG up to 10MB</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXT}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
            {fileError ? (
              <p className="mt-1.5 text-xs text-rose-600">{fileError}</p>
            ) : null}
          </div>

          {/* Target role (required) */}
          <div>
            <Label htmlFor="target-role" className="mb-1.5 block text-sm font-medium text-gray-700">
              What role are you targeting? <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="target-role"
              placeholder="e.g., Backend Software Engineer, Product Manager"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              required
              className="bg-white"
            />
          </div>

          {/* Target company (optional) */}
          <div>
            <Label htmlFor="target-company" className="mb-1.5 block text-sm font-medium text-gray-700">
              Target company <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="target-company"
              placeholder="e.g., Google, a Series B startup, any FAANG"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              className="bg-white"
            />
          </div>

          {/* Timeline (optional) */}
          <div>
            <Label htmlFor="timeline" className="mb-1.5 block text-sm font-medium text-gray-700">
              Timeline <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="timeline"
              placeholder="e.g., 3 months, before May 2025, ASAP"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className="bg-white"
            />
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full gap-2"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting up your profile…
              </>
            ) : (
              <>
                Get started
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Your resume is used only to personalize your learning experience.
        </p>
      </div>
    </div>
  );
}
