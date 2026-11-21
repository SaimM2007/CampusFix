import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import Link from "next/link";

export default function BuildingsPage() {
  return <div className="app-shell"><AppSidebar /><main className="main-content"><AppHeader title="Buildings" eyebrow="Campus inventory" /><section className="panel"><div className="empty-investigation"><p>Buildings</p><h2>Building directory is not yet available</h2><span>Start from the anomaly review queue.</span><Link className="primary-button" href="/anomalies">Review anomalies</Link></div></section></main></div>;
}
