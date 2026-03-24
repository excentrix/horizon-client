"use client";

import { Suspense, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useInstitutionCohort } from "../_lib/useInstitutionCohort";
import { institutionsApi } from "@/lib/api";
import { telemetry } from "@/lib/telemetry";
import { useInstitutionScope } from "../_lib/useInstitutionScope";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function InstitutionInvitesContent() {
  const { user } = useAuth();
  const { selectedOrgId, isSuperuser } = useInstitutionScope();
  const { cohorts, selectedCohort, setSelectedCohort } = useInstitutionCohort({ withDashboard: false });
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const handleCsvUpload = async () => {
    if (!csvFile || !selectedCohort) return;
    try {
      await institutionsApi.inviteCohortCSV(selectedCohort, csvFile, selectedOrgId || undefined);
      telemetry.toastSuccess("CSV uploaded to queue. Processing will complete shortly.");
      setCsvFile(null);
    } catch (err) {
      telemetry.error("CSV upload failed", { err });
    }
  };

  const downloadCsvTemplate = () => {
    const csv = "email,name\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cohort_invite_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (user?.user_type !== "admin" && !user?.is_superuser) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Invites & Provisioning</CardTitle>
            <CardDescription>Only institution admins can invite students.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Ask an institution admin to upload or manage student rosters.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {isSuperuser && !selectedOrgId ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Select an institution from the Institution Scope selector to manage invites.
          </CardContent>
        </Card>
      ) : null}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roster & Invites</h1>
        <p className="text-muted-foreground mt-1">Upload CSVs to provision students into a cohort.</p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UploadCloud className="h-4 w-4" /> Bulk Invite
          </CardTitle>
          <CardDescription>Upload a CSV file to provision new students to this cohort automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedCohort || ""} onValueChange={setSelectedCohort}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select a cohort" />
            </SelectTrigger>
            <SelectContent>
              {cohorts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap items-center gap-4">
            <Input type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} className="max-w-sm" />
            <Button onClick={handleCsvUpload} disabled={!csvFile || !selectedCohort}>Upload & Provision</Button>
            <Button variant="ghost" onClick={downloadCsvTemplate} size="sm">Download Template</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InstitutionInvitesPage() {
  return (
    <Suspense fallback={
      <div className="flex p-12 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <InstitutionInvitesContent />
    </Suspense>
  );
}
