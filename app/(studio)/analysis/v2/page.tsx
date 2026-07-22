"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useMirrorSnapshot } from "@/hooks/use-mirror-snapshot";
import { useGithubRepos } from "@/hooks/use-github-repos";
import { useGamificationSummary } from "@/hooks/use-gamification";
import { useAuth } from "@/context/AuthContext";
import { authApi, auditApi } from "@/lib/api";
import { toast } from "sonner";

// ─── Types (mirrors the shapes VeloProfileTab reads off deep_analysis) ────────

type Priority = "P1" | "P2" | "P3";
type ImpactLevel = "high" | "medium" | "low";
type Seniority = "junior" | "mid" | "senior";

interface RoleMatch {
  title: string;
  match_score: number;
  seniority: Seniority;
}
interface SkillGapDetail {
  skill: string;
  priority: Priority;
  how_to_fill: string;
  why_matters: string;
  time_estimate: string;
}
interface EmployerPerspective {
  first_impression: string;
  candidate_narrative: string;
  what_stands_out: string[];
  what_raises_flags: string[];
}
interface ExperienceEntry {
  company?: string;
  role?: string;
  timeframe?: string;
  highlights?: string[];
}
interface ProjectEntry {
  title?: string;
  repo_url?: string;
  demo_url?: string;
}
interface AtsBreakdownItem {
  score: number;
  max: number;
  missing?: string[];
}
interface AtsBreakdown {
  keyword_match?: AtsBreakdownItem;
  impact_statements?: AtsBreakdownItem;
  summary_quality?: AtsBreakdownItem;
  skills_coverage?: AtsBreakdownItem;
  format_signals?: AtsBreakdownItem;
}
interface ExperienceAnalysis {
  company?: string;
  role?: string;
  relevance_to_target?: string;
  impact_score?: number;
}
interface ProjectAnalysis {
  title?: string;
  relevance_score?: number;
  technical_depth_score?: number;
}
interface ImprovementAction {
  action: string;
  impact: ImpactLevel;
  effort: ImpactLevel;
}

