import { Suspense } from "react";
import InstitutionOverviewClient from "./InstitutionOverviewClient";
import { Loader2 } from "lucide-react";

export default function InstitutionOverviewPage() {
  return (
    <Suspense fallback={<div className="h-48 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
      <InstitutionOverviewClient />
    </Suspense>
  );
}
