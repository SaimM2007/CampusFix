"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCw, Search } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { MetricCard } from "@/components/metric-card";
import { SeverityBadge } from "@/components/severity-badge";
import { api } from "@/lib/api";
import { Anomaly } from "@/lib/types";
import { percent } from "@/lib/format";

interface BuildingSummary {
  key: string;
  building: string;
  buildingId: string;
  campus: string;
  anomalies: Anomaly[];
}

function summarizeBuildings(anomalies: Anomaly[]): BuildingSummary[] {
  const grouped = new Map<string, BuildingSummary>();
  for (const anomaly of anomalies) {
    const key = anomaly.building_id || anomaly.building;
    const existing = grouped.get(key);
    if (existing) {
      existing.anomalies.push(anomaly);
    } else {
      grouped.set(key, {
        key,
        building: anomaly.building,
        buildingId: anomaly.building_id,
        campus: anomaly.campus,
        anomalies: [anomaly],
      });
    }
  }
  return [...grouped.values()].sort((first, second) => first.building.localeCompare(second.building));
}

const severityRank = { high: 3, medium: 2, low: 1 };

export default function BuildingsPage() {
  const [items, setItems] = useState<Anomaly[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.anomalies();
      setItems(response.anomalies);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load building data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const buildings = useMemo(() => summarizeBuildings(items), [items]);
  const filtered = buildings.filter((building) =>
    `${building.building} ${building.buildingId} ${building.campus}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="app-shell">
      <AppSidebar />
      <main className="main-content">
        <AppHeader title="Buildings" eyebrow="Building coverage in anomaly results" />
        {error && <div className="error-banner" role="alert"><p>{error}</p><button onClick={() => void load()} disabled={loading}><RefreshCw size={14} className={loading ? "spin" : ""} /> Retry</button></div>}
        <div className="metric-grid building-metrics">
          <MetricCard label="Buildings represented" value={loading ? "—" : buildings.length} detail="Distinct buildings in anomaly results" />
          <MetricCard label="Anomaly events" value={loading ? "—" : items.length} detail="Historical purchased-electricity flags" />
          <MetricCard label="Coverage" value="Anomaly set" detail="Not a complete Rutgers building directory" />
        </div>
        <section className="panel">
          <div className="filters">
            <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search building, ID, or campus" /></label>
            <span className="analytics-total">{filtered.length} buildings</span>
          </div>
          {loading && !items.length ? <div className="loading-state"><span className="spinner" /> Loading building anomaly data…</div> : (
            <div className="table-wrap">
              <table className="buildings-table">
                <thead><tr><th>Building</th><th>Campus</th><th>Events</th><th>Highest severity</th><th>Largest change</th><th /></tr></thead>
                <tbody>
                  {filtered.map((building) => {
                    const representative = [...building.anomalies].sort((first, second) =>
                      severityRank[second.severity] - severityRank[first.severity] ||
                      Math.abs(second.change_pct) - Math.abs(first.change_pct)
                    )[0];
                    const largestChange = [...building.anomalies].sort((first, second) =>
                      Math.abs(second.change_pct) - Math.abs(first.change_pct)
                    )[0];
                    return <tr key={building.key}>
                      <td><Link className="building-link" href={`/investigations/${representative.id}`}>{building.building}<span className="building-id">#{building.buildingId}</span></Link></td>
                      <td>{building.campus}</td>
                      <td>{building.anomalies.length}</td>
                      <td><SeverityBadge severity={representative.severity} /></td>
                      <td><Link className="largest-building-change" href={`/investigations/${largestChange.id}`}>{percent(largestChange.change_pct)} <span>{largestChange.period}</span></Link></td>
                      <td><Link className="row-action" href={`/investigations/${representative.id}`} aria-label={`View anomalies for ${building.building}`}><ArrowUpRight size={16} /></Link></td>
                    </tr>;
                  })}
                </tbody>
              </table>
              {!filtered.length && !loading && <div className="empty-state">No buildings match this search.</div>}
            </div>
          )}
        </section>
        <div className="data-note"><strong>Scope</strong><span>Buildings are grouped from the returned anomaly records. Buildings without a flagged event are not represented here.</span></div>
      </main>
    </div>
  );
}
