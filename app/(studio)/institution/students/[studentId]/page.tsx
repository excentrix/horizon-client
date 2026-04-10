import { Suspense } from "react";
import StudentInsightClient from "./StudentInsightClient";

export default function StudentInsightPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading student insight...</div>}>
      <StudentInsightClient />
    </Suspense>
  );
}
