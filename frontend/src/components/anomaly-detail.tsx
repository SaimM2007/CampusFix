"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { SeverityBadge } from "@/components/severity-badge";
import { api } from "@/lib/api";
import { Anomaly, Investigation } from "@/lib/types";
import { kwh, percent } from "@/lib/format";

function cleanInlineMarkdown(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`([^`]+)`/g, "$1");
}

function explanationText(text: string) {
  const trimmed = text.trim();
  const quoted = trimmed.match(/^"([\s\S]*)"$/);
  return (quoted ? quoted[1] : trimmed).split(/\r?\n/).map((line) => {
    const value = line.trim();
    if (!value) return { kind: "space", text: "" };
    if (/^#{1,6}\s+/.test(value)) return { kind: "heading", text: cleanInlineMarkdown(value.replace(/^#{1,6}\s+/, "")) };
    if (/^[-*]\s+/.test(value)) return { kind: "bullet", text: cleanInlineMarkdown(value.replace(/^[-*]\s+/, "")) };
    if (/^\d+[.)]\s+/.test(value)) return { kind: "bullet", text: cleanInlineMarkdown(value.replace(/^\d+[.)]\s+/, "")) };
    return { kind: "paragraph", text: cleanInlineMarkdown(value) };
  });
}

export default function AnomalyDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [anomaly, setAnomaly] = useState<Anomaly | null>(null);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const loadAnomaly = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAnomaly(await api.anomaly(id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this anomaly.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAnomaly(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAnomaly]);

  async function investigate() {
    if (running) return;
    setRunning(true);
    setError("");
    setInvestigation(null);
    try {
      const result = await api.investigate(id);
      setInvestigation(result);
      if (result.anomaly) setAnomaly(result.anomaly);
      if (result.status !== "completed" && result.status !== "complete") {
        setError(`Investigation returned status: ${result.status}.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The Cortex investigation failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="app-shell">
      <AppSidebar />
      <main className="main-content detail-content">
        <Link className="back-link" href="/anomalies"><ArrowLeft size={15} /> All anomalies</Link>
        {anomaly && <AppHeader title={anomaly.building} eyebrow={`${anomaly.campus} · ${anomaly.period}`} />}
        {loading && <div className="loading-state"><span className="spinner" /> Loading anomaly from Snowflake…</div>}
        {!loading && error && !anomaly && <div className="error-banner" role="alert"><p>{error}</p><button onClick={() => void loadAnomaly()}><RefreshCw size={14} /> Retry</button></div>}
        {!loading && !anomaly && !error && <div className="empty-state">Anomaly not found.</div>}

        {anomaly && <>
          <div className="detail-toolbar">
            <div><SeverityBadge severity={anomaly.severity} /><span className={`status status-${anomaly.status}`}>{anomaly.status}</span></div>
            <button className="primary-button" onClick={investigate} disabled={running || loading}>
              {running ? <span className="spinner spinner-dark" /> : <Sparkles size={16} />}
              {running ? "Running Cortex…" : "Investigate with Cortex"}
            </button>
          </div>
          {error && <div className="error-banner" role="alert"><p>{error}</p><button onClick={investigate} disabled={running}><RefreshCw size={14} /> Retry</button></div>}

          <div className="detail-grid">
            <section className="panel evidence-card">
              <div className="panel-heading"><div><p>Measured evidence · {anomaly.metric.replaceAll("_", " ")}</p><h2>Fiscal-year comparison</h2></div><span className="record-id">Building ID {anomaly.building_id}</span></div>
              <div className="measurement-grid">
                <div><p>Current · {anomaly.period}</p><strong>{kwh(anomaly.current_value)}</strong><span>Purchased electricity</span></div>
                <div><p>Baseline</p><strong>{kwh(anomaly.baseline_value)}</strong><span>Prior comparison period</span></div>
                <div><p>Change · calculated</p><strong className={anomaly.change_pct > 0 ? "change-up" : ""}>{percent(anomaly.change_pct)}</strong><span>Reported change · not a fault probability</span></div>
              </div>
              <div className="quality-note"><p>Data quality and methodology</p><span>{anomaly.data_quality_notes || "No data-quality notes were supplied for this anomaly."}</span></div>
            </section>
            <aside className="panel context-card">
              <p>Review context</p><h2>Historical lead, not diagnosis</h2>
              <p>This record compares purchased-electricity data for a fiscal period. It is not live metering and does not confirm equipment failure.</p>
              <ul><li>Some cogeneration output is excluded.</li><li>Meter coverage and billing periods can differ.</li><li>Results are not weather-normalized.</li></ul>
              <div className="context-divider" />
              <strong>Human review required</strong>
              <span>Verify meter coverage, billing periods, and operating context before taking action.</span>
            </aside>
          </div>

          {investigation && <section className="panel cortex-panel">
            <div className="panel-heading"><div><p>Cortex · {investigation.model}</p><h2>Investigation analysis</h2></div><span className={`status status-${investigation.status}`}>{investigation.status}</span></div>
            {investigation.explanation
              ? <div className="cortex-copy">{explanationText(investigation.explanation).map((line, index) =>
                  line.kind === "heading" ? <h3 key={index}>{line.text}</h3>
                    : line.kind === "bullet" ? <p className="cortex-bullet" key={index}><span>·</span>{line.text}</p>
                      : line.kind === "space" ? <div className="cortex-space" key={index} />
                        : <p key={index}>{line.text}</p>
                )}</div>
              : <div className="empty-state">The backend did not return an explanation.</div>}
            <div className="source-unavailable"><strong>Browser research not included</strong><span>This response contains Cortex analysis only; no external sources were retrieved or verified.</span></div>
          </section>}
          <p className="provenance warning">Potential anomaly — requires facilities review. No fault has been confirmed.</p>
        </>}
      </main>
    </div>
  );
}
