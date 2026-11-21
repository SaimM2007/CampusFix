import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";

export default function InvestigationsPage() {
  return (
    <div className="app-shell">
      <AppSidebar />
      <main className="main-content">
        <AppHeader title="Investigations" eyebrow="Workflow" />
        <section className="panel">
          <div className="empty-investigation">
            <p>Selected anomaly report</p>
            <h2>Choose an anomaly to investigate</h2>
            <span>The investigation report opens after you select an anomaly from the review list.</span>
            <Link className="primary-button" href="/anomalies">Review anomalies</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
