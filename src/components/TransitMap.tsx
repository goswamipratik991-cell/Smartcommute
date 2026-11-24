import L from 'leaflet';
import { AlertTriangle, Map as MapIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ScoredRoute } from '../types/transit';

interface TransitMapProps {
  routes: ScoredRoute[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
}

const ROUTE_COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#7C3AED'];

export function TransitMap({
  routes,
  selectedRouteId,
  onSelectRoute,
}: TransitMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const activeRoute =
    routes.find((r) => r.id === selectedRouteId) ?? routes[0] ?? null;

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.5726, 88.3639],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Draw markers and available route polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    if (routes.length === 0) return;

    const boundsPoints: L.LatLngExpression[] = [];

    routes.forEach((route, index) => {
      const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
      const isSelected = activeRoute?.id === route.id;

      // Never draw imaginary lines when route geometry is unavailable
      if (route.geometryAvailable && route.coordinates.length >= 2) {
        const latLngs: L.LatLngExpression[] = route.coordinates.map((c) => [
          c.latitude,
          c.longitude,
        ]);

        const polyline = L.polyline(latLngs, {
          color,
          weight: isSelected ? 6 : 3,
          opacity: isSelected ? 0.95 : 0.45,
          dashArray: route.transportType === 'bus' ? '8, 6' : undefined,
        });

        polyline.bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;">
            <strong>${route.routeName}</strong><br/>
            Est. ${route.estimatedTotalMinutes} min · ${route.crowdLevel} Crowd
          </div>`
        );
        polyline.on('click', () => onSelectRoute(route.id));
        polyline.addTo(group);
      }
    });

    // Plot verified markers for the active route
    if (activeRoute && activeRoute.coordinates.length > 0) {
      const activeIndex = routes.findIndex((r) => r.id === activeRoute.id);
      const activeColor =
        ROUTE_COLORS[(activeIndex >= 0 ? activeIndex : 0) % ROUTE_COLORS.length];

      activeRoute.coordinates.forEach((pt, idx) => {
        const isOrigin = idx === 0;
        const isDest = idx === activeRoute.coordinates.length - 1;

        const markerColor = isOrigin
          ? '#0F172A'
          : isDest
            ? '#2563EB'
            : activeColor;

        const circle = L.circleMarker([pt.latitude, pt.longitude], {
          radius: isOrigin || isDest ? 8 : 5,
          color: '#FFFFFF',
          weight: 2,
          fillColor: markerColor,
          fillOpacity: 1,
        });

        const roleLabel = isOrigin
          ? 'Starting Point'
          : isDest
            ? 'Destination'
            : 'Intermediate Stop';

        circle.bindPopup(
          `<div style="font-family:sans-serif;font-size:12px;">
            <span style="color:#64748b;font-size:11px;">${roleLabel}</span><br/>
            <strong>${pt.name}</strong>
          </div>`
        );
        circle.addTo(group);
        boundsPoints.push([pt.latitude, pt.longitude]);
      });
    }

    if (boundsPoints.length >= 2) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [42, 42], maxZoom: 14 });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 13);
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [routes, activeRoute, onSelectRoute]);

  return (
    <section
      aria-label="Interactive route map"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2">
          <MapIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Corridor & Stop Map
          </h3>
        </div>

        {routes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {routes.map((route, idx) => {
              const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
              const isSelected = activeRoute?.id === route.id;
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => onSelectRoute(route.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  Option {idx + 1}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activeRoute && !activeRoute.geometryAvailable && (
        <div
          role="status"
          className="flex items-start gap-2.5 border-b border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/35 px-5 py-3 text-xs font-medium text-amber-800 dark:text-amber-300"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Route geometry is unavailable for <strong>{activeRoute.routeName}</strong>.
            Showing verified starting and destination location markers only without drawing
            unverified track lines.
          </span>
        </div>
      )}

      <div
        ref={mapContainerRef}
        className="h-[320px] sm:h-[380px] w-full bg-slate-100 dark:bg-slate-950"
      />

      {activeRoute && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-3 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Viewing: <strong className="text-slate-900 dark:text-slate-200">{activeRoute.routeName}</strong>
          </span>
          <span>
            {activeRoute.geometryAvailable
              ? `${activeRoute.coordinates.length} mapped corridor points · OpenStreetMap`
              : 'Markers only · Geometry unavailable'}
          </span>
        </div>
      )}
    </section>
  );
}
