import Link from "next/link";
import { Anomaly, OverviewResponse, Severity } from "@/lib/types";
import { percent } from "@/lib/format";

const severities: Severity[] = ["high", "medium", "low"];

function SeverityBreakdown({ overview }: { overview: OverviewResponse }) {
  const counts: Record<Severity, number> = {
    high: overview.high_severity,
    medium: overview.medium_severity,
    low: overview.low_severity,
  };

  return (
    <section className="panel analytics-card">
      <div className="panel-heading"><div><p>Current result set</p><h2>Severity mix</h2></div><span className="analytics-total">{overview.total_anomalies} events</span></div>
      <div className="severity-chart" role="img" aria-label={`Severity distribution: ${severities.map((level) => `${counts[level]} ${level}`).join(", ")}`}>
        {severities.map((level) => (
          <div className="severity-row" key={level}>
            <span className={`severity-label severity-label-${level}`}>{level}</span>
            <div className="severity-track"><span className={`severity-fill severity-fill-${level}`} style={{ width: `${overview.total_anomalies ? counts[level] / overview.total_anomalies * 100 : 0}%` }} /></div>
            <strong>{counts[level]}</strong>
          </div>
        ))}
      </div>
      <p className="chart-caption">Severity is a triage threshold, not a fault diagnosis.</p>
    </section>
  );
}

function FiscalYearActivity({ anomalies }: { anomalies: Anomaly[] }) {
  const counts = anomalies.reduce<Record<string, number>>((result, anomaly) => {
    result[anomaly.period] = (result[anomaly.period] ?? 0) + 1;
    return result;
  }, {});
  const years = Object.entries(counts).sort(([first], [second]) => first.localeCompare(second));
  const max = Math.max(...years.map(([, count]) => count), 1);

  return (
    <section className="panel analytics-card">
      <div className="panel-heading"><div><p>By comparison period</p><h2>Anomaly events by fiscal year</h2></div></div>
      {years.length ? <div className="year-chart" role="img" aria-label={`Anomaly events by fiscal year: ${years.map(([year, count]) => `${year}: ${count}`).join(", ")}`}>
        {years.map(([year, count]) => <div className="year-column" key={year}>
          <strong>{count}</strong>
          <div className="year-track"><span style={{ height: `${count / max * 100}%` }} /></div>
          <span>{year.replace("FY20", "FY")}</span>
        </div>)}
      </div> : <div className="chart-empty">No fiscal-year data.</div>}
      <p className="chart-caption">Counts of returned anomaly flags—not energy usage.</p>
    </section>
  );
}

function CampusBreakdown({ anomalies }: { anomalies: Anomaly[] }) {
  const counts = anomalies.reduce<Record<string, number>>((result, anomaly) => {
    const campus = anomaly.campus || "Campus not available";
    result[campus] = (result[campus] ?? 0) + 1;
    return result;
  }, {});
  const campuses = Object.entries(counts).sort(([, first], [, second]) => second - first).slice(0, 5);
  const max = Math.max(...campuses.map(([, count]) => count), 1);

  return (
    <section className="panel analytics-card">
      <div className="panel-heading"><div><p>Flagged events</p><h2>By campus</h2></div></div>
      <div className="ranked-bars" role="img" aria-label={`Top campuses by anomaly-event count: ${campuses.map(([campus, count]) => `${campus}: ${count}`).join(", ")}`}>
        {campuses.map(([campus, count]) => <div className="ranked-bar-row" key={campus}>
          <span title={campus}>{campus}</span><div className="ranked-track"><i style={{ width: `${count / max * 100}%` }} /></div><strong>{count}</strong>
        </div>)}
        {!campuses.length && <div className="chart-empty">No campus data.</div>}
      </div>
      <p className="chart-caption">Top campuses by anomaly count; not campus energy totals.</p>
    </section>
  );
}

function LargestChanges({ anomalies }: { anomalies: Anomaly[] }) {
  const largest = [...anomalies].sort((first, second) => Math.abs(second.change_pct) - Math.abs(first.change_pct)).slice(0, 5);
  const max = Math.max(...largest.map((anomaly) => Math.abs(anomaly.change_pct)), 1);

  return (
    <section className="panel analytics-card">
      <div className="panel-heading"><div><p>Ranked by absolute change</p><h2>Largest deviations</h2></div><span className="analytics-total">vs. baseline</span></div>
      <div className="deviation-list">
        {largest.map((anomaly) => <Link className="deviation-row" href={`/investigations/${anomaly.id}`} key={anomaly.id}>
          <span className={`deviation-value ${anomaly.change_pct < 0 ? "deviation-negative" : ""}`}>{percent(anomaly.change_pct)}</span>
          <span className="deviation-info"><strong>{anomaly.building}</strong><small>{anomaly.period} · {anomaly.campus}</small><i className={anomaly.change_pct < 0 ? "deviation-bar-negative" : ""} style={{ width: `${Math.abs(anomaly.change_pct) / max * 100}%` }} /></span>
        </Link>)}
        {!largest.length && <div className="chart-empty">No anomaly changes to rank.</div>}
      </div>
      <p className="chart-caption">Percent change is not a probability of equipment failure.</p>
    </section>
  );
}

export function OverviewAnalytics({ overview, anomalies }: { overview: OverviewResponse; anomalies: Anomaly[] }) {
  return (
    <div className="analytics-grid">
      <SeverityBreakdown overview={overview} />
      <FiscalYearActivity anomalies={anomalies} />
      <CampusBreakdown anomalies={anomalies} />
      <LargestChanges anomalies={anomalies} />
    </div>
  );
}
