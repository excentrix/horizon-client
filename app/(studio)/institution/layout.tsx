import { Suspense } from "react";
import InstitutionLayoutClient from "./InstitutionLayoutClient";

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex justify-center py-12 animate-pulse text-muted-foreground">Loading dashboard...</div>}>
      <InstitutionLayoutClient>
        {children}
      </InstitutionLayoutClient>
    </Suspense>
  );
}
