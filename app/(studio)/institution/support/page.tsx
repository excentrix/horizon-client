import { Suspense } from "react";
import InstitutionSupportClient from "./InstitutionSupportClient";

export default function InstitutionSupportPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading support tools...</div>}>
      <InstitutionSupportClient />
    </Suspense>
  );
}
