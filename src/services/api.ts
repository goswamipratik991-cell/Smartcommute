import type {
  AggregatedCrowd,
  CrowdLevel,
  CrowdReport,
  RecommendationRequest,
  RecommendationResponse,
  RoutesOverviewResponse,
  Station,
} from '../types/transit';

const API_BASE = '/api';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg =
        (data && (data.error || data.message)) ||
        'Transport data could not be retrieved. Please try again.';
      throw new Error(msg);
    }

    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out while retrieving transport data. Please try again.');
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Transport data could not be retrieved. Please try again.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchStations(query?: string): Promise<Station[]> {
  const qs = query ? `?q=${encodeURIComponent(query)}` : '';
  const data = await requestJson<{ stations: Station[] }>(`/stations${qs}`);
  return data.stations;
}

export async function fetchRoutesOverview(): Promise<RoutesOverviewResponse> {
  return requestJson<RoutesOverviewResponse>('/routes');
}

export async function fetchRecommendations(
  payload: RecommendationRequest
): Promise<RecommendationResponse> {
  return requestJson<RecommendationResponse>('/recommendations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCrowdSummaries(): Promise<{
  summaries: AggregatedCrowd[];
  disclaimer: string;
  lastUpdated: string;
}> {
  return requestJson('/crowd-reports');
}

export async function postCrowdReport(payload: {
  stationId?: string;
  stationName: string;
  crowdLevel: Exclude<CrowdLevel, 'Unknown'>;
  note?: string;
}): Promise<{
  message: string;
  report: CrowdReport;
  aggregated: AggregatedCrowd;
}> {
  return requestJson('/crowd-reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
