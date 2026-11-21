"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Anomaly } from "@/lib/types";
import { percent } from "@/lib/format";
import { SeverityBadge } from "./severity-badge";

export function AnomaliesTable({ anomalies }: { anomalies: Anomaly[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Building</th><th>Campus</th><th>Period</th><th>Change</th><th>Severity</th><th>Status</th><th /></tr></thead>
        <tbody>
          {anomalies.map((item) => (
            <tr key={item.id}>
              <td><Link className="building-link" href={`/anomalies/${item.id}`}>{item.building || "Unknown building"}<ArrowUpRight size={14} /></Link></td>
              <td>{item.campus || "Not available"}</td>
              <td className="mono">{item.period || "Not available"}</td>
              <td className={item.change_pct !== undefined && item.change_pct > 0 ? "change-up" : ""}>{percent(item.change_pct)}</td>
              <td><SeverityBadge severity={item.severity || "low"} /></td>
              <td><span className={`status status-${item.status}`}>{item.status}</span></td>
              <td><Link href={`/anomalies/${item.id}`} className="row-action" aria-label={`Open ${item.building}`}><ArrowUpRight size={16} /></Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!anomalies.length && <div className="empty-state">No anomalies match this view.</div>}
    </div>
  );
}
