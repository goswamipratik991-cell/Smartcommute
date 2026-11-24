import { Moon, RefreshCw, Sun, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CrowdReportSection } from './components/CrowdReportSection';
import { Footer } from './components/Footer';
import { LiveStatusAndPopular } from './components/LiveStatusAndPopular';
import { Navbar } from './components/Navbar';
import { ResultsDashboard } from './components/ResultsDashboard';
import { RoutePlannerForm } from './components/RoutePlannerForm';
import {
  fetchCrowdSummaries,
  fetchRecommendations,
  fetchRoutesOverview,
  fetchStations,
} from './services/api';
import type {
  AggregatedCrowd,
  RecommendationRequest,
  RecommendationResponse,
  RoutesOverviewResponse,
  SavedJourney,
  ScoredRoute,
  Station,
  TransportMode,
  TravelPreference,
} from './types/transit';
import { formatClockTime } from './utils/formatting';

const RECENTS_STORAGE_KEY = 'smartcommute_recent_searches_v1';
const BOOKMARKS_STORAGE_KEY = 'smartcommute_bookmarks_v1';
const THEME_STORAGE_KEY = 'smartcommute_theme_v1';

function loadSavedList(key: string): SavedJourney[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [darkMode]);

  // Initial data state
  const [stations, setStations] = useState<Station[]>([]);
  const [overview, setOverview] = useState<RoutesOverviewResponse | null>(null);
  const [crowdSummaries, setCrowdSummaries] = useState<AggregatedCrowd[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [initialError, setInitialError] = useState<string | null>(null);

  // Planner form state
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [transportMode, setTransportMode] = useState<TransportMode>('mixed');
  const [delayInput, setDelayInput] = useState('20');
  const [isUnknownDelay, setIsUnknownDelay] = useState(false);
  const [preference, setPreference] = useState<TravelPreference>('least-crowded');
  const [formError, setFormError] = useState<string | null>(null);
  const [simulateApiError, setSimulateApiError] = useState(false);

  // Results state
  const [results, setResults] = useState<RecommendationResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [chosenRouteId, setChosenRouteId] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<RecommendationRequest | null>(null);

  // Local persistence
  const [recentSearches, setRecentSearches] = useState<SavedJourney[]>(() =>
    loadSavedList(RECENTS_STORAGE_KEY)
  );
  const [bookmarkedJourneys, setBookmarkedJourneys] = useState<SavedJourney[]>(() =>
    loadSavedList(BOOKMARKS_STORAGE_KEY)
  );

  const plannerRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const loadInitialData = useCallback(async () => {
    setInitialError(null);
    try {
      const [stationList, routesData, crowdData] = await Promise.all([
        fetchStations(),
        fetchRoutesOverview(),
        fetchCrowdSummaries(),
      ]);
      setStations(stationList);
      setOverview(routesData);
      setCrowdSummaries(crowdData.summaries);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setInitialError(
        err instanceof Error
          ? err.message
          : 'Transport data could not be retrieved. Please try again.'
      );
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const saveRecentSearch = (req: RecommendationRequest) => {
    const entry: SavedJourney = {
      id: `${Date.now()}`,
      origin: req.origin.trim(),
      destination: req.destination.trim(),
      transportMode: req.transportMode,
      delayMinutes: req.delayMinutes,
      preference: req.preference,
      timestamp: new Date().toISOString(),
    };
    setRecentSearches((prev) => {
      const deduped = prev.filter(
        (item) =>
          !(
            item.origin.toLowerCase() === entry.origin.toLowerCase() &&
            item.destination.toLowerCase() === entry.destination.toLowerCase() &&
            item.transportMode === entry.transportMode
          )
      );
      const next = [entry, ...deduped].slice(0, 6);
      try {
        localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage limits
      }
      return next;
    });
  };

  const runSearch = async (req: RecommendationRequest) => {
    setFormError(null);
    setApiError(null);

    if (!req.origin.trim() || !req.destination.trim()) {
      setFormError('Please enter a valid starting point and destination.');
      return;
    }

    if (
      typeof req.delayMinutes === 'number' &&
      (Number.isNaN(req.delayMinutes) || req.delayMinutes < 0 || req.delayMinutes > 300)
    ) {
      setFormError('Please enter a valid delay between 0 and 300 minutes, or select Unknown.');
      return;
    }

    const payload: RecommendationRequest = {
      ...req,
      origin: req.origin.trim(),
      destination: req.destination.trim(),
      simulateApiError,
    };

    setIsSearching(true);
    setLastRequest(payload);
    setChosenRouteId(null);

    try {
      const response = await fetchRecommendations(payload);
      setResults(response);
      setLastUpdated(new Date().toISOString());
      saveRecentSearch(payload);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : 'Transport data could not be retrieved. Please try again.'
      );
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadDemoScenario = () => {
    const demoReq: RecommendationRequest = {
      origin: 'Howrah Junction',
      destination: 'Sealdah',
      transportMode: 'mixed',
      delayMinutes: 20,
      preference: 'least-crowded',
    };
    setOrigin(demoReq.origin);
    setDestination(demoReq.destination);
    setTransportMode(demoReq.transportMode);
    setDelayInput('20');
    setIsUnknownDelay(false);
    setPreference(demoReq.preference);
    setFormError(null);
    runSearch(demoReq);
  };

  const handleQuickLaunch = (params: {
    origin: string;
    destination: string;
    transportMode: TransportMode;
    delayMinutes: number;
    preference: TravelPreference;
  }) => {
    setOrigin(params.origin);
    setDestination(params.destination);
    setTransportMode(params.transportMode);
    setDelayInput(String(params.delayMinutes));
    setIsUnknownDelay(false);
    setPreference(params.preference);
    runSearch(params);
  };

  const handleToggleBookmark = (res: RecommendationResponse) => {
    const key = `${res.query.origin}__${res.query.destination}__${res.query.transportMode}`;
    setBookmarkedJourneys((prev) => {
      const exists = prev.some(
        (b) => `${b.origin}__${b.destination}__${b.transportMode}` === key
      );
      const next = exists
        ? prev.filter((b) => `${b.origin}__${b.destination}__${b.transportMode}` !== key)
        : [
            {
              id: key,
              origin: res.query.origin,
              destination: res.query.destination,
              transportMode: res.query.transportMode,
              delayMinutes: res.query.delayMinutes,
              preference: res.query.preference,
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 6);
      try {
        localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const handleReportSubmitted = async (updated: AggregatedCrowd) => {
    setCrowdSummaries((prev) => {
      const idx = prev.findIndex((item) => item.station_id === updated.station_id);
      if (idx === -1) return [updated, ...prev];
      const clone = [...prev];
      clone[idx] = updated;
      return clone;
    });
    setLastUpdated(new Date().toISOString());

    // Re-evaluate active recommendations if user already ran a query
    if (lastRequest && !simulateApiError) {
      try {
        const refreshed = await fetchRecommendations(lastRequest);
        setResults(refreshed);
      } catch {
        // Keep existing results if silent refresh fails
      }
    }
  };

  const scrollToPlanner = () => {
    plannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      document.getElementById('origin-input')?.focus();
    }, 300);
  };

  const bookmarkedKeys = bookmarkedJourneys.map(
    (b) => `${b.origin}__${b.destination}__${b.transportMode}`
  );

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Navbar onPlanClick={scrollToPlanner} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-10 space-y-12">
        {/* Hero & Workspace Controls */}
        <section className="space-y-6">
          {/* Workspace utility strip (below header, honoring Top Bar Contract) */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span>Demo & Community Transit Data</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                Last refreshed {formatClockTime(lastUpdated)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSimulateApiError((v) => !v)}
                aria-pressed={simulateApiError}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  simulateApiError
                    ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <WifiOff className="h-3.5 w-3.5" />
                {simulateApiError ? 'API Failure Simulation: ON' : 'Test API Failure'}
              </button>

              <button
                type="button"
                onClick={loadInitialData}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Updates
              </button>

              <button
                type="button"
                onClick={() => setDarkMode((d) => !d)}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {darkMode ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>

          {/* Editorial Hero Intro */}
          <div className="max-w-3xl space-y-3">
            <h1 className="font-display text-[clamp(2rem,4.2vw,3.25rem)] font-extrabold tracking-tight leading-[1.1] text-slate-900 dark:text-white text-balance">
              Your journey disrupted? Find a better way.
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Your commute. Your alternatives. Zero unnecessary waiting. Compare backup suburban
              train, bus, and mixed routes in seconds with transparent crowd and delay scoring.
            </p>
          </div>

          {initialError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/35 px-4 py-3 text-sm text-red-700 dark:text-red-300"
            >
              <span>{initialError}</span>
              <button
                type="button"
                onClick={loadInitialData}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Core Route Planning Panel */}
          <div ref={plannerRef}>
            <RoutePlannerForm
              stations={stations}
              origin={origin}
              destination={destination}
              transportMode={transportMode}
              delayInput={delayInput}
              isUnknownDelay={isUnknownDelay}
              preference={preference}
              isLoading={isSearching}
              formError={formError}
              onOriginChange={setOrigin}
              onDestinationChange={setDestination}
              onTransportModeChange={setTransportMode}
              onDelayPresetSelect={(val, unknown) => {
                setIsUnknownDelay(unknown);
                if (!unknown) setDelayInput(val);
              }}
              onDelayInputChange={(val) => {
                setIsUnknownDelay(false);
                setDelayInput(val);
              }}
              onPreferenceChange={setPreference}
              onSubmit={runSearch}
              onLoadDemoScenario={handleLoadDemoScenario}
            />
          </div>
        </section>

        {/* Dedicated Route Results & Map Dashboard */}
        <div ref={resultsRef}>
          <ResultsDashboard
            results={results}
            isLoading={isSearching}
            apiError={apiError}
            chosenRouteId={chosenRouteId}
            bookmarkedKeys={bookmarkedKeys}
            onRefresh={() => lastRequest && runSearch(lastRequest)}
            onBackToEdit={scrollToPlanner}
            onChooseRoute={(route: ScoredRoute) => setChosenRouteId(route.id)}
            onToggleBookmark={handleToggleBookmark}
          />
        </div>

        {/* Community Crowd Reporting */}
        <CrowdReportSection
          stations={stations}
          summaries={crowdSummaries}
          onReportSubmitted={handleReportSubmitted}
        />

        {/* Live Status, Popular Corridors, Saved Journeys & How It Works */}
        <LiveStatusAndPopular
          overview={overview}
          recentSearches={recentSearches}
          bookmarkedJourneys={bookmarkedJourneys}
          onQuickLaunch={handleQuickLaunch}
          onClearRecents={() => {
            setRecentSearches([]);
            try {
              localStorage.removeItem(RECENTS_STORAGE_KEY);
            } catch {
              // Ignore
            }
          }}
          onRefreshOverview={loadInitialData}
        />
      </main>

      <Footer />
    </div>
  );
}
