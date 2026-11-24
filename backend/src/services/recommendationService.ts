import {
  CROWD_COMFORT_SCORES,
  PREFERENCE_WEIGHTS,
  SCORING_CONSTANTS,
} from '../config/scoring.ts';
import type {
  CrowdLevel,
  DataSource,
  RecommendationLabel,
  RecommendationRequest,
  RecommendationResponse,
  ScoredRoute,
  SeedRoute,
  Station,
  TransportMode,
  TravelPreference,
} from '../models/types.ts';
import { SEED_ROUTES, SEED_STATIONS } from '../utils/seedData.ts';
import { getAggregatedCrowdForStation, resolveStation } from './crowdService.ts';

function haversineKm(a: Station, b: Station): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function clamp(val: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, val));
}

function reverseRouteIfNeeded(route: SeedRoute, originId: string): SeedRoute {
  if (route.origin_id === originId) return route;
  return {
    ...route,
    origin_id: route.destination_id,
    destination_id: route.origin_id,
    intermediate_stops: [...route.intermediate_stops].reverse(),
    coordinates: [...route.coordinates].reverse(),
  };
}

function synthesizeFallbackRoutes(origin: Station, destination: Station): SeedRoute[] {
  const distKm = Math.max(2.5, haversineKm(origin, destination));
  const busMins = Math.round(clamp(16 + distKm * 3.1, 18, 85));
  const mixedMins = Math.round(clamp(14 + distKm * 2.4, 16, 72));
  const trainMins = Math.round(clamp(15 + distKm * 2.1, 15, 68));

  const hub = SEED_STATIONS.find((s) => s.id === 'st-esplanade') ?? SEED_STATIONS[0];

  const synthesized: SeedRoute[] = [
    {
      id: `est-mixed-${origin.id}-${destination.id}`,
      route_name: `${origin.station_name}–${hub.station_name}–${destination.station_name} Mixed Connector`,
      origin_id: origin.id,
      destination_id: destination.id,
      transport_type: 'mixed',
      intermediate_stops: [origin.station_name, hub.station_name, destination.station_name],
      base_duration_minutes: mixedMins,
      estimated_wait_minutes: 6,
      transfers: 1,
      reliability_score: 72,
      data_source: 'ESTIMATED',
      route_status: 'Estimated multimodal corridor via central interchange',
      affected_by_origin_delay: false,
      default_crowd_level: 'Moderate',
      crowd_station_ref: hub.id,
      geometry_available: false,
      coordinates: [
        { name: origin.station_name, latitude: origin.latitude, longitude: origin.longitude },
        { name: destination.station_name, latitude: destination.latitude, longitude: destination.longitude },
      ],
      schedule_note: 'Schedule unavailable; duration estimated from corridor distance.',
    },
    {
      id: `est-bus-${origin.id}-${destination.id}`,
      route_name: `${origin.station_name}–${destination.station_name} Direct Bus Estimate`,
      origin_id: origin.id,
      destination_id: destination.id,
      transport_type: 'bus',
      intermediate_stops: [origin.station_name, destination.station_name],
      base_duration_minutes: busMins,
      estimated_wait_minutes: 8,
      transfers: 0,
      reliability_score: 68,
      data_source: 'ESTIMATED',
      route_status: 'Estimated surface bus corridor; traffic variability applies',
      affected_by_origin_delay: false,
      default_crowd_level: 'Low',
      crowd_station_ref: origin.id,
      geometry_available: false,
      coordinates: [
        { name: origin.station_name, latitude: origin.latitude, longitude: origin.longitude },
        { name: destination.station_name, latitude: destination.latitude, longitude: destination.longitude },
      ],
      schedule_note: 'Live bus timetable unavailable; headway estimated.',
    },
  ];

  if (origin.transport_type.includes('train') && destination.transport_type.includes('train')) {
    synthesized.push({
      id: `est-train-${origin.id}-${destination.id}`,
      route_name: `${origin.station_name}–${destination.station_name} Suburban Rail Corridor`,
      origin_id: origin.id,
      destination_id: destination.id,
      transport_type: 'train',
      intermediate_stops: [origin.station_name, destination.station_name],
      base_duration_minutes: trainMins,
      estimated_wait_minutes: null,
      transfers: 1,
      reliability_score: 70,
      data_source: 'ESTIMATED',
      route_status: 'Estimated rail corridor; subject to origin junction delays',
      affected_by_origin_delay: true,
      default_crowd_level: 'Unknown',
      crowd_station_ref: null,
      geometry_available: false,
      coordinates: [
        { name: origin.station_name, latitude: origin.latitude, longitude: origin.longitude },
        { name: destination.station_name, latitude: destination.latitude, longitude: destination.longitude },
      ],
      schedule_note: 'Official railway departure schedule unavailable.',
    });
  }

  return synthesized;
}

