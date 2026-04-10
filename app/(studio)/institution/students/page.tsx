import { Suspense } from "react";
import InstitutionStudentsClient from "./InstitutionStudentsClient";

export default function InstitutionStudentsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted-foreground animate-pulse">Loading student intelligence...</div>}>
      <InstitutionStudentsClient />
    </Suspense>
  );
}
