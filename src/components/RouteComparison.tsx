import { CheckCircle2, Users } from 'lucide-react';
import type { ScoredRoute } from '../types/transit';
import { formatTransportMode, getCrowdMeta } from '../utils/formatting';

interface RouteComparisonProps {
  routes: ScoredRoute[];
  chosenRouteId: string | null;
  onChooseRoute: (route: ScoredRoute) => void;
  onViewRouteOnMap: (routeId: string) => void;
}

export function RouteComparison({
  routes,
  chosenRouteId,
  onChooseRoute,
  onViewRouteOnMap,
}: RouteComparisonProps) {
  if (routes.length === 0) return null;

  return (
    <section
      id="route-comparison"
      aria-label="Side-by-side route comparison"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
    >
      <div className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
        <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Side-by-Side Route Comparison
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Compare journey duration, crowd conditions, transfers, and reliability across evaluated alternatives.
        </p>
      </div>

      {/* Desktop Structured Comparison Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <th className="py-3.5 px-5 w-44">Metric</th>
              {routes.map((route) => (
                <th key={route.id} className="py-3.5 px-4 align-top">
                  <div className="text-[11px] font-semibold tracking-wide text-blue-600 dark:text-blue-400">
                    {route.label}
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {route.routeName}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            <tr>
              <td className="py-3 px-5 font-medium text-slate-600 dark:text-slate-400">
                Transport Mode
              </td>
              {routes.map((r) => (
                <td key={r.id} className="py-3 px-4 text-slate-900 dark:text-slate-100">
                  {formatTransportMode(r.transportType)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-5 font-medium text-slate-600 dark:text-slate-400">
                Est. Journey Time
              </td>
              {routes.map((r) => (
                <td key={r.id} className="py-3 px-4 font-mono-tabular font-semibold text-slate-900 dark:text-white">
                  {r.estimatedTotalMinutes} min
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-5 font-medium text-slate-600 dark:text-slate-400">
                Est. Waiting Time
              </td>
              {routes.map((r) => (
                <td key={r.id} className="py-3 px-4 font-mono-tabular text-slate-700 dark:text-slate-300">
                  {r.estimatedWaitMinutes !== null ? `${r.estimatedWaitMinutes} min` : 'Unavailable'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-5 font-medium text-slate-600 dark:text-slate-400">
                Crowd Level
              </td>
              {routes.map((r) => {
                const crowd = getCrowdMeta(r.crowdLevel);
                return (
                  <td key={r.id} className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 font-semibold ${crowd.textClass}`}>
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      {crowd.label}
                    </span>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {r.crowdSource}
                    </div>
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className="py-3 px-5 font-medium text-slate-600 dark:text-slate-400">
                Transfers
              </td>
              {routes.map((r) => (
                <td key={r.id} className="py-3 px-4 font-mono-tabular text-slate-900 dark:text-slate-100">
                  {r.transfers === 0 ? 'Direct (0)' : `${r.transfers}`}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-5 font-medium text-slate-600 dark:text-slate-400">
                Reliability
              </td>
              {routes.map((r) => (
                <td key={r.id} className="py-3 px-4 font-mono-tabular text-slate-900 dark:text-slate-100">
                  {r.reliability}%
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-5 font-medium text-slate-600 dark:text-slate-400">
                Match Score
              </td>
              {routes.map((r) => (
                <td key={r.id} className="py-3 px-4 font-mono-tabular font-bold text-blue-600 dark:text-blue-400">
                  {r.recommendationScore} / 100
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3 px-5 font-medium text-slate-600 dark:text-slate-400">
                Schedule Info
              </td>
              {routes.map((r) => (
                <td key={r.id} className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                  {r.scheduleNote}
                </td>
              ))}
            </tr>
            <tr>
              <td className="py-3.5 px-5 font-medium text-slate-600 dark:text-slate-400">
                Action
              </td>
              {routes.map((r) => {
                const chosen = chosenRouteId === r.id;
                return (
                  <td key={r.id} className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onChooseRoute(r)}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          chosen
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {chosen && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {chosen ? 'Chosen' : 'Choose'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewRouteOnMap(r.id)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                      >
                        Map
                      </button>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Comparison Cards (No horizontal overflow) */}
      <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
        {routes.map((r) => {
          const crowd = getCrowdMeta(r.crowdLevel);
          const chosen = chosenRouteId === r.id;
          return (
            <div key={r.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    {r.label} · {formatTransportMode(r.transportType)}
                  </span>
                  <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {r.routeName}
                  </h4>
                </div>
                <span className="font-mono-tabular text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">
                  {r.recommendationScore}/100
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span className="text-slate-500">Journey</span>
                  <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                    {r.estimatedTotalMinutes} min
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span className="text-slate-500">Waiting</span>
                  <span className="font-mono-tabular text-slate-800 dark:text-slate-200">
                    {r.estimatedWaitMinutes !== null ? `${r.estimatedWaitMinutes} min` : 'Unavailable'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span className="text-slate-500">Transfers</span>
                  <span className="font-mono-tabular text-slate-800 dark:text-slate-200">
                    {r.transfers}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                  <span className="text-slate-500">Reliability</span>
                  <span className="font-mono-tabular text-slate-800 dark:text-slate-200">
                    {r.reliability}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={`inline-flex items-center gap-1 font-semibold ${crowd.textClass}`}>
                  <Users className="h-3.5 w-3.5" />
                  {crowd.label}
                </span>
                <span className="text-slate-500 dark:text-slate-400">{r.crowdSource}</span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onChooseRoute(r)}
                  className={`flex-1 min-h-[42px] rounded-xl px-3 py-2 text-xs font-semibold ${
                    chosen
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {chosen ? 'Chosen Plan' : 'Choose This Route'}
                </button>
                <button
                  type="button"
                  onClick={() => onViewRouteOnMap(r.id)}
                  className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  View Map
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
