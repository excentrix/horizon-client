import { Suspense } from "react";
import InstitutionSettingsClient from "./InstitutionSettingsClient";
import { Loader2 } from "lucide-react";

export default function InstitutionSettingsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <InstitutionSettingsClient />
    </Suspense>
  );
}
