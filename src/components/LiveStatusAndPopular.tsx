import {
  ArrowRight,
  Bookmark,
  Clock,
  Info,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import type {
  RoutesOverviewResponse,
  SavedJourney,
  TransportMode,
  TravelPreference,
} from '../types/transit';
import { formatRelativeTime, formatTransportMode } from '../utils/formatting';

interface LiveStatusAndPopularProps {
  overview: RoutesOverviewResponse | null;
  recentSearches: SavedJourney[];
  bookmarkedJourneys: SavedJourney[];
  onQuickLaunch: (params: {
    origin: string;
    destination: string;
    transportMode: TransportMode;
    delayMinutes: number;
    preference: TravelPreference;
  }) => void;
  onClearRecents: () => void;
  onRefreshOverview: () => void;
}

const POPULAR_CORRIDORS: Array<{
  title: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  typicalDelay: number;
  note: string;
}> = [
  {
    title: 'Howrah Junction → Sealdah',
    origin: 'Howrah Junction',
    destination: 'Sealdah',
    mode: 'mixed',
    typicalDelay: 20,
    note: '4 corridors across East-West link, MG Road express bus & suburban ring',
  },
  {
    title: 'Howrah Junction → Salt Lake Sector V',
    origin: 'Howrah Junction',
    destination: 'Salt Lake Sector V',
    mode: 'mixed',
    typicalDelay: 15,
    note: 'Office-hour IT hub backups avoiding congested junction platforms',
  },
  {
    title: 'Sealdah → New Garia',
    origin: 'Sealdah',
    destination: 'New Garia',
    mode: 'mixed',
    typicalDelay: 15,
    note: 'South Suburban rail vs EM Bypass bus & Metro interchange options',
  },
  {
    title: 'Dum Dum Junction → Ballygunge',
    origin: 'Dum Dum Junction',
    destination: 'Ballygunge',
    mode: 'mixed',
    typicalDelay: 10,
    note: 'North-to-South chord alternatives bypassing Sealdah bottlenecks',
  },
];

export function LiveStatusAndPopular({
  overview,
  recentSearches,
  bookmarkedJourneys,
  onQuickLaunch,
  onClearRecents,
  onRefreshOverview,
}: LiveStatusAndPopularProps) {
  return (
    <div className="space-y-14">
      {/* Recent Searches & Saved Bookmarks (if user has any) */}
      {(recentSearches.length > 0 || bookmarkedJourneys.length > 0) && (
        <section aria-label="Saved and recent journeys" className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {bookmarkedJourneys.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <Bookmark className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Favourite Commute Routes
                </h3>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                {bookmarkedJourneys.map((item) => (
                  <li key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.origin} → {item.destination}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTransportMode(item.transportMode)} ·{' '}
                        {item.preference.replace('-', ' ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onQuickLaunch({
                          origin: item.origin,
                          destination: item.destination,
                          transportMode: item.transportMode,
                          delayMinutes:
                            typeof item.delayMinutes === 'number' ? item.delayMinutes : 15,
                          preference: item.preference,
                        })
                      }
                      className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                    >
                      Check Now
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recentSearches.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Recent Searches
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClearRecents}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                {recentSearches.slice(0, 4).map((item) => (
                  <li key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {item.origin} → {item.destination}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTransportMode(item.transportMode)} ·{' '}
                        {formatRelativeTime(item.timestamp)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onQuickLaunch({
                          origin: item.origin,
                          destination: item.destination,
                          transportMode: item.transportMode,
                          delayMinutes:
                            typeof item.delayMinutes === 'number' ? item.delayMinutes : 15,
                          preference: item.preference,
                        })
                      }
                      className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Re-run
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Commute Status Overview (Honest Demo & Community Feed) */}
      <section id="live-status" aria-label="Corridor disruption status">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Corridor Disruption Monitor
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Simulated transit status feed demonstrating how SmartCommute separates verified live
              data from demonstration scenarios.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefreshOverview}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Status
          </button>
        </div>

        {overview && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>{overview.notice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(overview?.transportUpdates ?? []).map((u) => {
            const isDelayed = u.delay_minutes >= 15;
            const isMinor = u.delay_minutes > 0 && u.delay_minutes < 15;
            return (
              <div
                key={u.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {formatTransportMode(u.transport_type)} · {u.source}
                  </span>
                  <span className="font-mono-tabular">
                    {formatRelativeTime(u.updated_at)}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-base font-bold text-slate-900 dark:text-white">
                  {u.corridor_name}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {u.status_summary}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span
                    className={`font-semibold ${
                      isDelayed
                        ? 'text-red-600 dark:text-red-400'
                        : isMinor
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {u.delay_minutes === 0
                      ? 'Nominal operation (0 min delay)'
                      : `Reported delay: ${u.delay_minutes} min`}
                  </span>
                  <span className="font-mono-tabular text-slate-500">
                    Confidence {u.confidence}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Popular Commute Routes */}
      <section aria-label="Popular commute corridors">
        <div className="mb-5">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Popular Commute Corridors
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Select a high-frequency corridor to immediately evaluate backup routes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {POPULAR_CORRIDORS.map((corridor) => (
            <button
              key={corridor.title}
              type="button"
              onClick={() =>
                onQuickLaunch({
                  origin: corridor.origin,
                  destination: corridor.destination,
                  transportMode: corridor.mode,
                  delayMinutes: corridor.typicalDelay,
                  preference: 'least-crowded',
                })
              }
              className="group text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-blue-600 dark:hover:border-blue-500 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {corridor.title}
                </h3>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                {corridor.note}
              </p>
              <p className="mt-3 text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                Test with {corridor.typicalDelay} min delay · Least Crowded
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        aria-label="How SmartCommute works"
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8"
      >
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          How SmartCommute Evaluates Alternatives
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Instead of guessing on a crowded platform, every alternative is scored transparently on a
          0–100 scale using configurable weights and honest source indicators.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              01. Input Your Disruption
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Enter your starting station or stop, destination, transport mode, and the current
              delay—even if the exact delay is unknown.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              02. Weighted Multi-Factor Scoring
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Fastest prioritizes travel time (70%); Least Crowded prioritizes crowd comfort (60%);
              Balanced weighs speed (40%), comfort (35%), reliability (15%), and transfers (10%).
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              03. Honest Fallback & Map View
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Unknown crowd levels are never treated as Low, conflicting reports trigger uncertainty
              warnings, and missing route geometry shows station markers without fake lines.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
