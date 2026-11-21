"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Printer, RefreshCw, Search, Sparkles } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { SeverityBadge } from "@/components/severity-badge";
import { CortexExplanation, extractCortexRecommendations } from "@/components/cortex-explanation";
import { api } from "@/lib/api";
import { Anomaly, Investigation, ResearchResponse, ResearchSource } from "@/lib/types";
import { kwh, percent } from "@/lib/format";
import { saveCortexReport } from "@/lib/saved-reports";

const genericDiagnosticChecks = [
  "Check HVAC operating schedules and recent controls changes.",
  "Verify electricity meter readings and billing-period alignment.",
  "Review changes in occupancy and energy-using equipment.",
];

function safeSourceUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function ResearchSourceCard({ source }: { source: ResearchSource }) {
  const url = safeSourceUrl(source.url);
  return (
    <article className="research-source">
      <div className="research-source-heading">
        <div>
          <h3>{source.title || "Untitled public source"}</h3>
          {url ? <a href={url} target="_blank" rel="noreferrer">{url}<ExternalLink size={13} /></a>
            : <span className="invalid-source-url">{source.url || "Source URL not available"}</span>}
        </div>
        <span className="source-type">{source.evidence_type?.replaceAll("_", " ") || "Public webpage context"}</span>
      </div>
      <div className="gemini-analysis">
        <p><Sparkles size={13} /> Gemini analysis <span>{source.analysis_provider || "Provider not specified"}</span></p>
        {source.analysis ? <CortexExplanation text={source.analysis} /> : <span className="muted-copy">No analysis was returned for this source.</span>}
      </div>
      {source.excerpt && <details className="source-excerpt"><summary>View relevant webpage excerpt</summary><p>{source.excerpt}</p></details>}
    </article>
  );
}

