"use client";

import { useEffect, useState } from "react";
import { auditApi } from "@/lib/api";
import type {
  AuditInstitutionVerificationOverview,
  AuditInstitutionVerificationStudentRow,
  AuditInstitutionVerificationStudentDetail,
} from "@/types";
import { useInstitutionScope } from "../_lib/useInstitutionScope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShieldCheck } from "lucide-react";

const COVERAGE_VARIANT: Record<string, "secondary" | "outline" | "default"> = {
  none: "secondary",
  unverified: "secondary",
  limited: "outline",
  partial: "outline",
  strong: "default",
};

const SENIORITY_VARIANT: Record<string, "secondary" | "outline" | "default"> = {
  junior: "secondary",
  mid: "outline",
  senior: "default",
};

export default function InstitutionVerificationClient() {
  const { selectedOrgId } = useInstitutionScope();
  const [overview, setOverview] = useState<AuditInstitutionVerificationOverview | null>(null);
  const [students, setStudents] = useState<AuditInstitutionVerificationStudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditInstitutionVerificationStudentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = { org: selectedOrgId || undefined };
    Promise.all([
      auditApi.getVerificationOverview(params),
      auditApi.getVerificationStudents(params),
    ])
      .then(([overviewData, studentsData]) => {
        setOverview(overviewData);
        setStudents(studentsData.results);
      })
      .catch(() => setError("Couldn't load verification data for this organization."))
      .finally(() => setLoading(false));
  }, [selectedOrgId]);

  const openStudent = (studentId: string) => {
    setDetailLoading(true);
    setDetail(null);
    auditApi
      .getVerificationStudentDetail(studentId, { org: selectedOrgId || undefined })
      .then(setDetail)
      .catch(() => setError("Couldn't load that student's verified profile."))
      .finally(() => setDetailLoading(false));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-muted-foreground">
        <ShieldCheck className="mx-auto mb-3 h-8 w-8" />
        <p>{error ?? "No verification data yet."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Students in this college</CardDescription>
            <CardTitle className="text-2xl">{overview.total_students}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>With ≥1 defended project</CardDescription>
            <CardTitle className="text-2xl">{overview.verified_count}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Seniority mix (j / m / s)</CardDescription>
            <CardTitle className="text-2xl">
              {overview.seniority_distribution.junior} / {overview.seniority_distribution.mid} /{" "}
              {overview.seniority_distribution.senior}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg ownership score</CardDescription>
            <CardTitle className="text-2xl">
              {overview.avg_dimension_scores.ownership != null
                ? Math.round(overview.avg_dimension_scores.ownership * 100)
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {overview.top_claimed_unverified_skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Claimed, never probed</CardTitle>
            <CardDescription>
              Skills students claim org-wide that the interrogation never actually asked about — a
              curriculum/remediation-targeting signal, not a red flag on any one student.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {overview.top_claimed_unverified_skills.map((s) => (
              <Badge key={s.skill} variant="secondary">
                {s.skill} · {s.count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {overview.top_verified_skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backed by defended work</CardTitle>
            <CardDescription>Skills that actually held up under interrogation, org-wide.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {overview.top_verified_skills.map((s) => (
              <Badge key={s.skill} variant="default">
                {s.skill} · {s.count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Students</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Student</th>
                <th className="py-2 pr-4">Coverage</th>
                <th className="py-2 pr-4">Seniority</th>
                <th className="py-2 pr-4">Defended / claimed</th>
                <th className="py-2 pr-4">Verified skills</th>
                <th className="py-2 pr-4">Claimed, not probed</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.student_id}
                  className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
                  onClick={() => openStudent(s.student_id)}
                >
                  <td className="py-2 pr-4">
                    <div>{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant={COVERAGE_VARIANT[s.coverage] ?? "secondary"}>{s.coverage}</Badge>
                  </td>
                  <td className="py-2 pr-4">
                    {s.seniority_calibration ? (
                      <Badge variant={SENIORITY_VARIANT[s.seniority_calibration.level] ?? "secondary"}>
                        {s.seniority_calibration.level}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {s.verified_project_count} / {s.claimed_project_count}
                  </td>
                  <td className="py-2 pr-4">{s.top_verified_skills.join(", ") || "—"}</td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {s.top_claimed_unverified_skills.join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!detail || detailLoading} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.name ?? "Loading…"}</DialogTitle>
          </DialogHeader>
          {detailLoading && (
            <div className="flex justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {detail && (
            <div className="space-y-4 text-sm">
              {detail.verified_profile.headline && (
                <p className="font-medium">{detail.verified_profile.headline}</p>
              )}
              {detail.verified_profile.narrative && (
                <p className="leading-relaxed text-muted-foreground">{detail.verified_profile.narrative}</p>
              )}
              {detail.verified_profile.seniority_calibration?.level && (
                <p>
                  Calibrated level:{" "}
                  <Badge variant={SENIORITY_VARIANT[detail.verified_profile.seniority_calibration.level]}>
                    {detail.verified_profile.seniority_calibration.level}
                  </Badge>
                  {detail.verified_profile.seniority_calibration.held_to_reason && (
                    <span className="ml-1 text-muted-foreground">
                      — {detail.verified_profile.seniority_calibration.held_to_reason}
                    </span>
                  )}
                </p>
              )}
              {detail.verified_profile.calibration_reference &&
                !detail.verified_profile.calibration_reference.insufficient_data &&
                detail.verified_profile.calibration_reference.note && (
                  <p className="text-xs text-muted-foreground">
                    {detail.verified_profile.calibration_reference.note}
                  </p>
                )}
              {(detail.verified_profile.verified_skills?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Backed by defended work
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.verified_profile.verified_skills.map((s) => (
                      <Badge key={s.skill} variant="default">
                        {s.skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {(detail.verified_profile.claimed_unverified_skills?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Claimed, not yet probed
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.verified_profile.claimed_unverified_skills!.map((s) => (
                      <Badge key={`${s.skill}-${s.project}`} variant="secondary">
                        {s.skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {detail.verified_profile.examiner_note && (
                <div className="rounded-lg border border-dashed p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Examiner&apos;s note
                  </p>
                  <p className="text-muted-foreground">{detail.verified_profile.examiner_note}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
