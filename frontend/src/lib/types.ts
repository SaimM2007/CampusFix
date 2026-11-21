export type Severity = "high" | "medium" | "low";

export interface Anomaly {
  id: string;
  building: string;
  building_id: string;
  campus: string;
  period: string;
  metric: string;
  current_value: number;
  baseline_value: number;
  change_pct: number;
  severity: Severity;
  status: string;
  data_quality_notes: string | null;
  explanation: string | null;
}

export interface OverviewResponse {
  source: string;
  total_anomalies: number;
  high_severity: number;
  medium_severity: number;
  low_severity: number;
  affected_buildings: number;
  average_change_pct: number;
}

export interface AnomaliesResponse {
  source: string;
  anomalies: Anomaly[];
}

export interface Investigation {
  anomaly_id: string;
  building: string;
  model: string;
  status: string;
  explanation: string;
  anomaly: Anomaly;
}
