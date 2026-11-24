import type { Request, Response } from 'express';
import { ApiError } from '../middleware/errorHandler.ts';
import type { CrowdLevel, TransportMode, TravelPreference } from '../models/types.ts';
import {
  getAggregatedCrowdForStation,
  listAllStationSummaries,
  submitCrowdReport,
} from '../services/crowdService.ts';
import { generateRecommendations } from '../services/recommendationService.ts';
import {
  SEED_ROUTES,
  SEED_STATIONS,
  SEED_TRANSPORT_UPDATES,
} from '../utils/seedData.ts';

const VALID_MODES: TransportMode[] = ['train', 'bus', 'mixed'];
const VALID_PREFERENCES: TravelPreference[] = ['fastest', 'least-crowded', 'balanced'];
const VALID_CROWD_LEVELS: Exclude<CrowdLevel, 'Unknown'>[] = [
  'Low',
  'Moderate',
  'High',
  'Very High',
];

function sanitizeString(input: unknown, maxLen = 120): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

export function getHealth(_req: Request, res: Response) {
  res.json({
    status: 'ok',
    service: 'SmartCommute API',
    liveFeedAvailable: false,
    dataMode: 'demonstration-and-community',
    timestamp: new Date().toISOString(),
  });
}

export function getStations(req: Request, res: Response) {
  const q = sanitizeString(req.query.q, 80).toLowerCase();
  const stations = q
    ? SEED_STATIONS.filter(
        (s) =>
          s.station_name.toLowerCase().includes(q) ||
          s.zone.toLowerCase().includes(q) ||
          s.aliases.some((a) => a.toLowerCase().includes(q))
      )
    : SEED_STATIONS;

  res.json({
    stations,
    source: 'DEMO DATA',
    lastUpdated: new Date().toISOString(),
  });
}

export function getRoutes(_req: Request, res: Response) {
  const stationMap = new Map(SEED_STATIONS.map((s) => [s.id, s.station_name]));
  const routes = SEED_ROUTES.map((r) => ({
    ...r,
    origin_name: stationMap.get(r.origin_id) ?? r.origin_id,
    destination_name: stationMap.get(r.destination_id) ?? r.destination_id,
  }));

  res.json({
    routes,
    transportUpdates: SEED_TRANSPORT_UPDATES,
    stationCrowdSummaries: listAllStationSummaries(),
    liveDataAvailable: false,
    notice:
      'Live transport updates are currently unavailable. Showing clearly labelled demonstration and community-reported route data.',
    lastUpdated: new Date().toISOString(),
  });
}

export function postRecommendations(req: Request, res: Response) {
  const body = req.body ?? {};
  const origin = sanitizeString(body.origin);
  const destination = sanitizeString(body.destination);

  if (!origin || !destination) {
    throw new ApiError(400, 'Please enter a valid starting point and destination.');
  }

  if (body.simulateApiError === true) {
    throw new ApiError(503, 'Transport data could not be retrieved. Please try again.');
  }

  const rawMode = sanitizeString(body.transportMode || 'mixed').toLowerCase();
  const transportMode: TransportMode = VALID_MODES.includes(rawMode as TransportMode)
    ? (rawMode as TransportMode)
    : 'mixed';

  const rawPref = sanitizeString(body.preference || 'balanced').toLowerCase();
  const preference: TravelPreference = VALID_PREFERENCES.includes(rawPref as TravelPreference)
    ? (rawPref as TravelPreference)
    : 'balanced';

  let delayMinutes: number | 'unknown' = 0;
  if (body.delayMinutes === 'unknown' || body.delayMinutes === null || body.delayMinutes === '') {
    delayMinutes = 'unknown';
  } else {
    const parsed = Number(body.delayMinutes);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 300) {
      throw new ApiError(
        400,
        'Delay minutes must be between 0 and 300, or marked as unknown.'
      );
    }
    delayMinutes = Math.round(parsed);
  }

  const result = generateRecommendations({
    origin,
    destination,
    transportMode,
    delayMinutes,
    preference,
    simulateOffline: Boolean(body.simulateOffline),
  });

  res.json(result);
}

export function postCrowdReport(req: Request, res: Response) {
  const body = req.body ?? {};
  const stationId = sanitizeString(body.stationId, 60);
  const stationName = sanitizeString(body.stationName, 100);
  const crowdLevel = sanitizeString(body.crowdLevel, 30);
  const note = sanitizeString(body.note, 140);

  if (!stationId && !stationName) {
    throw new ApiError(400, 'Please select or enter a station or bus stop name.');
  }

  if (!VALID_CROWD_LEVELS.includes(crowdLevel as Exclude<CrowdLevel, 'Unknown'>)) {
    throw new ApiError(
      400,
      'Crowd level must be one of: Low, Moderate, High, or Very High.'
    );
  }

  const outcome = submitCrowdReport({
    stationId: stationId || undefined,
    stationName: stationName || stationId,
    crowdLevel: crowdLevel as Exclude<CrowdLevel, 'Unknown'>,
    note: note || undefined,
  });

  res.status(201).json({
    message: 'Crowd report submitted.',
    ...outcome,
  });
}

export function getCrowdReportsByStation(req: Request, res: Response) {
  const stationId = sanitizeString(req.params.stationId, 80);
  if (!stationId) {
    throw new ApiError(400, 'Station identifier is required.');
  }

  const summary = getAggregatedCrowdForStation(stationId);
  res.json(summary);
}

export function getAllCrowdSummaries(_req: Request, res: Response) {
  res.json({
    summaries: listAllStationSummaries(),
    disclaimer:
      'Community crowd reports are user-submitted and may not represent actual conditions.',
    lastUpdated: new Date().toISOString(),
  });
}