function scoreVar(s: number) {
  if (s >= 75) return "var(--good)";
  if (s >= 50) return "var(--warn)";
  return "var(--critical)";
}
function scoreTint(s: number) {
  if (s >= 75) return { fg: "var(--good-ink)", bg: "var(--good-tint)" };
  if (s >= 50) return { fg: "var(--warn-ink)", bg: "var(--warn-tint)" };
  return { fg: "var(--critical-ink)", bg: "var(--critical-tint)" };
}
function atsLabel(s: number) {
  if (s >= 90) return "Excellent";
  if (s >= 75) return "Good";
  if (s >= 60) return "Fair";
  return "Needs work";
}
function findAnalysis<T extends { company?: string; role?: string; title?: string }>(
  entry: { company?: string; role?: string; title?: string },
  arr: T[],
  index: number,
): T | undefined {
  if (!arr?.length) return undefined;
  const match = arr.find((a) => {
    if (entry.company && a.company)
      return (
        a.company.toLowerCase() === entry.company.toLowerCase() &&
        (!a.role || !entry.role || a.role.toLowerCase() === entry.role.toLowerCase())
      );
    if (entry.title && a.title) return a.title.toLowerCase() === entry.title.toLowerCase();
    return false;
  });
  return match ?? arr[index];
}
function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
function highlightQuotes(text: string) {
  const parts = text.split(/(['"][^'"]{3,60}['"])/g);
  return parts.map((part, i) => {
    if (!/^['"].*['"]$/.test(part)) return part;
    return <em key={i}>{part}</em>;
  });
}

export default function AnalysisV2Page() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useMirrorSnapshot();
  const { data: gamification } = useGamificationSummary();
  const github = useGithubRepos();

  const [reanalysing, setReanalysing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [verifyingAllRepos, setVerifyingAllRepos] = useState(false);
  const [jdOpen, setJdOpen] = useState(false);
  const [jdText, setJdText] = useState("");
  const [jdReanalysing, setJdReanalysing] = useState(false);
  const gaugeRef = useRef<SVGCircleElement | null>(null);

  useEffect(() => {
    github.fetchRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mirror = data?.mirror;
  const normalized = (mirror?.normalized_profile ?? {}) as Record<string, unknown>;
  const experience = ((normalized.experience as ExperienceEntry[] | undefined) ?? []);
  const projects = ((normalized.projects as ProjectEntry[] | undefined) ?? []);
  const deep = mirror?.deep_analysis ?? {};
  const projectVerifications = mirror?.project_verifications ?? [];
  const verifiedProfile = mirror?.verified_profile;

  const atsScore = deep.ats_score as number | undefined;
  const atsBreakdown = deep.ats_breakdown as AtsBreakdown | undefined;
  const roleMatches = ((deep.role_matches ?? []) as RoleMatch[]);
  const gapDetails = ((deep.skill_gap_details ?? []) as SkillGapDetail[]);
  const expAnalysis = ((deep.experience_analysis ?? []) as ExperienceAnalysis[]);
  const projAnalysis = ((deep.project_analysis ?? []) as ProjectAnalysis[]);
  const actions = ((deep.improvement_actions ?? []) as ImprovementAction[]);
  const employerPerspective = deep.employer_perspective as EmployerPerspective | undefined;

  const resumeUrls = new Set(
    projects.flatMap((p) => [p.repo_url, p.demo_url]).filter(Boolean).map((u) => u!.toLowerCase()),
  );
  const unlinkedRepos = github.repos.filter((r) => !resumeUrls.has(r.url.toLowerCase()));

  const isRunning = data?.status === "running" || data?.status === "empty";
  const isFailed = data?.status === "failed";
  const isReady = data?.status === "ready" && Boolean(mirror);

  useEffect(() => {
    if (atsScore === undefined || !gaugeRef.current) return;
    const c = 502.65;
    requestAnimationFrame(() => {
      if (gaugeRef.current) gaugeRef.current.style.strokeDashoffset = String(c * (1 - atsScore / 100));
    });
  }, [atsScore]);

  const handleReanalyse = async () => {
    setReanalysing(true);
    try {
      await authApi.reanalyseResume();
      await queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
      toast.success("Re-analysis queued — VELO will update in a moment.");
    } catch {
      toast.error("Couldn't queue re-analysis.", {
        description: "Upload your resume in Settings first.",
        action: { label: "Settings", onClick: () => router.push("/settings") },
      });
    } finally {
      setReanalysing(false);
    }
  };

  const handleExportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const response = await auditApi.exportMirrorLatestPdf();
      const blob = response.data as Blob;
      const disposition = response.headers?.["content-disposition"] ?? "";
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const filename = match?.[1] ?? "resume-analysis-report.pdf";
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF exported.");
    } catch {
      toast.error("Export failed. Could not generate the PDF report.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleJdReanalyse = async () => {
    if (!jdText.trim()) {
      toast.error("Please paste a job description first.");
      return;
    }
    setJdReanalysing(true);
    try {
      await authApi.reanalyseWithJD(jdText.trim());
      await queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
      setJdOpen(false);
      setJdText("");
      toast.success("JD-targeted analysis queued — VELO will update in a moment.");
    } catch {
      toast.error("Couldn't queue JD analysis.", { description: "Upload a resume first." });
    } finally {
      setJdReanalysing(false);
    }
  };

  const handleVerifyAllRepos = async () => {
    setVerifyingAllRepos(true);
    let added = 0;
    try {
      for (const repo of unlinkedRepos) {
        await auditApi.addManualProject({ title: repo.name, repo_url: repo.url });
        added += 1;
      }
      await queryClient.invalidateQueries({ queryKey: ["mirror-snapshot"] });
      toast.success(added === 1 ? "Added 1 repo as a project." : `Added ${added} repos as projects.`);
    } catch {
      toast.error(added > 0 ? `Added ${added} before running into a problem.` : "Couldn't add these repos.");
    } finally {
      setVerifyingAllRepos(false);
    }
  };

  const goDefend = (projectIndex: number) => {
    const snapshotId = mirror?.id;
    if (!snapshotId) return;
    const p = projects[projectIndex];
    const params = new URLSearchParams({
      snapshot: snapshotId,
      project: String(projectIndex),
      title: p?.title ?? `Project ${projectIndex + 1}`,
    });
    if (p?.repo_url) params.set("repo", p.repo_url);
    router.push(`/verify/session?${params.toString()}`);
  };

  return (
    <div className="velo-v2">
      <style>{CSS}</style>

      <header className="top">
        <div className="wordmark">
          <span className="mark" />
          VELO <span className="crumb">/ Analysis</span>
        </div>
        <div className="top-actions">
          <button className="btn" onClick={handleExportPdf} disabled={exportingPdf || !isReady}>
            {exportingPdf ? "Exporting…" : "Export PDF"}
          </button>
          <button className="btn" onClick={handleReanalyse} disabled={reanalysing}>
            {reanalysing ? "Queuing…" : "Re-analyse"}
          </button>
          <button className="btn primary" onClick={() => setJdOpen(true)}>
            Analyse with JD
          </button>
          <div className="identity">
            <div className="avatar">{initials(user?.full_name || user?.username)}</div>
            <div>
              <div className="name">{user?.full_name || user?.username || "You"}</div>
              <div className="meta tabular">
                L{gamification?.profile.level ?? 1} · {gamification?.profile.total_points ?? 0} XP
                {user?.profile_completion !== undefined ? ` · ${user.profile_completion}% profile` : ""}
              </div>
            </div>
          </div>
        </div>
      </header>

      {isLoading && <div className="empty-state">Loading your analysis…</div>}

      {!isLoading && isRunning && (
        <div className="empty-state">
          VELO is analysing your resume — this page will update automatically.
        </div>
      )}

      {!isLoading && isFailed && (
        <div className="empty-state">
          Analysis failed. <button className="btn primary" onClick={handleReanalyse}>Retry analysis</button>
        </div>
      )}

      {!isLoading && !isRunning && !isFailed && !isReady && (
        <div className="empty-state">
          No analysis yet.{" "}
          <button className="btn primary" onClick={() => router.push("/settings")}>Upload resume</button>
        </div>
      )}

      {isReady && mirror && (
        <div className="layout">
          <main>
            {verifiedProfile && (
              <section className="block card capability">
                <div className="num">
                  {verifiedProfile.verified_project_count}
                  <small>/{verifiedProfile.claimed_project_count}</small>
                </div>
                <div className="copy">
                  <b>
                    {verifiedProfile.verified_project_count === 0
                      ? "Nothing defended yet."
                      : `${verifiedProfile.verified_project_count} of ${verifiedProfile.claimed_project_count} defended.`}
                  </b>{" "}
                  {verifiedProfile.narrative || verifiedProfile.confidence_note}
                </div>
                <div className="badge">{verifiedProfile.coverage}</div>
              </section>
            )}

            {mirror.role_readiness_narrative && (
              <section className="block card readiness">
                <div className="eyebrow">Role readiness</div>
                <p>{mirror.role_readiness_narrative}</p>
              </section>
            )}

            {employerPerspective && (
              <section className="block card">
                <div className="eyebrow">Employer&apos;s view</div>
                <p className="verdict-quote">{highlightQuotes(employerPerspective.first_impression)}</p>
                <details className="narrative">
                  <summary>Full first-impression &amp; career-story analysis</summary>
                  <div className="body">
                    <div>
                      <h4>First impression</h4>
                      <p>{employerPerspective.first_impression}</p>
                    </div>
                    <div>
                      <h4>Career story</h4>
                      <p>{employerPerspective.candidate_narrative}</p>
                    </div>
                  </div>
                </details>
              </section>
            )}

            {employerPerspective &&
              (employerPerspective.what_stands_out.length > 0 || employerPerspective.what_raises_flags.length > 0) && (
                <section className="block duo">
                  <div className="card good">
                    <h3>Stands out</h3>
                    <ul>
                      {employerPerspective.what_stands_out.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="card flag">
                    <h3>Raises flags</h3>
                    <ul>
                      {employerPerspective.what_raises_flags.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

            {gapDetails.length > 0 && (
              <section className="block card">
                <div className="eyebrow">
                  Skill gaps <span className="tabular" style={{ color: "var(--ink-faint)" }}>· {gapDetails.length}</span>
                </div>
                <div className="gap-list">
                  {gapDetails.map((gap, i) => (
                    <div className="gap" key={i}>
                      <span className={`pri ${gap.priority.toLowerCase()}`}>{gap.priority}</span>
                      <span className="title">{gap.skill}</span>
                      <span className="eta">{gap.time_estimate}</span>
                      <p className="desc">{gap.how_to_fill || gap.why_matters}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {experience.length > 0 && (
              <section className="block card">
                <div className="eyebrow">
                  Experience <span className="tabular" style={{ color: "var(--ink-faint)" }}>· {experience.length}</span>
                </div>
                <div className="timeline">
                  {experience.map((exp, i) => {
                    const analysis = findAnalysis(exp, expAnalysis, i);
                    const fit = analysis?.impact_score;
                    return (
                      <div className="exp" key={i}>
                        <div className="dot-col" />
                        <div>
                          <div className="exp-head">
                            <div>
                              <span className="exp-role">{exp.role || "Role"}</span>{" "}
                              <span className="exp-org">
                                — {exp.company}
                                {exp.timeframe ? ` · ${exp.timeframe}` : ""}
                              </span>
                            </div>
                            {fit !== undefined && (
                              <span
                                className={`fit-chip tabular ${fit >= 75 ? "good" : "warn"}`}
                              >
                                {fit} fit
                              </span>
                            )}
                          </div>
                          {exp.highlights && exp.highlights.length > 0 && (
                            <ul className="bullets">
                              {exp.highlights.slice(0, 3).map((h, j) => (
                                <li key={j}>{h}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {projects.length > 0 && (
              <section className="block card">
                <div className="eyebrow">
                  Projects <span className="tabular" style={{ color: "var(--ink-faint)" }}>· {projects.length}</span>
                </div>
                <div className="proj-grid">
                  {projects.map((proj, i) => {
                    const analysis = findAnalysis(proj, projAnalysis, i);
                    const pv = projectVerifications.find((v) => v.project_index === i);
                    const rel = analysis?.relevance_score ?? 0;
                    const depth = analysis?.technical_depth_score ?? 0;
                    return (
                      <div className="proj" key={i}>
                        <div className="proj-top">
                          <span className="name">{proj.title || "Project"}</span>
                          {pv?.status === "verified" ? (
                            <span className="defend" style={{ color: "var(--good)", borderColor: "var(--good)" }}>
                              Verified
                            </span>
                          ) : (
                            <button className="defend" onClick={() => goDefend(i)}>
                              Defend
                            </button>
                          )}
                        </div>
                        {analysis && (
                          <>
                            <div className="metric-row">
                              <span>Relevance</span>
                              <div className="track">
                                <div className="fill" style={{ width: `${rel}%`, background: scoreVar(rel) }} />
                              </div>
                              <span className="val">{rel}%</span>
                            </div>
                            <div className="metric-row">
                              <span>Depth</span>
                              <div className="track">
                                <div className="fill" style={{ width: `${depth}%`, background: scoreVar(depth) }} />
                              </div>
                              <span className="val">{depth}%</span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {github.connected && unlinkedRepos.length > 0 && (
              <section className="block card">
                <div className="gh-head">
                  <div className="eyebrow" style={{ marginBottom: 0 }}>
                    GitHub — not on resume{" "}
                    <span className="tabular" style={{ color: "var(--ink-faint)" }}>· {unlinkedRepos.length}</span>
                  </div>
                  <button
                    className="btn primary"
                    style={{ padding: "7px 12px", fontSize: 12 }}
                    disabled={verifyingAllRepos}
                    onClick={handleVerifyAllRepos}
                  >
                    {verifyingAllRepos ? "Adding…" : `Verify all ${unlinkedRepos.length} with VELO`}
                  </button>
                </div>
                <div className="gh-grid">
                  {unlinkedRepos.slice(0, 5).map((repo) => (
                    <div className="gh" key={repo.id}>
                      <span className="name">{repo.name}</span>
                      <span className="lang">{repo.language}</span>
                    </div>
                  ))}
                  {unlinkedRepos.length > 5 && (
                    <div className="gh more">+{unlinkedRepos.length - 5} more</div>
                  )}
                </div>
              </section>
            )}
          </main>

          <aside className="rail">
            {atsScore !== undefined && (
              <div className="panel">
                <div className="gauge-wrap">
                  <div className="gauge">
                    <svg viewBox="0 0 200 200">
                      <circle className="track" cx="100" cy="100" r="80" />
                      <circle
                        ref={gaugeRef}
                        className="fill"
                        cx="100"
                        cy="100"
                        r="80"
                        stroke={scoreVar(atsScore)}
                        strokeDasharray="502.65"
                        strokeDashoffset="502.65"
                      />
                    </svg>
                    <div className="gauge-center">
                      <div className="score tabular" style={{ color: scoreVar(atsScore) }}>
                        {atsScore}
                      </div>
                      <div className="of100">out of 100</div>
                    </div>
                  </div>
                  <div
                    className="label"
                    style={{ background: scoreTint(atsScore).bg, color: scoreTint(atsScore).fg }}
                  >
                    {atsLabel(atsScore)} — ATS Score
                  </div>
                </div>

                {atsBreakdown && (
                  <div className="breakdown">
                    {[
                      { key: "keyword_match", label: "Keywords" },
                      { key: "impact_statements", label: "Impact" },
                      { key: "summary_quality", label: "Summary" },
                      { key: "skills_coverage", label: "Skills" },
                      { key: "format_signals", label: "Format" },
                    ]
                      .filter(({ key }) => atsBreakdown[key as keyof AtsBreakdown])
                      .map(({ key, label }) => {
                        const item = atsBreakdown[key as keyof AtsBreakdown]!;
                        const pct = (item.score / item.max) * 100;
                        return (
                          <div className="row" key={key}>
                            <span className="name">{label}</span>
                            <div className="track">
                              <div className="fill" style={{ width: `${pct}%`, background: scoreVar(pct) }} />
                            </div>
                            <span className="val tabular">
                              {item.score}/{item.max}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}

                {atsBreakdown?.keyword_match?.missing && atsBreakdown.keyword_match.missing.length > 0 && (
                  <div className="missing">
                    <div className="eyebrow">Missing keywords</div>
                    <div className="chips">
                      {atsBreakdown.keyword_match.missing.map((kw) => (
                        <span className="chip" key={kw}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {roleMatches.length > 0 && (
              <div className="panel panel-pad">
                <div className="panel-title" style={{ padding: "0 0 12px" }}>Role fit</div>
                <div className="rolefit">
                  {roleMatches.slice(0, 4).map((role, i) => (
                    <div className="row" key={i}>
                      <div className="top">
                        <span>{role.title}</span>
                        <span className="pct" style={{ color: scoreVar(role.match_score) }}>
                          {role.match_score}%
                        </span>
                      </div>
                      <div className="track">
                        <div className="fill" style={{ width: `${role.match_score}%`, background: scoreVar(role.match_score) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {actions.length > 0 && (
              <div className="panel panel-pad">
                <div className="panel-title" style={{ padding: "0 0 12px" }}>Priority actions</div>
                <ol className="actions">
                  {actions.slice(0, 3).map((action, i) => (
                    <li key={i}>
                      <span className="n">{i + 1}</span>
                      <div>
                        <div className="txt">{action.action}</div>
                        <div className="tags">
                          <span className="tag impact">{action.impact} impact</span>
                          <span className="tag effort">{action.effort} effort</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </aside>
        </div>
      )}

      {jdOpen && (
        <div className="jd-overlay" onClick={() => setJdOpen(false)}>
          <div className="jd-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Analyse with job description</h3>
            <p>Paste the full job posting — VELO will re-run the analysis targeted to this role.</p>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste the job description here…"
            />
            <div className="jd-actions">
              <button className="btn" onClick={() => setJdOpen(false)}>Cancel</button>
              <button className="btn primary" disabled={jdReanalysing || !jdText.trim()} onClick={handleJdReanalyse}>
                {jdReanalysing ? "Queuing…" : "Run JD analysis"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
.velo-v2 {
  --bg: #FBF6EE;
  --bg-elevated: #FFFFFF;
  --bg-sunk: #F4EDE0;
  --ink: #2A2420;
  --ink-muted: #7A6F5F;
  --ink-faint: #A79A85;
  --border: #E6DCC9;
  --border-strong: #D8CAAE;

  --tangerine: #EC5B13;
  --tangerine-ink: #7A2D08;
  --tangerine-tint: #FCE7D8;

  --indigo: #4A3F9E;
  --indigo-ink: #2E2664;
  --indigo-tint: #EBE8F8;

  --good: #2E8B57;
  --good-ink: #1D5C39;
  --good-tint: #E1F2E8;

  --warn: #C97F1E;
  --warn-ink: #8A5610;
  --warn-tint: #FAEFD9;

  --critical: #C4452F;
  --critical-ink: #832C1C;
  --critical-tint: #FBE6E1;

  --font-display: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  --font-body: "Avenir Next", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
  --font-data: "SF Mono", "Cascadia Code", "Consolas", ui-monospace, monospace;

  --shadow-card: 0 1px 2px rgba(42,36,32,0.04), 0 1px 1px rgba(42,36,32,0.03);
  --shadow-panel: 0 4px 20px rgba(42,36,32,0.06);

  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.55;
  min-height: 100%;
}
.dark .velo-v2 {
  --bg: #1B1611;
  --bg-elevated: #241E17;
  --bg-sunk: #171310;
  --ink: #F2EAE0;
  --ink-muted: #B3A691;
  --ink-faint: #7C7060;
  --border: #382F24;
  --border-strong: #453A2B;

  --tangerine: #FF7E45;
  --tangerine-ink: #FFD3B3;
  --tangerine-tint: #3A2415;

  --indigo: #9B92E0;
  --indigo-ink: #D6D1F5;
  --indigo-tint: #262047;

  --good: #56C288;
  --good-ink: #B7EDD0;
  --good-tint: #143324;

  --warn: #E5A94C;
  --warn-ink: #F7DDA9;
  --warn-tint: #34260F;

  --critical: #E8735E;
  --critical-ink: #F7C6BB;
  --critical-tint: #3A1D16;

  --shadow-card: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-panel: 0 8px 28px rgba(0,0,0,0.4);
}

.velo-v2 * { box-sizing: border-box; }
.velo-v2 a { color: inherit; }
.velo-v2 button { font: inherit; }
.velo-v2 .tabular { font-variant-numeric: tabular-nums; font-family: var(--font-data); }

.velo-v2 header.top {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 28px;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap; gap: 10px;
}
.velo-v2 .wordmark { display: flex; align-items: center; gap: 9px; font-family: var(--font-display); font-size: 19px; font-weight: 700; letter-spacing: 0.02em; }
.velo-v2 .wordmark .mark { width: 22px; height: 22px; border-radius: 7px; background: var(--tangerine); position: relative; flex: none; }
.velo-v2 .wordmark .mark::after { content: ""; position: absolute; inset: 6px 6px 6px auto; width: 8px; border-left: 2px solid var(--bg-elevated); border-bottom: 2px solid var(--bg-elevated); transform: rotate(-45deg) translate(1px,-2px); }
.velo-v2 .crumb { color: var(--ink-faint); font-weight: 400; font-size: 13px; margin-left: 6px; }

.velo-v2 .top-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.velo-v2 .btn {
  font-family: var(--font-body); font-size: 13px; font-weight: 600;
  padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border-strong);
  background: var(--bg-elevated); color: var(--ink); cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.velo-v2 .btn:hover { border-color: var(--ink-faint); }
.velo-v2 .btn:disabled { opacity: 0.6; cursor: default; }
.velo-v2 .btn.primary { background: var(--tangerine); border-color: var(--tangerine); color: #fff; }
.velo-v2 .btn.primary:hover { filter: brightness(1.06); }

.velo-v2 .identity { display: flex; align-items: center; gap: 10px; padding-left: 14px; margin-left: 4px; border-left: 1px solid var(--border); }
.velo-v2 .avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--indigo-tint); color: var(--indigo-ink); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
.velo-v2 .identity .name { font-size: 13.5px; font-weight: 600; }
.velo-v2 .identity .meta { font-size: 11.5px; color: var(--ink-faint); }

.velo-v2 .empty-state { padding: 80px 28px; text-align: center; color: var(--ink-muted); display: flex; flex-direction: column; align-items: center; gap: 14px; }

.velo-v2 .layout { display: grid; grid-template-columns: minmax(0,1fr) 348px; gap: 28px; max-width: 1180px; margin: 0 auto; padding: 32px 28px 80px; align-items: start; }
@media (max-width: 880px) { .velo-v2 .layout { grid-template-columns: 1fr; } .velo-v2 aside.rail { position: static !important; } }

.velo-v2 .card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
  padding: 22px 24px;
}
.velo-v2 section.block { margin-bottom: 22px; }
.velo-v2 .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--ink-faint); display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }

.velo-v2 .capability {
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
  background: var(--indigo-tint); border: 1px solid color-mix(in srgb, var(--indigo) 35%, var(--border));
}
.velo-v2 .capability .num { font-family: var(--font-display); font-size: 34px; font-weight: 700; color: var(--indigo-ink); line-height: 1; }
.velo-v2 .capability .num small { font-family: var(--font-body); font-size: 14px; font-weight: 600; color: var(--indigo); }
.velo-v2 .capability .copy { font-size: 13.5px; color: var(--ink-muted); }
.velo-v2 .capability .copy b { color: var(--ink); }
.velo-v2 .capability .badge { margin-left: auto; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--indigo); background: var(--bg-elevated); border: 1px solid var(--indigo); padding: 4px 9px; border-radius: 20px; white-space: nowrap; }

.velo-v2 .readiness p { margin: 0; font-size: 14.5px; color: var(--ink-muted); }
.velo-v2 .readiness strong { color: var(--ink); font-weight: 700; }

.velo-v2 .verdict-quote {
  font-family: var(--font-display); font-size: 24px; line-height: 1.32; font-weight: 500;
  color: var(--ink); text-wrap: balance; margin: 2px 0 14px;
  border-left: 3px solid var(--tangerine); padding-left: 18px;
}
.velo-v2 .verdict-quote em { font-style: normal; background: linear-gradient(to bottom, transparent 62%, var(--tangerine-tint) 62%); }
.velo-v2 details.narrative { margin-top: 6px; }
.velo-v2 details.narrative summary { cursor: pointer; font-size: 13px; font-weight: 600; color: var(--tangerine); list-style: none; }
.velo-v2 details.narrative summary::-webkit-details-marker { display: none; }
.velo-v2 details.narrative summary::after { content: " · Read full breakdown"; color: var(--ink-faint); font-weight: 400; }
.velo-v2 details.narrative .body { margin-top: 14px; display: grid; gap: 14px; }
.velo-v2 .narrative h4 { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); margin: 0 0 4px; }
.velo-v2 .narrative p { margin: 0; font-size: 14px; color: var(--ink-muted); }

.velo-v2 .duo { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .velo-v2 .duo { grid-template-columns: 1fr; } }
.velo-v2 .duo .card { padding: 18px 20px; }
.velo-v2 .duo .card.good { border-left: 4px solid var(--good); }
.velo-v2 .duo .card.flag { border-left: 4px solid var(--critical); }
.velo-v2 .duo h3 { font-size: 13px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; margin: 0 0 12px; }
.velo-v2 .duo .card.good h3 { color: var(--good-ink); }
.velo-v2 .duo .card.flag h3 { color: var(--critical-ink); }
.velo-v2 .duo ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 10px; }
.velo-v2 .duo li { font-size: 13.5px; color: var(--ink-muted); padding-left: 16px; position: relative; }
.velo-v2 .duo li::before { content: "\\203A"; position: absolute; left: 0; font-weight: 700; }
.velo-v2 .duo .card.good li::before { color: var(--good); }
.velo-v2 .duo .card.flag li::before { color: var(--critical); }

.velo-v2 .gap-list { display: grid; gap: 12px; }
.velo-v2 .gap {
  display: grid; grid-template-columns: auto 1fr auto; gap: 4px 14px;
  padding: 14px 16px; border: 1px solid var(--border); border-radius: 10px; align-items: start;
}
.velo-v2 .gap .pri { grid-row: 1 / 3; align-self: center; font-size: 11px; font-weight: 800; padding: 3px 7px; border-radius: 6px; }
.velo-v2 .gap .pri.p1 { background: var(--critical-tint); color: var(--critical-ink); }
.velo-v2 .gap .pri.p2 { background: var(--warn-tint); color: var(--warn-ink); }
.velo-v2 .gap .pri.p3 { background: var(--bg-sunk); color: var(--ink-faint); }
.velo-v2 .gap .title { font-weight: 700; font-size: 14px; }
.velo-v2 .gap .eta { font-size: 12px; color: var(--ink-faint); white-space: nowrap; align-self: start; }
.velo-v2 .gap .desc { grid-column: 2 / 4; font-size: 13px; color: var(--ink-muted); margin: 0; }

.velo-v2 .timeline { display: grid; gap: 0; }
.velo-v2 .exp { display: grid; grid-template-columns: 14px 1fr; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--border); }
.velo-v2 .exp:last-child { border-bottom: none; }
.velo-v2 .exp .dot-col { position: relative; }
.velo-v2 .exp .dot-col::before { content:""; position:absolute; top:5px; left:5px; width:4px; height:4px; border-radius:50%; background: var(--tangerine); box-shadow: 0 0 0 4px var(--tangerine-tint); }
.velo-v2 .exp .dot-col::after { content:""; position:absolute; top:18px; left:6px; bottom:-16px; width:1px; background: var(--border); }
.velo-v2 .exp:last-child .dot-col::after { display:none; }
.velo-v2 .exp-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.velo-v2 .exp-role { font-weight: 700; font-size: 14.5px; }
.velo-v2 .exp-org { font-size: 12.5px; color: var(--ink-faint); }
.velo-v2 .fit-chip { font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 20px; white-space: nowrap; }
.velo-v2 .fit-chip.good { background: var(--good-tint); color: var(--good-ink); }
.velo-v2 .fit-chip.warn { background: var(--warn-tint); color: var(--warn-ink); }
.velo-v2 .exp ul.bullets { margin: 8px 0 0; padding-left: 16px; font-size: 13.3px; color: var(--ink-muted); display: grid; gap: 5px; }

.velo-v2 .proj-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
@media (max-width: 780px) { .velo-v2 .proj-grid { grid-template-columns: 1fr 1fr; } }
.velo-v2 .proj { border: 1px solid var(--border); border-radius: 10px; padding: 14px 15px; }
.velo-v2 .proj-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 8px; }
.velo-v2 .proj-top .name { font-weight: 700; font-size: 13.5px; }
.velo-v2 .proj-top .defend { font-size: 10.5px; font-weight: 700; color: var(--tangerine); border: 1px solid var(--tangerine); padding: 2px 7px; border-radius: 20px; background: none; cursor: pointer; white-space: nowrap; }
.velo-v2 .metric-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; font-size: 11.5px; color: var(--ink-faint); margin-top: 6px; }
.velo-v2 .metric-row .track { height: 5px; border-radius: 4px; background: var(--bg-sunk); overflow: hidden; }
.velo-v2 .metric-row .fill { height: 100%; border-radius: 4px; }
.velo-v2 .metric-row .val { font-family: var(--font-data); font-size: 11px; color: var(--ink-muted); }

.velo-v2 .gh-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.velo-v2 .gh-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (max-width: 780px) { .velo-v2 .gh-grid { grid-template-columns: 1fr 1fr; } }
.velo-v2 .gh { border: 1px dashed var(--border-strong); border-radius: 10px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.velo-v2 .gh .name { font-size: 13px; font-weight: 600; }
.velo-v2 .gh .lang { font-size: 10px; color: var(--ink-faint); font-family: var(--font-data); }
.velo-v2 .gh.more { border-style: solid; background: var(--tangerine-tint); align-items: center; justify-content: center; color: var(--tangerine-ink); font-weight: 700; font-size: 13px; cursor: pointer; }

.velo-v2 aside.rail { position: sticky; top: 78px; display: grid; gap: 16px; }
.velo-v2 .panel { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-panel); overflow: hidden; }
.velo-v2 .panel-pad { padding: 22px; }

.velo-v2 .gauge-wrap { display: flex; flex-direction: column; align-items: center; padding: 26px 22px 20px; text-align: center; }
.velo-v2 .gauge-wrap .gauge { position: relative; width: 168px; height: 168px; }
.velo-v2 .gauge-wrap svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.velo-v2 .gauge-wrap .track { fill: none; stroke: var(--bg-sunk); stroke-width: 14; }
.velo-v2 .gauge-wrap .fill { fill: none; stroke-width: 14; stroke-linecap: round; transition: stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1); }
.velo-v2 .gauge-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.velo-v2 .gauge-center .score { font-family: var(--font-display); font-size: 46px; font-weight: 700; line-height: 1; }
.velo-v2 .gauge-center .of100 { font-family: var(--font-body); font-size: 12px; color: var(--ink-faint); margin-top: 2px; }
.velo-v2 .gauge-wrap .label { margin-top: 12px; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }

.velo-v2 .breakdown { padding: 4px 22px 20px; display: grid; gap: 11px; }
.velo-v2 .breakdown .row { display: grid; grid-template-columns: 78px 1fr 44px; align-items: center; gap: 10px; }
.velo-v2 .breakdown .row .name { font-size: 12px; color: var(--ink-muted); }
.velo-v2 .breakdown .row .track { height: 6px; border-radius: 4px; background: var(--bg-sunk); overflow: hidden; }
.velo-v2 .breakdown .row .fill { height: 100%; border-radius: 4px; }
.velo-v2 .breakdown .row .val { font-size: 11px; text-align: right; color: var(--ink-faint); }

.velo-v2 .missing { padding: 14px 22px 22px; border-top: 1px solid var(--border); }
.velo-v2 .missing .eyebrow { margin-bottom: 8px; }
.velo-v2 .chips { display: flex; flex-wrap: wrap; gap: 6px; }
.velo-v2 .chip { font-size: 11px; color: var(--critical-ink); background: var(--critical-tint); padding: 3px 9px; border-radius: 20px; font-weight: 600; }

.velo-v2 .rolefit { display: grid; gap: 12px; }
.velo-v2 .rolefit .row { display: grid; gap: 5px; }
.velo-v2 .rolefit .top { display: flex; justify-content: space-between; font-size: 12.5px; gap: 8px; }
.velo-v2 .rolefit .top span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.velo-v2 .rolefit .top .pct { font-family: var(--font-data); font-weight: 700; flex: none; }
.velo-v2 .rolefit .track { height: 6px; border-radius: 4px; background: var(--bg-sunk); overflow: hidden; }
.velo-v2 .rolefit .fill { height: 100%; border-radius: 4px; }

.velo-v2 .actions { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.velo-v2 .actions li { display: flex; gap: 12px; }
.velo-v2 .actions .n { flex: none; width: 22px; height: 22px; border-radius: 50%; background: var(--tangerine-tint); color: var(--tangerine-ink); font-size: 11.5px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
.velo-v2 .actions .txt { font-size: 13px; color: var(--ink-muted); }
.velo-v2 .actions .tags { margin-top: 6px; display: flex; gap: 6px; }
.velo-v2 .actions .tag { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.02em; }
.velo-v2 .actions .tag.impact { background: var(--good-tint); color: var(--good-ink); }
.velo-v2 .actions .tag.effort { background: var(--indigo-tint); color: var(--indigo-ink); }

.velo-v2 .panel-title { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-faint); padding: 18px 22px 4px; }

.velo-v2 .jd-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
.velo-v2 .jd-modal { width: 100%; max-width: 480px; background: var(--bg-elevated); border-radius: 16px; padding: 22px; box-shadow: var(--shadow-panel); }
.velo-v2 .jd-modal h3 { margin: 0 0 6px; font-family: var(--font-display); font-size: 18px; }
.velo-v2 .jd-modal p { margin: 0 0 12px; font-size: 13px; color: var(--ink-muted); }
.velo-v2 .jd-modal textarea { width: 100%; min-height: 200px; resize: vertical; border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; font-family: var(--font-body); font-size: 13px; background: var(--bg-sunk); color: var(--ink); }
.velo-v2 .jd-actions { margin-top: 14px; display: flex; justify-content: flex-end; gap: 8px; }
`;
