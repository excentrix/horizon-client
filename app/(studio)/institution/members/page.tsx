import { Suspense } from "react";
import InstitutionMembersClient from "./InstitutionMembersClient";
import { Loader2 } from "lucide-react";

export default function InstitutionMembersPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <InstitutionMembersClient />
    </Suspense>
  );
}
