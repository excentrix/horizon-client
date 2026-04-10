import { Suspense } from "react";
import InstitutionCohortsClient from "./InstitutionCohortsClient";

export default function InstitutionCohortsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading cohorts...</div>}>
      <InstitutionCohortsClient />
    </Suspense>
  );
}