function buildExplanation(
  route: SeedRoute,
  crowdLevel: CrowdLevel,
  totalMinutes: number,
  preference: TravelPreference,
  delayMinutes: number | 'unknown',
  isFastest: boolean,
  isMostComfortable: boolean
): string {
  const parts: string[] = [];

  if (preference === 'least-crowded') {
    if (crowdLevel === 'Low') {
      parts.push(
        'Recommended because this route has lower reported crowd levels and avoids peak platform congestion'
      );
    } else if (crowdLevel === 'Moderate') {
      parts.push(
        'Offers moderate crowding with manageable transfer conditions compared to congested mainline platforms'
      );
    } else if (crowdLevel === 'Unknown') {
      parts.push(
        'Crowd telemetry is currently unavailable for this corridor, so comfort cannot be verified'
      );
    } else {
      parts.push(
        `Carries ${crowdLevel.toLowerCase()} reported crowd density, reducing its comfort ranking`
      );
    }
  } else if (preference === 'fastest') {
    if (isFastest) {
      parts.push(
        `Recommended as the quickest available option at an estimated ${totalMinutes} minutes`
      );
    } else {
      parts.push(`Estimated ${totalMinutes} minutes total travel time`);
    }
  } else {
    parts.push(
      `Balances an estimated ${totalMinutes}-minute journey with ${crowdLevel.toLowerCase()} crowd conditions and ${route.transfers} transfer${route.transfers === 1 ? '' : 's'}`
    );
  }

  if (typeof delayMinutes === 'number' && delayMinutes > 0 && !route.affected_by_origin_delay) {
    parts.push(`and bypasses the ${delayMinutes}-minute origin disruption`);
  } else if (typeof delayMinutes === 'number' && delayMinutes > 0 && route.affected_by_origin_delay) {
    parts.push(`though mainline delays add an estimated impact`);
  }

  if (isMostComfortable && preference !== 'least-crowded' && crowdLevel === 'Low') {
    parts.push('with notably calmer onboard conditions');
  }

  return `${parts.join(' ')}.`;
}

