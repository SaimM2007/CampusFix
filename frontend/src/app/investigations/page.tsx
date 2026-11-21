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
            <p>Investigation queue</p>
            <h2>No active investigation is available</h2>
            <span>Open an anomaly to start a new review.</span>
            <Link className="primary-button" href="/anomalies">Review anomalies</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
