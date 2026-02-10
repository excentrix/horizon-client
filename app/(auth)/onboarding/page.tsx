"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export default function OnboardingPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");
  const [parseStatus, setParseStatus] = useState<"idle" | "uploading" | "parsing" | "complete" | "failed">("idle");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Unsupported file type. Please upload a PDF, PNG, JPG, TXT, or DOCX file.");
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }

    setError("");
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setParseStatus("uploading");
    setError("");

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await fetch(`${API_URL}/onboarding/upload-resume/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      setParseStatus("parsing");

      // Poll for parsing completion
      await pollParsingStatus(data.session_key);

    } catch {
      setError("Upload failed. Please try again.");
      setParseStatus("failed");
    } finally {
      setUploading(false);
    }
  };

  const pollParsingStatus = async (sessionKey: string) => {
    const maxAttempts = 20;
    let attempts = 0;

    const checkStatus = async (): Promise<void> => {
      try {
        const response = await fetch(`${API_URL}/onboarding/session/${sessionKey}/`);
        const data = await response.json();

        if (data.parsing_status === "complete") {
          setParseStatus("complete");
          // Store session key and redirect to form
          localStorage.setItem("onboarding_session_key", sessionKey);

          // Capture resume uploaded event
          posthog.capture('onboarding_resume_uploaded', {
            file_type: file?.type,
            file_size_kb: file ? Math.round(file.size / 1024) : undefined,
          });

          setTimeout(() => {
            router.push("/onboarding/form");
          }, 1500);
        } else if (data.parsing_status === "failed") {
          setParseStatus("failed");
          setError("Failed to parse resume. Please try again or skip this step.");
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 2000);
        } else {
          setParseStatus("failed");
          setError("Parsing timeout. Please try again.");
        }
      } catch {
        setParseStatus("failed");
        setError("Failed to check parsing status.");
      }
    };

    await checkStatus();
  };

  const handleSkip = async () => {
    try {
      const response = await fetch(`${API_URL}/onboarding/skip-resume/`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to skip resume upload");
      }

      const data = await response.json();
      localStorage.setItem("onboarding_session_key", data.session_key);

      // Capture resume skipped event
      posthog.capture('onboarding_resume_skipped');

      router.push("/onboarding/form");
    } catch {
      setError("Failed to proceed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f4ff] dark:bg-[#0b0b0f]">
      <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-16">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Welcome to{" "}
            <span className="inline-block -rotate-1 rounded-md border-2 border-black bg-[#fcd34d] px-2 py-1 text-black shadow-[6px_6px_0_0_#000]">
              Horizon
            </span>
          </h1>
          <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">
            Let&apos;s personalize your learning journey. A resume helps, but it&apos;s optional.
          </p>
        </div>


        {/* Progress Bar */}
        <div className="mb-12 w-full max-w-2xl">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[3px_3px_0_0_#000]">1</div>
              <span className="mt-2 text-sm font-semibold text-gray-900">Upload (Optional)</span>
            </div>
            <div className="mx-4 h-1 flex-1 bg-black/10" />
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-[#e0f2fe] text-black shadow-[3px_3px_0_0_#000]">2</div>
              <span className="mt-2 text-sm font-semibold text-gray-900">Tell Us More</span>
            </div>
            <div className="mx-4 h-1 flex-1 bg-black/10" />
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-[#dcfce7] text-black shadow-[3px_3px_0_0_#000]">3</div>
              <span className="mt-2 text-sm font-semibold text-gray-900">Choose Path</span>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <Card className="w-full max-w-2xl border-2 border-black bg-white shadow-[10px_10px_0_0_#000]">
          <CardHeader>
            <CardTitle className="text-2xl">Upload Your Resume (Optional)</CardTitle>
            <CardDescription>
              We can tailor your path faster with a resume, or you can enter details manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg border-2 border-black p-12 transition-all",
                isDragging
                  ? "bg-[#fef9c3]"
                  : "bg-white hover:bg-[#f1f5f9]",
                file && "bg-[#dcfce7]"
              )}
            >
              {parseStatus === "idle" && !file && (
                <>
                  <Upload className="mb-4 h-12 w-12 text-gray-400" />
                  <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Drag and drop your resume here (optional)
                  </p>
                  <p className="mb-4 text-xs text-gray-500">
                    or click to browse (PDF, PNG, JPG, TXT, DOCX • Max 10MB)
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.docx"
                    onChange={handleFileSelect}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </>
              )}

              {file && parseStatus === "idle" && (
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
              )}

              {parseStatus === "uploading" && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-black" />
                  <p className="text-sm font-semibold text-gray-900">Uploading...</p>
                </div>
              )}

              {parseStatus === "parsing" && (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-black" />
                  <p className="text-sm font-semibold text-gray-900">Analyzing your resume with AI...</p>
                  <p className="text-xs text-gray-600">This usually takes 10-15 seconds</p>
                </div>
              )}

              {parseStatus === "complete" && (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-700">Resume analyzed successfully!</p>
                  <p className="text-xs text-gray-600">Redirecting...</p>
                </div>
              )}

              {parseStatus === "failed" && (
                <div className="flex flex-col items-center gap-3">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                  <p className="text-sm font-semibold text-red-700">Analysis failed</p>
                  <p className="text-xs text-gray-600">You can try again or skip this step</p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg border-2 border-black bg-red-100 p-4 text-sm font-semibold text-red-700 shadow-[4px_4px_0_0_#000]">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {file && parseStatus === "idle" && (
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-black text-white shadow-[4px_4px_0_0_#000] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Continue with Resume"
                  )}
                </Button>
              )}

              {parseStatus === "failed" && (
                <Button
                  onClick={() => {
                    setFile(null);
                    setParseStatus("idle");
                    setError("");
                  }}
                  variant="outline"
                  className="flex-1 border-2 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition"
                >
                  Try Again
                </Button>
              )}

              {(parseStatus === "idle" || parseStatus === "failed") && (
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="flex-1 border-2 border-black shadow-[4px_4px_0_0_#000] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#000] transition"
                >
                  Continue Without Resume
                </Button>
              )}
            </div>

            <p className="text-center text-xs font-medium text-gray-700">
              No resume? No problem — we&apos;ll ask a few quick questions next.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
