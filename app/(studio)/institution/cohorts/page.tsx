"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { institutionsApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import { useInstitutionCohort } from "../_lib/useInstitutionCohort";
import { useInstitutionScope } from "../_lib/useInstitutionScope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InstitutionCohortsPage() {
  const { user } = useAuth();
  const { selectedOrgId } = useInstitutionScope();
  const { cohorts, refreshCohorts } = useInstitutionCohort({ withDashboard: false });
  const [orgSummary, setOrgSummary] = useState<{
    max_cohorts: number;
    cohort_count: number;
    max_students_per_cohort: number;
    max_educators: number;
  } | null>(null);
  const [name, setName] = useState("");
  const [mentor, setMentor] = useState<string | null>(null);
  const [educators, setEducators] = useState<{ id: string; name: string; role: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    institutionsApi
      .getOrgSummary({ org: selectedOrgId || undefined })
      .then((data) => setOrgSummary(data))
      .catch((err) => telemetry.error("Failed to load org summary", { err }));
  }, [selectedOrgId]);

  useEffect(() => {
    if (user?.user_type !== "admin" && !user?.is_superuser) return;
    institutionsApi
      .listEducators({ org: selectedOrgId || undefined })
      .then((data) => setEducators(data.map((e) => ({ id: e.id, name: e.name, role: e.role }))))
      .catch((err) => telemetry.error("Failed to load educators", { err }));
  }, [selectedOrgId, user?.is_superuser, user?.user_type]);

  const canCreate = useMemo(() => {
    if (!orgSummary) return false;
    return orgSummary.cohort_count < orgSummary.max_cohorts;
  }, [orgSummary]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await institutionsApi.createCohort({ name: name.trim(), mentor_user: mentor || undefined, org: selectedOrgId || undefined });
      telemetry.toastSuccess("Cohort created");
      setName("");
      setMentor(null);
      refreshCohorts();
    } catch (err) {
      telemetry.toastError("Unable to create cohort");
      telemetry.error("Cohort create failed", { err });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cohorts</h1>
        <p className="text-muted-foreground mt-1">Create and manage learning cohorts with mentor assignments.</p>
      </div>

      {orgSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Allowance</CardTitle>
            <CardDescription>Track cohort capacity and seat usage.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Badge variant="outline">Cohorts: {orgSummary.cohort_count}/{orgSummary.max_cohorts}</Badge>
            <Badge variant="outline">Max students per cohort: {orgSummary.max_students_per_cohort}</Badge>
            <Badge variant="outline">Educator seats: {orgSummary.max_educators}</Badge>
          </CardContent>
        </Card>
      )}

      {(user?.user_type === "admin" || user?.is_superuser) && (
        <Card className="border-dashed bg-muted/20">
          <CardHeader>
            <CardTitle>Create New Cohort</CardTitle>
            <CardDescription>Allocate a mentor and spin up a new cohort (subject to plan limits).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Input placeholder="Cohort name" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={mentor || ""} onValueChange={(value) => setMentor(value || null)}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Assign mentor (optional)" />
              </SelectTrigger>
              <SelectContent>
                {educators.map((edu) => (
                  <SelectItem key={edu.id} value={edu.id}>
                    {edu.name} ({edu.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} disabled={!name.trim() || isSubmitting || !canCreate}>
              {canCreate ? "Create Cohort" : "Cohort Limit Reached"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cohorts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No cohorts yet</CardTitle>
              <CardDescription>Create your first cohort to begin onboarding students.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          cohorts.map((cohort) => (
            <Card key={cohort.id}>
              <CardHeader>
                <CardTitle>{cohort.name}</CardTitle>
                <CardDescription>Mentor: {cohort.mentor_name ?? "Unassigned"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">Students: {cohort.student_count ?? 0}</Badge>
                  <Badge variant={cohort.is_active ? "secondary" : "destructive"}>
                    {cohort.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
