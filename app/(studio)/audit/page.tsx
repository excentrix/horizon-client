"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auditApi, authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VeloShell } from "@/components/velo/velo-shell";

const normalizeProjects = (payload: Record<string, unknown>) => {
  const projects = Array.isArray(payload.projects) ? payload.projects : [];
  return projects.map((project: Record<string, unknown>) => ({
    title: String(project.title || ""),
    description: String(project.description || ""),
    repo_url: String(project.repo_url || project.github_url || ""),
    demo_url: String(project.demo_url || ""),
    technologies: Array.isArray(project.technologies) ? project.technologies : [],
    company: String(project.company || ""),
    role: String(project.role || ""),
    timeframe: String(project.timeframe || ""),
  }));
};

const normalizeList = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item)) : [];

const normalizeObjectList = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : [];

export default function VeloIntakePage() {
  const router = useRouter();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumePayload, setResumePayload] = useState<Record<string, unknown>>({});
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([]);
  const [manualMode, setManualMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [flagshipIndex, setFlagshipIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const detail = await authApi.getProfileDetail();
        if (detail.resume_payload) {
          setResumePayload(detail.resume_payload as Record<string, unknown>);
          setProjects(normalizeProjects(detail.resume_payload as Record<string, unknown>));
        }
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  const canAnalyze = Boolean(resumeFile);
  const hasProjects = projects.length > 0;
  const skills = normalizeList(resumePayload.skills);
  const certifications = normalizeList(resumePayload.certifications);
  const education = normalizeObjectList(resumePayload.education);
  const experience = normalizeObjectList(resumePayload.experience);
  const professionalSummary = String(resumePayload.professional_summary || "");
  const currentRole = String(resumePayload.current_role || "");
  const currentCompany = String(resumePayload.current_company || "");

  const handleAnalyze = async () => {
    if (!resumeFile) return;
    setIsAnalyzing(true);
    setStatusMessage(null);
    try {
      const form = new FormData();
      form.append("resume", resumeFile);
      const result = await authApi.uploadResume(form);
      const payload = (result.resume_payload ?? {}) as Record<string, unknown>;
      setResumePayload(payload);
      setProjects(normalizeProjects(payload));
      setManualMode(false);
      setStatusMessage("Resume analyzed. Review the extracted data below.");
    } catch {
      setStatusMessage("Resume analysis failed. Try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProjectChange = (index: number, field: string, value: string) => {
    setProjects((prev) =>
      prev.map((project, idx) =>
        idx === index ? { ...project, [field]: value } : project
      )
    );
  };

  const handleAddProject = () => {
    setProjects((prev) => [
      ...prev,
      {
        title: "",
        description: "",
        repo_url: "",
        technologies: [],
        company: "",
        role: "",
        timeframe: "",
      },
    ]);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const payload = {
        ...resumePayload,
        projects,
      };
      await authApi.confirmResume({ resume_payload: payload, projects });
      setStatusMessage("Profile updated. Projects synced to Horizon portfolio.");
    } catch {
      setStatusMessage("Sync failed. Please retry.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartAudit = async () => {
    if (!projects[flagshipIndex]) {
      setStatusMessage("Select a flagship project first.");
      return;
    }
    const project = projects[flagshipIndex];
    const repoUrl = String(project.repo_url || "");
    if (!repoUrl) {
      setStatusMessage("Add a GitHub repo URL to start the audit.");
      return;
    }
    try {
      const audit = await auditApi.createAudit({
        audit_type: "repo",
        repo_url: repoUrl,
        project_title: String(project.title || "Flagship Project"),
      });
      router.push(`/audit/queue?audit=${audit.id}`);
    } catch {
      setStatusMessage("Unable to start audit.");
    }
  };

  return (
    <VeloShell>
      <div className="border-[3px] border-green-700 p-6 space-y-4">
        <p className="text-sm text-green-300">
          Upload your resume to create a VELO profile. We will extract projects,
          experience, and skills, then sync them into Horizon.
        </p>
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-green-400">
            Resume Upload
          </label>
          <Input
            type="file"
            onChange={(event) =>
              setResumeFile(event.target.files ? event.target.files[0] : null)
            }
            className="mt-2 bg-black border-green-700 text-green-100"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className="border-[3px] border-green-400 bg-green-400/10 text-green-200 hover:bg-green-400/20"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Resume"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setManualMode((prev) => !prev)}
            className="border-[2px] border-green-600 text-green-200"
          >
            {manualMode ? "Hide Manual Override" : "Manual Override"}
          </Button>
        </div>
        {statusMessage ? (
          <p className="text-sm text-green-300">{statusMessage}</p>
        ) : null}
      </div>

      {Object.keys(resumePayload).length > 0 ? (
        <div className="border-[3px] border-green-700 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Extracted Resume Data</h2>
          {professionalSummary ? (
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">Professional Summary</p>
              <p className="mt-2 text-sm text-green-200">{professionalSummary}</p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">Current Role</p>
              <p className="mt-2 text-sm text-green-200">{currentRole || "Not found"}</p>
            </div>
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">Current Company</p>
              <p className="mt-2 text-sm text-green-200">{currentCompany || "Not found"}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">Skills</p>
              <p className="mt-2 text-sm text-green-200">
                {skills.length ? skills.join(", ") : "No skills extracted"}
              </p>
            </div>
            <div className="border-[2px] border-green-800 p-4">
              <p className="text-xs uppercase text-green-500">Certifications</p>
              <p className="mt-2 text-sm text-green-200">
                {certifications.length ? certifications.join(", ") : "No certifications extracted"}
              </p>
            </div>
          </div>

          <div className="border-[2px] border-green-800 p-4 space-y-2">
            <p className="text-xs uppercase text-green-500">Education</p>
            {education.length ? education.map((entry, index) => (
              <p key={`edu-${index}`} className="text-sm text-green-200">
                {String(entry.degree || "Degree")} at {String(entry.institution || "Institution")} {entry.year ? `(${String(entry.year)})` : ""}
              </p>
            )) : (
              <p className="text-sm text-green-200">No education records extracted</p>
            )}
          </div>

          <div className="border-[2px] border-green-800 p-4 space-y-2">
            <p className="text-xs uppercase text-green-500">Experience</p>
            {experience.length ? experience.map((entry, index) => (
              <p key={`exp-${index}`} className="text-sm text-green-200">
                {String(entry.role || "Role")} at {String(entry.company || "Company")} {entry.timeframe ? `(${String(entry.timeframe)})` : ""}
              </p>
            )) : (
              <p className="text-sm text-green-200">No experience records extracted</p>
            )}
          </div>
        </div>
      ) : null}

      {manualMode || hasProjects ? (
        <div className="border-[3px] border-green-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Projects (Auto-filled)</h2>
            <Button
              variant="outline"
              className="border-[2px] border-green-600 text-green-200"
              onClick={handleAddProject}
            >
              Add Project
            </Button>
          </div>

          {projects.length === 0 ? (
            <p className="text-sm text-green-400">
              No projects detected. Add them manually.
            </p>
          ) : null}

          {projects.map((project, index) => (
            <div key={`${project.title}-${index}`} className="border-[2px] border-green-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase text-green-500">
                  Project {index + 1}
                </p>
                <Button
                  variant={flagshipIndex === index ? "default" : "outline"}
                  onClick={() => setFlagshipIndex(index)}
                  className={flagshipIndex === index ? "bg-green-500/20 text-green-100" : "border-green-600 text-green-200"}
                >
                  Flagship
                </Button>
              </div>
              <Input
                placeholder="Project title"
                value={String(project.title || "")}
                onChange={(event) => handleProjectChange(index, "title", event.target.value)}
                className="bg-black border-green-700 text-green-100"
              />
              <Textarea
                placeholder="Project summary"
                value={String(project.description || "")}
                onChange={(event) => handleProjectChange(index, "description", event.target.value)}
                className="min-h-[100px] bg-black border-green-700 text-green-100"
              />
              <Input
                placeholder="GitHub repo URL"
                value={String(project.repo_url || "")}
                onChange={(event) => handleProjectChange(index, "repo_url", event.target.value)}
                className="bg-black border-green-700 text-green-100"
              />
              <Input
                placeholder="Role (optional)"
                value={String(project.role || "")}
                onChange={(event) => handleProjectChange(index, "role", event.target.value)}
                className="bg-black border-green-700 text-green-100"
              />
            </div>
          ))}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="border-[3px] border-green-400 bg-green-400/10 text-green-200 hover:bg-green-400/20"
            >
              {isSyncing ? "Syncing..." : "Sync to Profile & Portfolio"}
            </Button>
            <Button
              variant="outline"
              onClick={handleStartAudit}
              className="border-[2px] border-green-600 text-green-200"
            >
              Proceed to Audit Queue
            </Button>
          </div>
        </div>
      ) : null}
    </VeloShell>
  );
}
