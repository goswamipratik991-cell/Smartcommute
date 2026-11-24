import type { CrowdLevel, TravelPreference } from '../models/types.ts';

export interface PreferenceWeights {
  travelEfficiency: number;
  crowdComfort: number;
  reliability: number;
  transferConvenience: number;
}

export const PREFERENCE_WEIGHTS: Record<TravelPreference, PreferenceWeights> = {
  fastest: {
    travelEfficiency: 0.70,
    crowdComfort: 0.0,
    reliability: 0.20,
    transferConvenience: 0.10,
  },
  'least-crowded': {
    travelEfficiency: 0.0,
    crowdComfort: 0.60,
    reliability: 0.20,
    transferConvenience: 0.20,
  },
  balanced: {
    travelEfficiency: 0.40,
    crowdComfort: 0.35,
    reliability: 0.15,
    transferConvenience: 0.10,
  },
};

export const CROWD_COMFORT_SCORES: Record<CrowdLevel, number> = {
  Low: 96,
  Moderate: 70,
  High: 36,
  'Very High': 12,
  // Unknown crowd must never be automatically classified as Low.
  // Assign a conservative uncertain score and surface an explicit warning.
  Unknown: 38,
};

export const CROWD_NUMERIC_SEVERITY: Record<Exclude<CrowdLevel, 'Unknown'>, number> = {
  Low: 1,
  Moderate: 2,
  High: 3,
  'Very High': 4,
};

export const SCORING_CONSTANTS = {
  STALE_REPORT_THRESHOLD_MINUTES: 45,
  RECENCY_HALF_LIFE_MINUTES: 25,
  CONFLICT_SPREAD_THRESHOLD: 2,
  MAX_REFERENCE_DURATION_MINUTES: 95,
  MIN_REFERENCE_DURATION_MINUTES: 15,
};
