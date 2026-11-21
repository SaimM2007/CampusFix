import { Suspense } from "react";
import InvestigationReport from "@/components/investigation-report";

export default function InvestigationPage() {
  return (
    <Suspense fallback={<div className="app-shell"><main className="main-content"><div className="loading-state"><span className="spinner" /> Loading investigation…</div></main></div>}>
      <InvestigationReport />
    </Suspense>
  );
}
