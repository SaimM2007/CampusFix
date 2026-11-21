import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";

export default function ReportsPage() {
  return <div className="app-shell"><AppSidebar /><main className="main-content"><AppHeader title="Reports" eyebrow="Facilities documentation" /><section className="panel"><div className="empty-investigation"><p>Reports</p><h2>No report has been generated</h2><span>Reports become available after a facilities investigation is complete.</span></div></section></main></div>;
}
