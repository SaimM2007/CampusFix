"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { AnomaliesTable } from "@/components/anomalies-table";
import { api } from "@/lib/api";
import { Anomaly, Severity } from "@/lib/types";

export default function AnomaliesPage() {
  const [items, setItems] = useState<Anomaly[]>([]);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<"all" | Severity>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.anomalies();
      setItems(response.anomalies);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load anomaly data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = items.filter((item) =>
    `${item.building} ${item.building_id} ${item.campus}`.toLowerCase().includes(query.toLowerCase()) &&
    (severity === "all" || item.severity === severity)
  );

  return (
    <div className="app-shell">
      <AppSidebar />
      <main className="main-content">
        <AppHeader title="Anomalies" eyebrow="Historical electricity review" />
        {error && <div className="error-banner" role="alert"><p>{error}</p><button onClick={() => void load()} disabled={loading}><RefreshCw size={14} className={loading ? "spin" : ""} /> Retry</button></div>}
        <section className="panel">
          <div className="filters">
            <label className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search building, ID, or campus" /></label>
            <label className="severity-filter">Severity
              <select value={severity} onChange={(e) => setSeverity(e.target.value as "all" | Severity)}>
                <option value="all">All severities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
              </select>
            </label>
          </div>
          {loading && !items.length ? <div className="loading-state"><span className="spinner" /> Loading anomalies…</div> : <AnomaliesTable anomalies={filtered} />}
          {!loading && !error && !filtered.length && <div className="empty-state">No anomalies match these filters.</div>}
        </section>
        <div className="data-note"><strong>How to read this</strong><span>Change percentages are provided by the API. Values are purchased electricity in kWh; they do not represent total building electricity or live usage.</span></div>
        <p className="provenance">Potential anomaly — requires facilities review. No fault has been confirmed.</p>
      </main>
    </div>
  );
}
