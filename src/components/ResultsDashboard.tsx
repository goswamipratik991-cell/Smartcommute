import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Columns3,
  Info,
  MapPin,
  RefreshCw,
  Share2,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import type { RecommendationResponse, ScoredRoute } from '../types/transit';
import {
  formatClockTime,
  formatRelativeTime,
  formatTransportMode,
  getCrowdMeta,
} from '../utils/formatting';
import { RouteComparison } from './RouteComparison';
import { TransitMap } from './TransitMap';

interface ResultsDashboardProps {
  results: RecommendationResponse | null;
  isLoading: boolean;
  apiError: string | null;
  chosenRouteId: string | null;
  bookmarkedKeys: string[];
  onRefresh: () => void;
  onBackToEdit: () => void;
  onChooseRoute: (route: ScoredRoute) => void;
  onToggleBookmark: (results: RecommendationResponse) => void;
}

export function ResultsDashboard({
  results,
  isLoading,
  apiError,
  chosenRouteId,
  bookmarkedKeys,
  onRefresh,
  onBackToEdit,
  onChooseRoute,
  onToggleBookmark,
}: ResultsDashboardProps) {
  const [selectedMapRouteId, setSelectedMapRouteId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(null);
  const [copiedRouteId, setCopiedRouteId] = useState<string | null>(null);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);

  if (!results && !isLoading && !apiError) {
    return null;
  }

  const handleViewOnMap = (routeId: string) => {
    setSelectedMapRouteId(routeId);
    mapWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const handleShareRoute = async (route: ScoredRoute) => {
    const summary = `SmartCommute Backup Plan: ${route.originName} → ${route.destinationName}\nRoute: ${route.routeName} (${formatTransportMode(route.transportType)})\nEst. Duration: ${route.estimatedTotalMinutes} min · Crowd: ${route.crowdLevel} (${route.crowdSource}) · Transfers: ${route.transfers}\nNote: ${route.scheduleNote}`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopiedRouteId(route.id);
      setTimeout(() => setCopiedRouteId(null), 2200);
    } catch {
      setCopiedRouteId(route.id);
      setTimeout(() => setCopiedRouteId(null), 2200);
    }
  };

  // Loading Skeleton
  if (isLoading && !results) {
    return (
      <section aria-busy="true" className="space-y-4">
        <div className="h-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  // API Failure State
  if (apiError) {
    return (
      <section
        role="alert"
        className="rounded-2xl border border-red-200 dark:border-red-900/70 bg-white dark:bg-slate-900 p-6 sm:p-8"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-3">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Unable to Retrieve Recommendations
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{apiError}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                type="button"
                onClick={onBackToEdit}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Edit Journey
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!results) return null;

  const bookmarkKey = `${results.query.origin}__${results.query.destination}__${results.query.transportMode}`;
  const isBookmarked = bookmarkedKeys.includes(bookmarkKey);
  const chosenRoute = results.recommendations.find((r) => r.id === chosenRouteId) ?? null;

  return (
    <motion.section
      id="results-dashboard"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      aria-label="Alternative route recommendations"
      className="space-y-6"
    >
      {/* Results Header Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{formatTransportMode(results.query.transportMode)}</span>
              <span aria-hidden="true">·</span>
              <span>
                Delay:{' '}
                {results.query.delayMinutes === 'unknown'
                  ? 'Unknown'
                  : `${results.query.delayMinutes} min`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">
                Preference: {results.query.preference.replace('-', ' ')}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                Updated {formatClockTime(results.generatedAt)}
              </span>
            </div>
            <h2 className="mt-1.5 font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {results.query.origin} → {results.query.destination}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToEdit}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Edit Journey
            </button>

            {results.recommendations.length >= 2 && (
              <button
                type="button"
                aria-expanded={showComparison}
                onClick={() => setShowComparison((v) => !v)}
                className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  showComparison
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Columns3 className="h-4 w-4" />
                {showComparison ? 'Hide Comparison' : 'Compare Routes'}
              </button>
            )}

            <button
              type="button"
              onClick={() => onToggleBookmark(results)}
              className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-medium cursor-pointer whitespace-nowrap ${
                isBookmarked
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className="h-4 w-4" />
              {isBookmarked ? 'Saved' : 'Save Route'}
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Honest System / Data Availability Notices */}
        {results.systemNotices.length > 0 && (
          <div className="mt-4 space-y-2">
            {results.systemNotices.map((notice, idx) => (
              <div
                key={idx}
                role="status"
                className="flex items-start gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 px-4 py-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300"
              >
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <span>{notice}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chosen Route Confirmation Banner */}
      {chosenRoute && (
        <div
          role="status"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 px-5 py-4"
        >
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Selected Backup Plan: {chosenRoute.routeName}
              </p>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                Est. {chosenRoute.estimatedTotalMinutes} min · {chosenRoute.crowdLevel} crowd ·{' '}
                {chosenRoute.transfers} transfer{chosenRoute.transfers === 1 ? '' : 's'}.{' '}
                {chosenRoute.scheduleNote}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleShareRoute(chosenRoute)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer whitespace-nowrap self-start sm:self-center"
          >
            <Share2 className="h-3.5 w-3.5" />
            {copiedRouteId === chosenRoute.id ? 'Summary Copied' : 'Share Summary'}
          </button>
        </div>
      )}

      {/* Empty Route Results Fallback (Scenario 4) */}
      {results.recommendations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <MapPin className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-white">
            No Verified Alternative Routes Found
          </h3>
          <p className="mx-auto mt-1.5 max-w-lg text-sm text-slate-600 dark:text-slate-400">
            No verified alternative routes are currently available for this origin and destination
            pair. Try selecting hubs from the station suggestions, changing your travel preference,
            or checking again later.
          </p>
          <button
            type="button"
            onClick={onBackToEdit}
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            Edit Journey Details
          </button>
        </div>
      ) : (
        <>
          {/* Alternative Route Cards */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {results.recommendations.map((route) => {
              const crowd = getCrowdMeta(route.crowdLevel);
              const isChosen = chosenRouteId === route.id;
              const isExpanded = expandedBreakdownId === route.id;

              return (
                <article
                  key={route.id}
                  className={`flex flex-col justify-between rounded-2xl border bg-white dark:bg-slate-900 p-5 sm:p-6 transition-shadow ${
                    route.isTopPick
                      ? 'border-blue-600 ring-1 ring-blue-600/25 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    {/* Clean unboxed typographic metadata kicker (Zero-pill discipline) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`font-bold tracking-wide ${
                            route.isTopPick
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {route.label}
                        </span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                          ·
                        </span>
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          {formatTransportMode(route.transportType)}
                        </span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                          ·
                        </span>
                        <span className="font-medium text-slate-500 dark:text-slate-400">
                          {route.dataSource}
                        </span>
                      </div>

                      <div className="font-mono-tabular text-sm font-bold text-slate-900 dark:text-white">
                        Score {route.recommendationScore}
                        <span className="text-xs font-normal text-slate-400">/100</span>
                      </div>
                    </div>

                    {/* Route Name & Status */}
                    <h3 className="mt-3.5 font-display text-lg font-bold text-slate-900 dark:text-white leading-snug">
                      {route.routeName}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {route.routeStatus}
                    </p>

                    {/* Intermediate Stops Trail */}
                    <div className="mt-3.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        Stops:{' '}
                      </span>
                      {route.intermediateStops.join(' → ')}
                    </div>

                    {/* Key Metrics Grid (Tabular Numerals) */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Est. Total Time
                        </div>
                        <div className="mt-0.5 font-mono-tabular text-base font-bold text-slate-900 dark:text-white">
                          {route.estimatedTotalMinutes} min
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Est. Wait
                        </div>
                        <div className="mt-0.5 font-mono-tabular text-base font-semibold text-slate-800 dark:text-slate-200">
                          {route.estimatedWaitMinutes !== null
                            ? `${route.estimatedWaitMinutes} min`
                            : 'Unavailable'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Transfers
                        </div>
                        <div className="mt-0.5 font-mono-tabular text-base font-semibold text-slate-800 dark:text-slate-200">
                          {route.transfers}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Reliability
                        </div>
                        <div className="mt-0.5 font-mono-tabular text-base font-semibold text-slate-800 dark:text-slate-200">
                          {route.reliability}%
                        </div>
                      </div>
                    </div>

                    {/* Crowd Indicator (Semantic Color + Icon + Explicit Text Label) */}
                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 text-sm font-semibold ${crowd.textClass}`}
                        >
                          <Users className="h-4 w-4 shrink-0" />
                          {crowd.label}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          · {route.crowdSource} · {formatRelativeTime(route.lastUpdated)}
                        </span>
                      </div>
                    </div>

                    {/* Transparent Explanation */}
                    <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {route.explanation}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {route.scheduleNote}
                    </p>

                    {/* Warnings for missing crowd, conflicting reports, stale data, or missing geometry */}
                    {route.warnings.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {route.warnings.map((w, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expandable Score Breakdown */}
                    <div className="mt-3">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedBreakdownId(isExpanded ? null : route.id)
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            Hide score breakdown <ChevronUp className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          <>
                            How this score was calculated <ChevronDown className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-xs border border-slate-200/80 dark:border-slate-800">
                          <div>
                            <span className="text-slate-500">Travel Efficiency: </span>
                            <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                              {route.scoreBreakdown.travelEfficiency}/100
                            </span>
                            <span className="text-slate-400">
                              {' '}
                              ({Math.round(route.scoreBreakdown.weights.travelEfficiency * 100)}%)
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Crowd Comfort: </span>
                            <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                              {route.scoreBreakdown.crowdComfort}/100
                            </span>
                            <span className="text-slate-400">
                              {' '}
                              ({Math.round(route.scoreBreakdown.weights.crowdComfort * 100)}%)
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Reliability: </span>
                            <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                              {route.scoreBreakdown.reliability}/100
                            </span>
                            <span className="text-slate-400">
                              {' '}
                              ({Math.round(route.scoreBreakdown.weights.reliability * 100)}%)
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Transfers: </span>
                            <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white">
                              {route.scoreBreakdown.transferConvenience}/100
                            </span>
                            <span className="text-slate-400">
                              {' '}
                              ({Math.round(route.scoreBreakdown.weights.transferConvenience * 100)}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onChooseRoute(route)}
                      className={`min-h-[42px] flex-1 sm:flex-none rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        isChosen
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isChosen ? 'Route Selected' : 'Choose This Route'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleViewOnMap(route.id)}
                      className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                    >
                      View Route
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareRoute(route)}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      {copiedRouteId === route.id ? 'Copied' : 'Share'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Side-by-Side Comparison Matrix */}
          {showComparison && (
            <RouteComparison
              routes={results.recommendations}
              chosenRouteId={chosenRouteId}
              onChooseRoute={onChooseRoute}
              onViewRouteOnMap={handleViewOnMap}
            />
          )}

          {/* Interactive Leaflet Map */}
          <div ref={mapWrapperRef}>
            <TransitMap
              routes={results.recommendations}
              selectedRouteId={
                selectedMapRouteId ?? results.recommendations[0]?.id ?? null
              }
              onSelectRoute={(id) => setSelectedMapRouteId(id)}
            />
          </div>
        </>
      )}
    </motion.section>
  );
}
