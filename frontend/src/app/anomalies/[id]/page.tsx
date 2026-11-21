import { Suspense } from "react";
import { redirect } from "next/navigation";

async function RedirectAnomaly({ params }: { params: Promise<{ id: string }> }): Promise<never> {
  const { id } = await params;
  redirect(`/investigations/${encodeURIComponent(id)}`);
}

export default function AnomalyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="loading-state">Opening investigation…</div>}>
      <RedirectAnomaly params={params} />
    </Suspense>
  );
}
