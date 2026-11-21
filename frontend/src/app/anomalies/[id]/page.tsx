import { Suspense } from "react";
import AnomalyDetail from "@/components/anomaly-detail";

export default function AnomalyDetailPage() {
  return (
    <Suspense fallback={<div className="app-shell"><main className="main-content"><div className="empty-state">Loading anomaly…</div></main></div>}>
      <AnomalyDetail />
    </Suspense>
  );
}
