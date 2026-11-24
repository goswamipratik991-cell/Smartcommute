# SmartCommute — Intelligent Transit Backup Planner

**"Your commute. Your alternatives. Zero unnecessary waiting."**

SmartCommute is a responsive, full-stack transit backup planning web application built for daily suburban railway and bus commuters facing unexpected delays, platform congestion, or incomplete transit updates.

---

## Architecture Overview

- **Frontend (`/src`)**: React 19, TypeScript, Tailwind CSS v4, Lucide icons, Motion animations, and **Leaflet + OpenStreetMap** for interactive corridor mapping.
  - `src/components/RoutePlannerForm.tsx`: Station/stop search with manual entry, browser Geolocation nearest-hub detection, delay presets/manual minutes/unknown option, and 3 preference cards (`Fastest`, `Least Crowded`, `Balanced`).
  - `src/components/ResultsDashboard.tsx` & `src/components/RouteComparison.tsx`: Ranked route recommendations with transparent 0–100 score breakdowns, explicit data-source labels (`DEMO DATA`, `USER REPORTED`, `ESTIMATED`, `DATA UNAVAILABLE`), side-by-side comparison, route selection, bookmarking, and share summary.
  - `src/components/TransitMap.tsx`: Interactive Leaflet map showing start, destination, intermediate stop markers, color-coded route polylines, and an honest fallback message when route geometry is unavailable.
  - `src/components/CrowdReportSection.tsx`: Community crowd reporting form with disclaimer and a recency-weighted station crowd board detecting conflicting and stale reports.
- **Backend (`/backend/src` + `/server.ts`)**: Node.js + Express REST API integrated with Vite middleware in development and static serving in production.
  - `backend/src/config/scoring.ts`: Configurable preference weights and crowd comfort values.
  - `backend/src/services/recommendationService.ts`: Multi-factor scoring engine, delay impact modeling, unknown-crowd penalties, and fallback corridor synthesis.
  - `backend/src/services/crowdService.ts`: Exponential recency-weighted crowd aggregation, conflict spread detection, and staleness alerts.
  - `backend/src/controllers/transitController.ts` & `backend/src/routes/api.ts`: Input validation, sanitization, and REST endpoints.

---

## REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check and live-feed availability status |
| `GET` | `/api/stations` | Searchable demonstration hub/station directory |
| `GET` | `/api/routes` | Demonstration corridors, updates, and crowd summaries |
| `POST` | `/api/recommendations` | Evaluates and ranks alternative routes for a disrupted journey |
| `GET` | `/api/crowd-reports` | Aggregated recency-weighted crowd summaries across hubs |
| `POST` | `/api/crowd-reports` | Submits a community crowd report (`Low`, `Moderate`, `High`, `Very High`) |
| `GET` | `/api/crowd-reports/:stationId` | Detailed aggregated crowd summary and recent reports for a station |

---

## Local Setup & Execution

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` if running locally outside AI Studio:
   ```bash
   cp .env.example .env
   ```

3. **Run development server** (Express API + Vite on port `3000`):
   ```bash
   npm run dev
   ```

4. **Typecheck & build for production**:
   ```bash
   npm run lint
   npm run build
   npm start
   ```

---

## Demonstration Walkthrough (Howrah Junction → Sealdah)

1. Click **"Load Howrah → Sealdah Demo"** in the Route Planning Panel (or enter Origin: `Howrah Junction`, Destination: `Sealdah`, Mode: `Mixed Transport`, Delay: `20` min, Preference: `Least Crowded`).
2. Submit **"Find Alternative"**:
   - **East-West Tunnel & Shuttle** ranks `#1 (BEST OVERALL)` with `Low` crowd and bypasses mainline rail delays.
   - **Howrah–MG Road Direct Express Bus** offers a `0-transfer` surface option with `Moderate` crowd.
   - **Circular Suburban Rail Bypass** reflects the 20-minute origin delay impact and `High` crowd.
   - **Howrah Jetty Ferry & Moulali Link** demonstrates **Missing Crowd Info** (`Unknown` crowd is never classified as `Low`) and **Unavailable Route Geometry** (map displays verified endpoints only without drawing unverified lines).
3. Click **Compare Routes** for side-by-side metrics, **View Route** to inspect stops on OpenStreetMap, or submit a new **Community Crowd Report** to see recency-weighted rankings update immediately.
4. Toggle **"Test API Failure"** in the workspace toolbar to verify graceful error & retry handling.

---

## Deployment Instructions

### Option A: Single Full-Stack Service (Render / Railway / Cloud Run)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Port**: `3000` (or `process.env.PORT`)

### Option B: Split Frontend (Vercel) + Backend (Render)
1. **Backend on Render**: Deploy the repo as a Node Web Service with `npm install` and start command `npm start`.
2. **Frontend on Vercel**: Deploy the Vite app (`npm run build`, output directory `dist`) and configure a rewrite in `vercel.json` forwarding `/api/*` to your Render backend URL.
