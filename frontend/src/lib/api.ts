import { AnomaliesResponse, Anomaly, Investigation, OverviewResponse, ResearchResponse } from "./types";

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_URL is not configured.");

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Accept: "application/json", ...options?.headers },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body.slice(0, 300)}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  overview: () => request<OverviewResponse>("/api/overview"),
  anomalies: () => request<AnomaliesResponse>("/api/anomalies"),
  anomaly: (id: string) => request<Anomaly>(`/api/anomalies/${encodeURIComponent(id)}`),
  investigate: (id: string) =>
    request<Investigation>(`/api/anomalies/${encodeURIComponent(id)}/investigate`, { method: "POST" }),
  research: (id: string) =>
    request<ResearchResponse>(`/api/anomalies/${encodeURIComponent(id)}/research`, { method: "POST" }),
};
