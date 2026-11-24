export type TransportMode = 'train' | 'bus' | 'mixed';
export type TravelPreference = 'fastest' | 'least-crowded' | 'balanced';
export type CrowdLevel = 'Low' | 'Moderate' | 'High' | 'Very High' | 'Unknown';

export type DataSource =
  | 'LIVE VERIFIED'
  | 'USER REPORTED'
  | 'ESTIMATED'
  | 'DEMO DATA'
  | 'DATA UNAVAILABLE';

export type RecommendationLabel =
  | 'BEST OVERALL'
  | 'FASTEST OPTION'
  | 'MOST COMFORTABLE'
  | 'BALANCED CHOICE';

export interface Station {
  id: string;
  station_name: string;
  aliases: string[];
  latitude: number;
  longitude: number;
  transport_type: TransportMode[];
  zone: string;
}

export interface RouteCoordinate {
  name: string;
  latitude: number;
  longitude: number;
}

export interface SeedRoute {
  id: string;
  route_name: string;
  origin_id: string;
  destination_id: string;
  transport_type: TransportMode;
  intermediate_stops: string[];
  base_duration_minutes: number;
  estimated_wait_minutes: number | null;
  transfers: number;
  reliability_score: number; // 0-100
  data_source: DataSource;
  route_status: string;
  affected_by_origin_delay: boolean;
  default_crowd_level: CrowdLevel;
  crowd_station_ref: string | null; // station id whose crowd reports influence this route
  geometry_available: boolean;
  coordinates: RouteCoordinate[];
  schedule_note: string;
}

export interface CrowdReport {
  id: string;
  station_id: string;
  station_name: string;
  crowd_level: Exclude<CrowdLevel, 'Unknown'>;
  submitted_at: string; // ISO string
  source: 'USER REPORTED' | 'DEMO DATA';
  note?: string;
}

export interface AggregatedCrowd {
  station_id: string;
  station_name: string;
  crowd_level: CrowdLevel;
  source: DataSource;
  report_count: number;
  latest_report_at: string | null;
  is_stale: boolean;
  has_conflict: boolean;
  conflict_message: string | null;
  confidence_score: number;
  disclaimer: string;
  recent_reports: CrowdReport[];
}

export interface TransportUpdate {
  id: string;
  route_id: string;
  corridor_name: string;
  transport_type: TransportMode;
  delay_minutes: number;
  status_summary: string;
  source: DataSource;
  updated_at: string;
  confidence: number;
}

export interface RecommendationRequest {
  origin: string;
  destination: string;
  transportMode: TransportMode;
  delayMinutes: number | 'unknown';
  preference: TravelPreference;
  simulateOffline?: boolean;
  simulateApiError?: boolean;
}

export interface ScoreBreakdown {
  travelEfficiency: number;
  crowdComfort: number;
  reliability: number;
  transferConvenience: number;
  weights: {
    travelEfficiency: number;
    crowdComfort: number;
    reliability: number;
    transferConvenience: number;
  };
}

export interface ScoredRoute {
  id: string;
  routeName: string;
  transportType: TransportMode;
  originName: string;
  destinationName: string;
  intermediateStops: string[];
  estimatedTotalMinutes: number;
  estimatedWaitMinutes: number | null;
  delayAdjustedImpactMinutes: number;
  crowdLevel: CrowdLevel;
  crowdSource: DataSource;
  crowdConflict: boolean;
  crowdStale: boolean;
  transfers: number;
  reliability: number;
  dataSource: DataSource;
  routeStatus: string;
  scheduleNote: string;
  recommendationScore: number;
  scoreBreakdown: ScoreBreakdown;
  label: RecommendationLabel;
  isTopPick: boolean;
  explanation: string;
  warnings: string[];
  geometryAvailable: boolean;
  coordinates: RouteCoordinate[];
  lastUpdated: string;
}

export interface RecommendationResponse {
  query: {
    origin: string;
    destination: string;
    originStationId: string | null;
    destinationStationId: string | null;
    transportMode: TransportMode;
    delayMinutes: number | 'unknown';
    preference: TravelPreference;
  };
  liveDataAvailable: boolean;
  systemNotices: string[];
  recommendations: ScoredRoute[];
  generatedAt: string;
  disclaimer: string;
}
