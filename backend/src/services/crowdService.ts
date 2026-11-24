import {
  CROWD_NUMERIC_SEVERITY,
  SCORING_CONSTANTS,
} from '../config/scoring.ts';
import type {
  AggregatedCrowd,
  CrowdLevel,
  CrowdReport,
  DataSource,
} from '../models/types.ts';
import { INITIAL_CROWD_REPORTS, SEED_STATIONS } from '../utils/seedData.ts';

const reportsStore: CrowdReport[] = [...INITIAL_CROWD_REPORTS];

const CROWD_DISCLAIMER =
  'Community crowd reports are user-submitted and may not represent actual conditions.';

function numericToCrowdLevel(avg: number): Exclude<CrowdLevel, 'Unknown'> {
  if (avg < 1.55) return 'Low';
  if (avg < 2.5) return 'Moderate';
  if (avg < 3.4) return 'High';
  return 'Very High';
}

export function resolveStation(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  return (
    SEED_STATIONS.find(
      (s) =>
        s.id.toLowerCase() === normalized ||
        s.station_name.toLowerCase() === normalized ||
        s.aliases.some((alias) => alias.toLowerCase() === normalized)
    ) ??
    SEED_STATIONS.find(
      (s) =>
        s.station_name.toLowerCase().includes(normalized) ||
        s.aliases.some((alias) => alias.toLowerCase().includes(normalized))
    ) ??
    null
  );
}

export function getAggregatedCrowdForStation(stationId: string): AggregatedCrowd {
  const station = SEED_STATIONS.find((s) => s.id === stationId);
  const stationName = station ? station.station_name : stationId;

  const stationReports = reportsStore
    .filter((r) => r.station_id === stationId)
    .sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));

  if (stationReports.length === 0) {
    return {
      station_id: stationId,
      station_name: stationName,
      crowd_level: 'Unknown',
      source: 'DATA UNAVAILABLE',
      report_count: 0,
      latest_report_at: null,
      is_stale: false,
      has_conflict: false,
      conflict_message: null,
      confidence_score: 0,
      disclaimer: CROWD_DISCLAIMER,
      recent_reports: [],
    };
  }

  const nowMs = Date.now();
  let weightedSum = 0;
  let totalWeight = 0;

  for (const report of stationReports) {
    const ageMinutes = Math.max(0, (nowMs - Date.parse(report.submitted_at)) / 60_000);
    const weight = Math.exp(-ageMinutes / SCORING_CONSTANTS.RECENCY_HALF_LIFE_MINUTES);
    const severity = CROWD_NUMERIC_SEVERITY[report.crowd_level];
    weightedSum += severity * weight;
    totalWeight += weight;
  }

  const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 2;
  const crowdLevel = numericToCrowdLevel(weightedAvg);

  // Check staleness from newest report
  const latestMs = Date.parse(stationReports[0].submitted_at);
  const newestAgeMinutes = (nowMs - latestMs) / 60_000;
  const isStale = newestAgeMinutes > SCORING_CONSTANTS.STALE_REPORT_THRESHOLD_MINUTES;

  // Check conflicting reports within the last 90 minutes
  const recentWindow = stationReports.filter(
    (r) => (nowMs - Date.parse(r.submitted_at)) / 60_000 <= 90
  );
  let hasConflict = false;
  if (recentWindow.length >= 2) {
    const severities = recentWindow.map((r) => CROWD_NUMERIC_SEVERITY[r.crowd_level]);
    const spread = Math.max(...severities) - Math.min(...severities);
    if (spread >= SCORING_CONSTANTS.CONFLICT_SPREAD_THRESHOLD) {
      hasConflict = true;
    }
  }

  const hasUserSubmitted = stationReports.some((r) => r.source === 'USER REPORTED');
  const source: DataSource = hasUserSubmitted ? 'USER REPORTED' : 'DEMO DATA';

  const baseConfidence = Math.min(92, 55 + stationReports.length * 10);
  const confidenceScore = Math.max(
    25,
    baseConfidence - (isStale ? 22 : 0) - (hasConflict ? 25 : 0)
  );

  return {
    station_id: stationId,
    station_name: stationName,
    crowd_level: crowdLevel,
    source,
    report_count: stationReports.length,
    latest_report_at: stationReports[0].submitted_at,
    is_stale: isStale,
    has_conflict: hasConflict,
    conflict_message: hasConflict
      ? 'Recent crowd reports differ. Treat this information as uncertain.'
      : null,
    confidence_score: confidenceScore,
    disclaimer: CROWD_DISCLAIMER,
    recent_reports: stationReports.slice(0, 6),
  };
}

export function submitCrowdReport(input: {
  stationId?: string;
  stationName: string;
  crowdLevel: Exclude<CrowdLevel, 'Unknown'>;
  note?: string;
}): { report: CrowdReport; aggregated: AggregatedCrowd } {
  const matchedStation =
    (input.stationId ? SEED_STATIONS.find((s) => s.id === input.stationId) : null) ??
    resolveStation(input.stationName);

  const stationId =
    matchedStation?.id ??
    `custom-${input.stationName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const stationName = matchedStation?.station_name ?? input.stationName.trim();

  const report: CrowdReport = {
    id: `cr-user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    station_id: stationId,
    station_name: stationName,
    crowd_level: input.crowdLevel,
    submitted_at: new Date().toISOString(),
    source: 'USER REPORTED',
    note: input.note?.trim() ? input.note.trim().slice(0, 140) : undefined,
  };

  reportsStore.unshift(report);
  // Keep in-memory store bounded
  if (reportsStore.length > 250) {
    reportsStore.length = 250;
  }

  return {
    report,
    aggregated: getAggregatedCrowdForStation(stationId),
  };
}

export function listAllStationSummaries(): AggregatedCrowd[] {
  return SEED_STATIONS.map((s) => getAggregatedCrowdForStation(s.id));
}
