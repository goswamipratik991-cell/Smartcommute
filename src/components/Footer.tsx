export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <span className="font-display text-base font-bold text-slate-900 dark:text-white">
              SmartCommute
            </span>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Your commute. Your alternatives. Zero unnecessary waiting. Designed for daily
              suburban railway and bus passengers navigating unexpected delays.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">About & Contact</h3>
            <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a href="#planner" className="hover:text-slate-900 dark:hover:text-white hover:underline">
                  Backup Route Planner
                </a>
              </li>
              <li>
                <a href="#crowd-reports" className="hover:text-slate-900 dark:hover:text-white hover:underline">
                  Community Crowd Reporting
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white hover:underline">
                  Scoring Methodology
                </a>
              </li>
              <li>Contact: transit-support@smartcommute.example</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Data Disclaimer</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              SmartCommute does not invent live train or bus departure timetables. Unless an
              official transit feed is explicitly connected, route times are estimated from
              demonstration datasets and crowd conditions reflect user-submitted community reports.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>SmartCommute — Intelligent Transit Backup Planner</span>
          <span>OpenStreetMap contributors · Leaflet</span>
        </div>
      </div>
    </footer>
  );
}
