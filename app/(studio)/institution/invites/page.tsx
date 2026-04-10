import { Suspense } from "react";
import InstitutionInvitesClient from "./InstitutionInvitesClient";

export default function InstitutionInvitesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading invites...</div>}>
      <InstitutionInvitesClient />
    </Suspense>
  );
}
