import { AlertTriangle, CheckCircle2, Clock, Send, Users } from 'lucide-react';
import { useState } from 'react';
import { postCrowdReport } from '../services/api';
import type { AggregatedCrowd, CrowdLevel, Station } from '../types/transit';
import { formatRelativeTime, getCrowdMeta } from '../utils/formatting';

interface CrowdReportSectionProps {
  stations: Station[];
  summaries: AggregatedCrowd[];
  onReportSubmitted: (updated: AggregatedCrowd) => void;
}

const REPORT_LEVELS: Exclude<CrowdLevel, 'Unknown'>[] = [
  'Low',
  'Moderate',
  'High',
  'Very High',
];

export function CrowdReportSection({
  stations,
  summaries,
  onReportSubmitted,
}: CrowdReportSectionProps) {
  const [stationInput, setStationInput] = useState(
    stations[0]?.station_name ?? 'Howrah Junction'
  );
  const [crowdLevel, setCrowdLevel] = useState<Exclude<CrowdLevel, 'Unknown'>>('Moderate');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmed = stationInput.trim();
    if (!trimmed) {
      setError('Please select or enter a station or bus stop.');
      return;
    }

    const matched = stations.find(
      (s) => s.station_name.toLowerCase() === trimmed.toLowerCase()
    );

    setSubmitting(true);
    try {
      const res = await postCrowdReport({
        stationId: matched?.id,
        stationName: trimmed,
        crowdLevel,
        note: note.trim() || undefined,
      });
      setSuccessMsg(
        `Report recorded for ${res.aggregated.station_name} (${res.report.crowd_level}) — aggregated crowd is now ${res.aggregated.crowd_level}.`
      );
      setNote('');
      onReportSubmitted(res.aggregated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not submit crowd report. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="crowd-reports"
      aria-label="Community crowd reporting"
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Community Crowd Reporting
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Share current platform or bus-stop conditions. Reports are aggregated using a
            recency-weighted average and never presented as official verified data.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Submit Crowd Report Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4"
        >
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Submit a Crowd Update
          </h3>

          <div>
            <label
              htmlFor="crowd-station-input"
              className="block mb-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Station or Bus Stop
            </label>
            <input
              id="crowd-station-input"
              type="text"
              list="smartcommute-stations"
              value={stationInput}
              onChange={(e) => setStationInput(e.target.value)}
              placeholder="Select or type station name"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <span className="block mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
              Observed Crowd Level
            </span>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_LEVELS.map((lvl) => {
                const meta = getCrowdMeta(lvl);
                const active = crowdLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCrowdLevel(lvl)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? `${meta.borderClass} ${meta.surfaceClass} ${meta.textClass} ring-1 ring-current`
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="crowd-note-input"
              className="block mb-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Optional Observation (max 140 chars)
            </label>
            <input
              id="crowd-note-input"
              type="text"
              maxLength={140}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Platform 2 clear, bus bay queue moving fast"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {successMsg && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/35 px-3 py-2.5 text-xs text-emerald-800 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full min-h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Submitting Report…' : 'Submit Crowd Report'}
          </button>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Disclaimer: Community crowd reports are user-submitted and may not represent actual
            conditions.
          </p>
        </form>

        {/* Station Crowd Aggregation Board */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Station Crowd Board (Recency-Weighted)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {summaries.length} hubs tracked
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[440px] overflow-y-auto">
            {summaries.slice(0, 10).map((item) => {
              const crowd = getCrowdMeta(item.crowd_level);
              return (
                <div
                  key={item.station_id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.station_name}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {item.source}
                      </span>
                    </div>

                    {(item.has_conflict || item.is_stale) && (
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-amber-700 dark:text-amber-400">
                        {item.has_conflict && (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Recent crowd reports differ. Treat as uncertain.
                          </span>
                        )}
                        {item.is_stale && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Older report ({formatRelativeTime(item.latest_report_at)}) — may be outdated
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${crowd.textClass}`}>
                      <Users className="h-3.5 w-3.5" />
                      {crowd.label}
                    </span>
                    <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                      {item.report_count > 0
                        ? `${item.report_count} report${item.report_count === 1 ? '' : 's'} · ${formatRelativeTime(item.latest_report_at)}`
                        : 'No reports'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