export default function InvestigationReport() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [anomaly, setAnomaly] = useState<Anomaly | null>(null);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [research, setResearch] = useState<ResearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningInvestigation, setRunningInvestigation] = useState(false);
  const [runningResearch, setRunningResearch] = useState(false);
  const [error, setError] = useState("");
  const [investigationError, setInvestigationError] = useState("");
  const [researchError, setResearchError] = useState("");
  const [savedNotice, setSavedNotice] = useState("");

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
    if (runningInvestigation || runningResearch) return;
    setRunningInvestigation(true);
    setInvestigationError("");
    setSavedNotice("");
    setInvestigation(null);
    try {
      const result = await api.investigate(id);
      setInvestigation(result);
      if (result.anomaly) setAnomaly(result.anomaly);
      if (result.status !== "completed" && result.status !== "complete") {
        setInvestigationError(`Investigation returned status: ${result.status}.`);
      } else {
        try {
          saveCortexReport(result);
          setSavedNotice("Investigation saved to Reports on this browser.");
        } catch (reason) {
          setSavedNotice(`Investigation completed, but could not be saved here: ${reason instanceof Error ? reason.message : "browser storage is unavailable."}`);
        }
      }
    } catch (reason) {
      setInvestigationError(reason instanceof Error ? reason.message : "The Cortex investigation failed.");
    } finally {
      setRunningInvestigation(false);
    }
  }

  async function researchSources() {
    if (runningInvestigation || runningResearch) return;
    setRunningResearch(true);
    setResearchError("");
    setResearch(null);
    try {
      setResearch(await api.research(id));
    } catch (reason) {
      setResearchError(reason instanceof Error ? reason.message : "Browserbase research failed.");
    } finally {
      setRunningResearch(false);
    }
  }

  const cortexRecommendations = investigation?.recommended_actions?.length
    ? investigation.recommended_actions
    : investigation
      ? extractCortexRecommendations(investigation.explanation)
      : null;

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
            <div className="investigation-actions">
              <button className="secondary-button print-button" onClick={() => window.print()}><Printer size={15} /> Print / Save PDF</button>
              <button className="secondary-button research-button" onClick={researchSources} disabled={runningResearch || runningInvestigation || loading}>
                {runningResearch ? <span className="spinner" /> : <Search size={15} />}
                {runningResearch ? "Researching sources…" : "Research Public Sources"}
              </button>
              <button className="primary-button" onClick={investigate} disabled={runningInvestigation || runningResearch || loading}>
                {runningInvestigation ? <span className="spinner spinner-dark" /> : <Sparkles size={16} />}
                {runningInvestigation ? "Running Cortex…" : "Generate AI Investigation"}
              </button>
            </div>
          </div>
          {investigationError && <div className="error-banner" role="alert"><p>{investigationError}</p><button onClick={investigate} disabled={runningInvestigation || runningResearch}><RefreshCw size={14} /> Retry Cortex</button></div>}
          {savedNotice && <div className="save-notice" role="status">{savedNotice}<Link href="/reports">View reports</Link></div>}

          <div className="detail-grid">
            <section className="panel evidence-card">
              <div className="panel-heading"><div><p>Measured evidence · {anomaly.metric.replaceAll("_", " ")}</p><h2>Fiscal-year comparison</h2></div><span className="record-id">Building ID {anomaly.building_id}</span></div>
              <div className="measurement-grid">
                <div><p>Current · {anomaly.period}</p><strong>{kwh(anomaly.current_value)}</strong><span>Purchased electricity</span></div>
                <div><p>Baseline</p><strong>{kwh(anomaly.baseline_value)}</strong><span>Prior comparison period</span></div>
                <div><p>Change · calculated</p><strong className={anomaly.change_pct > 0 ? "change-up" : ""}>{percent(anomaly.change_pct)}</strong><span>Reported change · not a fault probability</span></div>
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

          <section className="panel diagnostic-panel">
            <div className="panel-heading"><div><p>{cortexRecommendations ? "From Cortex response" : "Generic suggestions · not AI-generated"}</p><h2>Suggested diagnostic checks</h2></div></div>
            <ol className="diagnostic-list">
              {(cortexRecommendations?.length ? cortexRecommendations : genericDiagnosticChecks).map((action, index) => <li key={`${index}-${action}`}>{action}</li>)}
            </ol>
            <p className="chart-caption">These are suggestions for facilities review, not confirmed solutions or work orders.</p>
          </section>

          {investigation && <section className="panel cortex-panel">
            <div className="panel-heading"><div><p>Cortex · {investigation.model}</p><h2>Investigation analysis</h2></div><span className={`status status-${investigation.status}`}>{investigation.status}</span></div>
            {investigation.explanation
              ? <CortexExplanation text={investigation.explanation} />
              : <div className="empty-state">The backend did not return an explanation.</div>}
            <div className="source-unavailable"><strong>Context and diagnosis are separate</strong><span>See the Browserbase + Gemini research below for public webpage context. It does not establish a cause.</span></div>
          </section>}

          <section className="panel research-panel">
            <div className="panel-heading"><div><p>Browserbase · Gemini</p><h2>Public source research</h2></div>
              {research?.evidence?.status && <span className={`status status-${research.evidence.status}`}>{research.evidence.status}</span>}
            </div>
            {runningResearch
              ? <div className="research-loading" role="status"><span className="spinner" /><p>Browserbase is researching public sources and Gemini is analyzing webpages...</p></div>
              : researchError
                ? <div className="error-banner research-error" role="alert"><p>{researchError}</p><button onClick={researchSources}><RefreshCw size={14} /> Retry research</button></div>
                : research
                  ? <div className="research-results">
                    <div className="research-context"><strong>Context only</strong><span>Public research does not establish the cause of the electricity change.</span></div>
                    {research.evidence?.sources?.length
                      ? research.evidence.sources.map((source, index) => <ResearchSourceCard key={`${source.url ?? "source"}-${index}`} source={source} />)
                      : <div className="empty-state">No relevant public sources found.</div>}
                    {research.evidence?.limitations && <p className="research-limitation">{Array.isArray(research.evidence.limitations) ? research.evidence.limitations.join(" ") : research.evidence.limitations}</p>}
                  </div>
                  : <div className="research-empty"><Search size={18} /><p>Research is not automatic.</p><span>Run a search to gather public webpage context for this anomaly.</span></div>}
          </section>
          <p className="provenance warning">Potential anomaly — requires facilities review. No fault has been confirmed.</p>
        </>}
      </main>
    </div>
  );
}