export function generateRecommendations(req: RecommendationRequest): RecommendationResponse {
  const originStation = resolveStation(req.origin);
  const destinationStation = resolveStation(req.destination);
  const nowIso = new Date().toISOString();

  const systemNotices: string[] = [];

  // Live API is honestly not connected in prototype
  const liveDataAvailable = false;
  if (req.simulateOffline || !liveDataAvailable) {
    systemNotices.push(
      'Live transport updates are currently unavailable. Showing available route information instead.'
    );
  }

  if (req.delayMinutes === 'unknown') {
    systemNotices.push(
      'Reported delay is marked as unknown. Estimated travel durations reflect baseline corridor conditions.'
    );
  }

  if (!originStation || !destinationStation) {
    return {
      query: {
        origin: req.origin.trim(),
        destination: req.destination.trim(),
        originStationId: originStation?.id ?? null,
        destinationStationId: destinationStation?.id ?? null,
        transportMode: req.transportMode,
        delayMinutes: req.delayMinutes,
        preference: req.preference,
      },
      liveDataAvailable,
      systemNotices: [
        ...systemNotices,
        'No verified alternative routes are currently available. Try changing your travel preference or checking again later.',
      ],
      recommendations: [],
      generatedAt: nowIso,
      disclaimer:
        'Demonstration & community-reported data only. Official railway and bus schedules are not connected.',
    };
  }

  if (originStation.id === destinationStation.id) {
    return {
      query: {
        origin: originStation.station_name,
        destination: destinationStation.station_name,
        originStationId: originStation.id,
        destinationStationId: destinationStation.id,
        transportMode: req.transportMode,
        delayMinutes: req.delayMinutes,
        preference: req.preference,
      },
      liveDataAvailable,
      systemNotices: [
        'Starting point and destination resolve to the same hub. Please select two distinct locations.',
      ],
      recommendations: [],
      generatedAt: nowIso,
      disclaimer:
        'Demonstration & community-reported data only. Official railway and bus schedules are not connected.',
    };
  }

  // Find direct or reverse pre-seeded routes
  let candidateRoutes = SEED_ROUTES.filter(
    (r) =>
      (r.origin_id === originStation.id && r.destination_id === destinationStation.id) ||
      (r.origin_id === destinationStation.id && r.destination_id === originStation.id)
  ).map((r) => reverseRouteIfNeeded(r, originStation.id));

  if (candidateRoutes.length === 0) {
    candidateRoutes = synthesizeFallbackRoutes(originStation, destinationStation);
  }

  // Mode filtering: keep all options if 'mixed'; if specific mode, prioritize matching mode
  // and retain backup modes when needed so commuters always see viable disruption alternatives
  let filteredRoutes = candidateRoutes;
  if (req.transportMode !== 'mixed') {
    const exactMode = candidateRoutes.filter((r) => r.transport_type === req.transportMode);
    const backupModes = candidateRoutes.filter((r) => r.transport_type !== req.transportMode);
    if (exactMode.length >= 3) {
      filteredRoutes = exactMode;
    } else if (exactMode.length > 0) {
      filteredRoutes = [...exactMode, ...backupModes];
      systemNotices.push(
        `Fewer than 3 ${req.transportMode} routes exist on this corridor; cross-mode backup alternatives are included.`
      );
    } else {
      filteredRoutes = candidateRoutes;
      systemNotices.push(
        `No direct ${req.transportMode}-only backup found; showing multimodal alternatives instead.`
      );
    }
  }

  const weights = PREFERENCE_WEIGHTS[req.preference];

  const preliminary = filteredRoutes.map((route) => {
    const delayImpact =
      typeof req.delayMinutes === 'number' && req.delayMinutes > 0 && route.affected_by_origin_delay
        ? Math.round(req.delayMinutes * 0.85)
        : 0;

    const waitMinutes = route.estimated_wait_minutes ?? 6;
    const totalMinutes = route.base_duration_minutes + waitMinutes + delayImpact;

    // Resolve crowd data from community reports or fallback
    let crowdLevel: CrowdLevel = route.default_crowd_level;
    let crowdSource: DataSource = route.data_source;
    let crowdConflict = false;
    let crowdStale = false;
    let latestUpdate = nowIso;
    const warnings: string[] = [];

    if (route.crowd_station_ref) {
      const agg = getAggregatedCrowdForStation(route.crowd_station_ref);
      if (agg.report_count > 0) {
        crowdLevel = agg.crowd_level;
        crowdSource = agg.source;
        crowdConflict = agg.has_conflict;
        crowdStale = agg.is_stale;
        latestUpdate = agg.latest_report_at ?? nowIso;

        if (agg.has_conflict && agg.conflict_message) {
          warnings.push(agg.conflict_message);
        }
        if (agg.is_stale) {
          warnings.push(
            `Latest crowd report is over ${SCORING_CONSTANTS.STALE_REPORT_THRESHOLD_MINUTES} minutes old and may be outdated.`
          );
        }
      }
    }

    if (crowdLevel === 'Unknown') {
      crowdSource = 'DATA UNAVAILABLE';
      warnings.push(
        'Crowd information unavailable. This route cannot be ranked by current crowd conditions.'
      );
    }

    if (!route.geometry_available) {
      warnings.push('Route geometry unavailable; map displays verified endpoint markers only.');
    }

    if (req.transportMode !== 'mixed' && route.transport_type !== req.transportMode) {
      warnings.push(
        `Alternative ${route.transport_type} option included to bypass single-mode disruption.`
      );
    }

    // Normalized subscores (0 - 100)
    const durationSpan =
      SCORING_CONSTANTS.MAX_REFERENCE_DURATION_MINUTES -
      SCORING_CONSTANTS.MIN_REFERENCE_DURATION_MINUTES;
    const travelEfficiency = Math.round(
      clamp(
        100 -
          ((totalMinutes - SCORING_CONSTANTS.MIN_REFERENCE_DURATION_MINUTES) / durationSpan) * 85,
        15,
        98
      )
    );

    let crowdComfort = CROWD_COMFORT_SCORES[crowdLevel];
    if (crowdConflict) {
      crowdComfort = Math.max(20, crowdComfort - 10);
    }

    const reliability = Math.round(
      clamp(
        route.reliability_score -
          (crowdConflict ? 8 : 0) -
          (crowdStale ? 6 : 0) -
          (delayImpact > 15 ? 10 : 0),
        25,
        98
      )
    );

    const transferConvenience = Math.round(clamp(100 - route.transfers * 22, 30, 100));

    // When preference is least-crowded and crowd is Unknown, ensure verified Low/Moderate routes outrank Unknown
    const unknownPenalty =
      req.preference === 'least-crowded' && crowdLevel === 'Unknown' ? 12 : 0;

    const rawScore =
      travelEfficiency * weights.travelEfficiency +
      crowdComfort * weights.crowdComfort +
      reliability * weights.reliability +
      transferConvenience * weights.transferConvenience -
      unknownPenalty;

    const recommendationScore = Math.round(clamp(rawScore, 10, 99));

    return {
      route,
      totalMinutes,
      delayImpact,
      crowdLevel,
      crowdSource,
      crowdConflict,
      crowdStale,
      latestUpdate,
      warnings,
      travelEfficiency,
      crowdComfort,
      reliability,
      transferConvenience,
      recommendationScore,
    };
  });

  // Sort highest recommendation score first, tie-break by lower totalMinutes
  preliminary.sort((a, b) => {
    if (b.recommendationScore !== a.recommendationScore) {
      return b.recommendationScore - a.recommendationScore;
    }
    return a.totalMinutes - b.totalMinutes;
  });

  const fastestRouteId = [...preliminary].sort((a, b) => a.totalMinutes - b.totalMinutes)[0]?.route
    .id;
  const comfortRouteId = [...preliminary].sort((a, b) => b.crowdComfort - a.crowdComfort)[0]?.route
    .id;

  const recommendations: ScoredRoute[] = preliminary.map((item, idx) => {
    const isTopPick = idx === 0;
    const isFastest = item.route.id === fastestRouteId;
    const isMostComfortable =
      item.route.id === comfortRouteId && item.crowdLevel !== 'Unknown';

    let label: RecommendationLabel = 'BALANCED CHOICE';
    if (isTopPick) {
      label = 'BEST OVERALL';
    } else if (isFastest) {
      label = 'FASTEST OPTION';
    } else if (isMostComfortable) {
      label = 'MOST COMFORTABLE';
    }

    return {
      id: item.route.id,
      routeName: item.route.route_name,
      transportType: item.route.transport_type,
      originName: originStation.station_name,
      destinationName: destinationStation.station_name,
      intermediateStops: item.route.intermediate_stops,
      estimatedTotalMinutes: item.totalMinutes,
      estimatedWaitMinutes: item.route.estimated_wait_minutes,
      delayAdjustedImpactMinutes: item.delayImpact,
      crowdLevel: item.crowdLevel,
      crowdSource: item.crowdSource,
      crowdConflict: item.crowdConflict,
      crowdStale: item.crowdStale,
      transfers: item.route.transfers,
      reliability: item.reliability,
      dataSource: item.route.data_source,
      routeStatus: item.route.route_status,
      scheduleNote: item.route.schedule_note,
      recommendationScore: item.recommendationScore,
      scoreBreakdown: {
        travelEfficiency: item.travelEfficiency,
        crowdComfort: item.crowdComfort,
        reliability: item.reliability,
        transferConvenience: item.transferConvenience,
        weights: { ...weights },
      },
      label,
      isTopPick,
      explanation: buildExplanation(
        item.route,
        item.crowdLevel,
        item.totalMinutes,
        req.preference,
        req.delayMinutes,
        isFastest,
        isMostComfortable
      ),
      warnings: item.warnings,
      geometryAvailable: item.route.geometry_available,
      coordinates: item.route.coordinates,
      lastUpdated: item.latestUpdate,
    };
  });

  return {
    query: {
      origin: originStation.station_name,
      destination: destinationStation.station_name,
      originStationId: originStation.id,
      destinationStationId: destinationStation.id,
      transportMode: req.transportMode,
      delayMinutes: req.delayMinutes,
      preference: req.preference,
    },
    liveDataAvailable,
    systemNotices,
    recommendations,
    generatedAt: nowIso,
    disclaimer:
      'Demonstration & community-reported data only. Official railway and bus schedules are not connected.',
  };
}
