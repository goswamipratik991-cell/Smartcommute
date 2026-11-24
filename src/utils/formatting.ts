import type { CrowdLevel, DataSource, Station, TransportMode } from '../types/transit';

export function getCrowdMeta(level: CrowdLevel): {
  label: string;
  textClass: string;
  borderClass: string;
  surfaceClass: string;
} {
  switch (level) {
    case 'Low':
      return {
        label: 'Low Crowd',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        borderClass: 'border-emerald-200 dark:border-emerald-800/60',
        surfaceClass: 'bg-emerald-50/70 dark:bg-emerald-950/30',
      };
    case 'Moderate':
      return {
        label: 'Moderate Crowd',
        textClass: 'text-amber-700 dark:text-amber-400',
        borderClass: 'border-amber-200 dark:border-amber-800/60',
        surfaceClass: 'bg-amber-50/70 dark:bg-amber-950/30',
      };
    case 'High':
      return {
        label: 'High Crowd',
        textClass: 'text-orange-700 dark:text-orange-400',
        borderClass: 'border-orange-200 dark:border-orange-800/60',
        surfaceClass: 'bg-orange-50/70 dark:bg-orange-950/30',
      };
    case 'Very High':
      return {
        label: 'Very High Crowd',
        textClass: 'text-red-700 dark:text-red-400',
        borderClass: 'border-red-200 dark:border-red-800/60',
        surfaceClass: 'bg-red-50/70 dark:bg-red-950/30',
      };
    case 'Unknown':
    default:
      return {
        label: 'Unknown Crowd',
        textClass: 'text-slate-600 dark:text-slate-400',
        borderClass: 'border-slate-200 dark:border-slate-700',
        surfaceClass: 'bg-slate-100/70 dark:bg-slate-800/40',
      };
  }
}

export function formatTransportMode(mode: TransportMode): string {
  switch (mode) {
    case 'train':
      return 'Suburban Train';
    case 'bus':
      return 'Bus';
    case 'mixed':
      return 'Mixed Transport';
  }
}

export function formatDataSourceLabel(source: DataSource): string {
  return source;
}

export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'No timestamp';
  const diffMs = Date.now() - Date.parse(isoString);
  if (Number.isNaN(diffMs)) return 'Recently';
  const mins = Math.max(0, Math.round(diffMs / 60_000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(isoString).toLocaleDateString();
}

export function formatClockTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function findNearestStation(
  lat: number,
  lng: number,
  stations: Station[]
): Station | null {
  if (stations.length === 0) return null;
  let best = stations[0];
  let bestDist = Infinity;

  for (const s of stations) {
    const dLat = s.latitude - lat;
    const dLng = s.longitude - lng;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < bestDist) {
      bestDist = dist;
      best = s;
    }
  }
  return best;
}
