import {
  ArrowUpDown,
  Bus,
  Clock,
  Compass,
  Loader2,
  MapPin,
  Navigation,
  Scale,
  Shuffle,
  TrainFront,
  Users,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import type {
  RecommendationRequest,
  Station,
  TransportMode,
  TravelPreference,
} from '../types/transit';
import { findNearestStation } from '../utils/formatting';

interface RoutePlannerFormProps {
  stations: Station[];
  origin: string;
  destination: string;
  transportMode: TransportMode;
  delayInput: string;
  isUnknownDelay: boolean;
  preference: TravelPreference;
  isLoading: boolean;
  formError: string | null;
  onOriginChange: (val: string) => void;
  onDestinationChange: (val: string) => void;
  onTransportModeChange: (mode: TransportMode) => void;
  onDelayPresetSelect: (value: string, unknown: boolean) => void;
  onDelayInputChange: (val: string) => void;
  onPreferenceChange: (pref: TravelPreference) => void;
  onSubmit: (req: RecommendationRequest) => void;
  onLoadDemoScenario: () => void;
}

const DELAY_PRESETS: Array<{ label: string; value: string; unknown?: boolean }> = [
  { label: 'No delay', value: '0' },
  { label: '5–15 min', value: '10' },
  { label: '15–30 min', value: '20' },
  { label: '30–45 min', value: '38' },
  { label: '45+ min', value: '50' },
  { label: 'Unknown', value: 'unknown', unknown: true },
];

const PREFERENCE_OPTIONS: Array<{
  id: TravelPreference;
  title: string;
  description: string;
  weightHint: string;
  Icon: typeof Zap;
}> = [
  {
    id: 'fastest',
    title: 'Fastest',
    description: 'Prioritizes lowest estimated journey duration and minimal waiting.',
    weightHint: '70% Speed · 20% Reliability · 10% Transfers',
    Icon: Zap,
  },
  {
    id: 'least-crowded',
    title: 'Least Crowded',
    description: 'Prioritizes calmer platforms, lower crowd density, and comfortable transfers.',
    weightHint: '60% Comfort · 20% Reliability · 20% Transfers',
    Icon: Users,
  },
  {
    id: 'balanced',
    title: 'Balanced',
    description: 'Combines travel time, crowd conditions, and transfer convenience.',
    weightHint: '40% Speed · 35% Comfort · 15% Reliability · 10% Transfers',
    Icon: Scale,
  },
];

export function RoutePlannerForm({
  stations,
  origin,
  destination,
  transportMode,
  delayInput,
  isUnknownDelay,
  preference,
  isLoading,
  formError,
  onOriginChange,
  onDestinationChange,
  onTransportModeChange,
  onDelayPresetSelect,
  onDelayInputChange,
  onPreferenceChange,
  onSubmit,
  onLoadDemoScenario,
}: RoutePlannerFormProps) {
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleSwap = () => {
    const prevOrigin = origin;
    onOriginChange(destination);
    onDestinationChange(prevOrigin);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Location detection is not supported in this browser.');
      return;
    }

    setIsLocating(true);
    setGeoStatus(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const nearest = findNearestStation(
          pos.coords.latitude,
          pos.coords.longitude,
          stations
        );
        if (nearest) {
          onOriginChange(nearest.station_name);
          setGeoStatus(`Nearest demo hub detected: ${nearest.station_name}`);
        } else {
          setGeoStatus('Coordinates captured, but no nearby hub matched.');
        }
      },
      () => {
        setIsLocating(false);
        setGeoStatus('Location access was declined or unavailable. Please enter your stop manually.');
      },
      { timeout: 6000 }
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const delayMinutes: number | 'unknown' = isUnknownDelay
      ? 'unknown'
      : delayInput.trim() === ''
        ? 0
        : Number(delayInput);

    onSubmit({
      origin,
      destination,
      transportMode,
      delayMinutes,
      preference,
    });
  };

  return (
    <form
      id="planner"
      onSubmit={handleFormSubmit}
      noValidate
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            Plan Backup Route
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Enter your disrupted route details to compare alternative paths.
          </p>
        </div>

        <button
          type="button"
          onClick={onLoadDemoScenario}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Compass className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          Load Howrah → Sealdah Demo
        </button>
      </div>

      {/* Station datalist for searchable autocomplete while permitting manual entry */}
      <datalist id="smartcommute-stations">
        {stations.map((s) => (
          <option key={s.id} value={s.station_name}>
            {s.zone}
          </option>
        ))}
      </datalist>

      {/* Origin & Destination row */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label
              htmlFor="origin-input"
              className="text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Starting Point
            </label>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <Navigation className="h-3 w-3" />
              {isLocating ? 'Locating…' : 'Detect location'}
            </button>
          </div>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="origin-input"
              type="text"
              list="smartcommute-stations"
              value={origin}
              onChange={(e) => onOriginChange(e.target.value)}
              placeholder="e.g., Howrah Junction"
              aria-required="true"
              className="w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>

        <div className="flex justify-center md:pb-1">
          <button
            type="button"
            onClick={handleSwap}
            aria-label="Swap starting point and destination"
            title="Swap starting point and destination"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label
            htmlFor="destination-input"
            className="block mb-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            Destination
          </label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600 dark:text-blue-400" />
            <input
              id="destination-input"
              type="text"
              list="smartcommute-stations"
              value={destination}
              onChange={(e) => onDestinationChange(e.target.value)}
              placeholder="e.g., Sealdah"
              aria-required="true"
              className="w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>
      </div>

      {geoStatus && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400" role="status">
          {geoStatus}
        </p>
      )}

      {/* Transport Type & Current Delay */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <span className="block mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            Transport Type
          </span>
          <div
            role="group"
            aria-label="Transport Type"
            className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 dark:bg-slate-950 p-1.5 border border-slate-200 dark:border-slate-800"
          >
            {[
              { id: 'train' as TransportMode, label: 'Suburban Train', Icon: TrainFront },
              { id: 'bus' as TransportMode, label: 'Bus', Icon: Bus },
              { id: 'mixed' as TransportMode, label: 'Mixed', Icon: Shuffle },
            ].map(({ id, label, Icon }) => {
              const active = transportMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onTransportModeChange(id)}
                  className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Current Reported Delay
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Select range or enter exact minutes
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DELAY_PRESETS.map((preset) => {
              const active = preset.unknown
                ? isUnknownDelay
                : !isUnknownDelay && delayInput === preset.value;
              return (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onDelayPresetSelect(preset.value, Boolean(preset.unknown))}
                  className={`min-h-[38px] rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
            <div className="relative flex items-center">
              <Clock className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="number"
                min={0}
                max={300}
                aria-label="Manual delay in minutes"
                value={isUnknownDelay ? '' : delayInput}
                onChange={(e) => onDelayInputChange(e.target.value)}
                placeholder="Min"
                className="w-24 min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-7 pr-2.5 py-1.5 text-xs font-mono-tabular text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Travel Preference Cards */}
      <div className="mt-6">
        <span className="block mb-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
          Travel Preference
        </span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PREFERENCE_OPTIONS.map(({ id, title, description, weightHint, Icon }) => {
            const active = preference === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => onPreferenceChange(id)}
                className={`text-left rounded-xl border p-4 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  active
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/35 ring-1 ring-blue-600'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                    {title}
                  </span>
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                    }`}
                  />
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {description}
                </p>
                <p className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                  {weightHint}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Validation Error */}
      {formError && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300"
        >
          {formError}
        </div>
      )}

      {/* Submit Action */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Transparent scoring across demonstration corridors and community crowd reports.
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:translate-y-px disabled:opacity-60 transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Evaluating Alternatives…
            </>
          ) : (
            'Find Alternative'
          )}
        </button>
      </div>
    </form>
  );
}
