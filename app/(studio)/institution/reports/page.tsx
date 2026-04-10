import { Suspense } from "react";
import InstitutionReportsClient from "./InstitutionReportsClient";

export default function InstitutionReportsPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground animate-pulse">Loading reports...</div>}>
      <InstitutionReportsClient />
    </Suspense>
  );
}
