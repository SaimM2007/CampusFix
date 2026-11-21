"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { MetricCard } from "@/components/metric-card";
import { AnomaliesTable } from "@/components/anomalies-table";
import { OverviewAnalytics } from "@/components/overview-analytics";
import { api } from "@/lib/api";
import { Anomaly, OverviewResponse } from "@/lib/types";
import { percent } from "@/lib/format";

export default function Home() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [stats, anomalyResponse] = await Promise.all([api.overview(), api.anomalies()]);
      setOverview(stats);
      setAnomalies(anomalyResponse.anomalies);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="app-shell">
      <AppSidebar />
      <main className="main-content">
        <AppHeader title="Overview" eyebrow="Rutgers Energy Intelligence" />
        {error && <div className="error-banner" role="alert"><p>{error}</p><button onClick={() => void load()} disabled={loading}><RefreshCw size={14} className={loading ? "spin" : ""} /> Retry</button></div>}
        <div className="metric-grid">
          <MetricCard label="Anomaly events" value={overview?.total_anomalies ?? "—"} detail="Historical electricity comparisons" />
          <MetricCard label="Affected buildings" value={overview?.affected_buildings ?? "—"} detail="Distinct buildings in current results" />
          <MetricCard label="High severity" value={overview?.high_severity ?? "—"} detail="Triage threshold · not a diagnosis" />
          <MetricCard label="Medium severity" value={overview?.medium_severity ?? "—"} detail="Triage threshold · not a diagnosis" />
          <MetricCard label="Low severity" value={overview?.low_severity ?? "—"} detail="Triage threshold · not a diagnosis" />
          <MetricCard label="Average change" value={overview ? percent(overview.average_change_pct) : "—"} detail="Across returned anomaly events" />
        </div>
        {overview && anomalies.length > 0 && <OverviewAnalytics overview={overview} anomalies={anomalies} />}
        <section className="panel">
          <div className="panel-heading">
            <div><p>{overview?.source === "snowflake" ? "Snowflake · purchased electricity" : "Historical data"}</p><h2>Latest anomaly events</h2></div>
            <Link className="text-link" href="/anomalies">All {overview?.total_anomalies ?? "—"} anomalies <ArrowRight size={15} /></Link>
          </div>
          {loading && !anomalies.length ? <div className="loading-state"><span className="spinner" /> Loading Snowflake anomaly data…</div> : <AnomaliesTable anomalies={anomalies.slice(0, 6)} />}
          {!loading && !error && !anomalies.length && <div className="empty-state">No anomaly records were returned.</div>}
        </section>
        <div className="data-note"><strong>Data context</strong><span>Historical purchased electricity · Fiscal-year comparisons · No weather normalization · Some cogeneration is excluded</span></div>
        <p className="provenance">Anomaly flags are review leads, not confirmed faults. Severity is a triage threshold, not a fault diagnosis.</p>
      </main>
    </div>
  );
}
