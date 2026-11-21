"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Archive, HardDrive, Printer, RefreshCw, Trash2 } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { CortexExplanation } from "@/components/cortex-explanation";
import { AnomaliesTable } from "@/components/anomalies-table";
import { MetricCard } from "@/components/metric-card";
import { api } from "@/lib/api";
import { SeverityBadge } from "@/components/severity-badge";
import { deleteSavedReport, readSavedReports, SavedCortexReport } from "@/lib/saved-reports";
import { Anomaly, OverviewResponse } from "@/lib/types";
import { kwh, percent } from "@/lib/format";

export default function ReportsPage() {
  const [reports, setReports] = useState<SavedCortexReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const load = useCallback(() => {
    setError("");
    try {
      setReports(readSavedReports());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not read saved reports from this browser.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError("");
    try {
      const [stats, anomalyResponse] = await Promise.all([api.overview(), api.anomalies()]);
      setOverview(stats);
      setAnomalies(anomalyResponse.anomalies);
    } catch (reason) {
      setDashboardError(reason instanceof Error ? reason.message : "Could not load report data.");
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDashboardData(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboardData]);

  function removeReport(id: string) {
    setError("");
    try {
      deleteSavedReport(id);
      setReports((current) => current.filter((report) => report.id !== id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove this report.");
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar />
      <main className="main-content">
        <AppHeader title="Reports" eyebrow="Campus energy analysis" />
        <div className="reports-page-toolbar"><span>Live Snowflake summary</span><button className="secondary-button print-button" onClick={() => window.print()}><Printer size={15} /> Print / Save PDF</button></div>
        {dashboardError && <div className="error-banner" role="alert"><p>{dashboardError}</p><button onClick={() => void loadDashboardData()} disabled={dashboardLoading}><RefreshCw size={14} /> Retry</button></div>}
        <div className="metric-grid">
          <MetricCard label="Anomaly events" value={overview?.total_anomalies ?? "—"} detail="Historical electricity comparisons" />
          <MetricCard label="Affected buildings" value={overview?.affected_buildings ?? "—"} detail="Distinct buildings in results" />
          <MetricCard label="High severity" value={overview?.high_severity ?? "—"} detail="Triage threshold · not a diagnosis" />
          <MetricCard label="Medium severity" value={overview?.medium_severity ?? "—"} detail="Triage threshold · not a diagnosis" />
          <MetricCard label="Low severity" value={overview?.low_severity ?? "—"} detail="Triage threshold · not a diagnosis" />
          <MetricCard label="Average change" value={overview ? percent(overview.average_change_pct) : "—"} detail="Across returned anomaly events" />
        </div>
        <section className="panel report-anomalies">
          <div className="panel-heading"><div><p>{overview?.source === "snowflake" ? "Snowflake · current result set" : "Current result set"}</p><h2>Anomaly records</h2></div><span className="analytics-total">{overview?.total_anomalies ?? 0} events</span></div>
          {dashboardLoading && !anomalies.length ? <div className="loading-state"><span className="spinner" /> Loading report data…</div>
            : <AnomaliesTable anomalies={anomalies} />}
          {!dashboardLoading && !dashboardError && !anomalies.length && <div className="empty-state">No anomaly records were returned.</div>}
        </section>
        <div className="report-archive-heading"><div><p>Saved investigations</p><h2>Cortex report archive</h2></div><span>{loading ? "…" : reports.length} saved</span></div>
        <section className="reports-overview">
          <div className="reports-overview-icon"><Archive size={20} /></div>
          <div className="reports-overview-copy"><p>Investigation archive</p><h2>Reports from your Cortex reviews</h2><span>Review generated analysis alongside the measured anomaly that prompted it.</span></div>
          <div className="reports-count"><strong>{loading ? "—" : reports.length}</strong><span>saved reports</span></div>
        </section>
        <div className="local-report-note"><HardDrive size={16} /><div><strong>Saved on this browser</strong><span>Reports are stored locally and are not shared with teammates or synced to the backend.</span></div></div>
        {error && <div className="error-banner" role="alert"><p>{error}</p><button onClick={load} disabled={loading}><RefreshCw size={14} /> Retry</button></div>}
        {loading ? <div className="panel"><div className="loading-state"><span className="spinner" /> Loading saved reports…</div></div>
          : reports.length ? <div className="reports-list">{reports.map((report) => {
            const anomaly = report.investigation.anomaly;
            return <article className="panel report-card" key={report.id}>
              <div className="report-card-header">
                <div className="report-identity"><p>{anomaly.campus} <span>/</span> {anomaly.period}</p><h2>{anomaly.building}</h2><span>Building ID {anomaly.building_id}</span></div>
                <div className="report-actions"><SeverityBadge severity={anomaly.severity} /><span className={`status status-${report.investigation.status}`}>{report.investigation.status}</span><button className="icon-button delete-report" onClick={() => removeReport(report.id)} aria-label={`Delete report for ${anomaly.building}`}><Trash2 size={15} /></button></div>
              </div>
              <div className="report-meta"><span>Model <strong>{report.investigation.model}</strong></span><span>Saved <time dateTime={report.saved_at}>{new Date(report.saved_at).toLocaleString()}</time></span><Link href={`/investigations/${anomaly.id}`}>Open investigation <ArrowUpRight size={13} /></Link></div>
              <section className="panel report-evidence">
                <div className="panel-heading"><div><p>Measured evidence · {anomaly.metric.replaceAll("_", " ")}</p><h2>Fiscal-year comparison</h2></div><span className="record-id">{anomaly.period}</span></div>
                <div className="measurement-grid">
                  <div><p>Current value</p><strong>{kwh(anomaly.current_value)}</strong><span>Purchased electricity</span></div>
                  <div><p>Baseline value</p><strong>{kwh(anomaly.baseline_value)}</strong><span>Comparison baseline</span></div>
                  <div><p>Change · calculated</p><strong className={anomaly.change_pct > 0 ? "change-up" : ""}>{percent(anomaly.change_pct)}</strong><span>Not a fault probability</span></div>
                </div>
                <div className="comparison-chart" role="img" aria-label={`Purchased electricity comparison: baseline ${kwh(anomaly.baseline_value)}, current ${kwh(anomaly.current_value)}`}>
                  <div className="comparison-heading"><strong>Usage comparison</strong><span>kWh · relative scale</span></div>
                  {[{ label: "Baseline", value: anomaly.baseline_value, current: false }, { label: anomaly.period, value: anomaly.current_value, current: true }].map((item) => {
                    const max = Math.max(anomaly.baseline_value, anomaly.current_value, 1);
                    return <div className="comparison-row" key={item.label}>
                      <span>{item.label}</span><div className="comparison-track"><i className={item.current ? "comparison-fill current" : "comparison-fill"} style={{ width: `${item.value / max * 100}%` }} /></div><strong>{kwh(item.value)}</strong>
                    </div>;
                  })}
                </div>
                {anomaly.data_quality_notes && <div className="quality-note"><p>Data quality and methodology</p><span>{anomaly.data_quality_notes}</span></div>}
              </section>
              <section className="panel cortex-panel report-cortex">
                <div className="panel-heading"><div><p>Cortex · {report.investigation.model}</p><h2>Investigation analysis</h2></div><span className={`status status-${report.investigation.status}`}>{report.investigation.status}</span></div>
                {report.investigation.explanation
                  ? <CortexExplanation text={report.investigation.explanation} />
                  : <div className="empty-state">The backend did not return an explanation.</div>}
                <div className="source-unavailable"><strong>Browser research not included</strong><span>No external sources were retrieved or verified for this investigation.</span></div>
              </section>
              <div className="report-footer"><span>Potential anomaly · requires facilities review · no fault confirmed</span></div>
            </article>;
          })}</div>
            : <section className="panel"><div className="empty-investigation"><p>Saved investigations</p><h2>No Cortex reports saved yet</h2><span>Run an investigation from an anomaly. Completed results will appear here, saved in this browser.</span><Link className="primary-button" href="/anomalies">Review anomalies</Link></div></section>}
        <p className="provenance">Cortex explanations are generated hypotheses, not confirmed causes. Verify recommendations with facilities staff.</p>
      </main>
    </div>
  );
}
