import { Investigation } from "./types";

export interface SavedCortexReport {
  id: string;
  saved_at: string;
  investigation: Investigation;
}

const STORAGE_KEY = "campusfix:cortex-reports:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnomaly(value: unknown) {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.building === "string"
    && typeof value.campus === "string"
    && typeof value.building_id === "string"
    && typeof value.period === "string"
    && typeof value.metric === "string"
    && typeof value.change_pct === "number"
    && typeof value.current_value === "number"
    && typeof value.baseline_value === "number"
    && (value.severity === "high" || value.severity === "medium" || value.severity === "low")
    && typeof value.status === "string"
    && (typeof value.data_quality_notes === "string" || value.data_quality_notes === null)
    && (typeof value.explanation === "string" || value.explanation === null);
}

function isInvestigation(value: unknown): value is Investigation {
  return isRecord(value)
    && typeof value.anomaly_id === "string"
    && typeof value.building === "string"
    && typeof value.model === "string"
    && typeof value.status === "string"
    && typeof value.explanation === "string"
    && isAnomaly(value.anomaly);
}

function isSavedReport(value: unknown): value is SavedCortexReport {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.saved_at === "string"
    && isInvestigation(value.investigation);
}

export function readSavedReports(): SavedCortexReport[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Saved reports could not be decoded. Remove the corrupted browser data before saving more reports.");
  }
  if (!Array.isArray(parsed) || !parsed.every(isSavedReport)) {
    throw new Error("Saved report data is invalid. Remove the corrupted browser data before saving more reports.");
  }
  return parsed;
}

export function saveCortexReport(investigation: Investigation): SavedCortexReport {
  const report: SavedCortexReport = {
    id: `${investigation.anomaly_id}-${Date.now()}`,
    saved_at: new Date().toISOString(),
    investigation,
  };
  const reports = readSavedReports();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([report, ...reports]));
  return report;
}

export function deleteSavedReport(id: string) {
  const reports = readSavedReports();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports.filter((report) => report.id !== id)));
}
