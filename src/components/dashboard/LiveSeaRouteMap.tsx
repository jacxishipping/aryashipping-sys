'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Ship, 
  Anchor, 
  Compass, 
  MapPin, 
  Navigation, 
  Clock, 
  Layers, 
  Maximize2, 
  Minimize2,
  Calendar, 
  Radio, 
  Wind, 
  Waves, 
  Play, 
  Pause, 
  RotateCcw, 
  Eye, 
  ChevronRight,
  ShieldCheck,
  Crosshair,
  Gauge
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  buildMaritimeRoute, 
  generateVesselAISTelemetry, 
  type SeaRouteAnalysis, 
  type VesselAISTelemetry,
  type MaritimeWaypoint
} from '@/lib/maritime/sea-routes';

// Dynamic Leaflet imports to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then((mod) => mod.Tooltip),
  { ssr: false }
);

// Map controller for pan / zoom animations
function MapControllerComponent({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const { useMap } = require('react-leaflet');
  const map = useMap();
  
  useEffect(() => {
    if (center && map) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
    }
  }, [center, zoom, map]);

  return null;
}

const DynamicMapController = dynamic(
  () => Promise.resolve(MapControllerComponent),
  { ssr: false }
);

export interface ContainerTrackSummary {
  id: string;
  containerNumber: string;
  progress: number;
  vesselName?: string | null;
  destinationPort?: string | null;
  status?: string;
}

export interface LiveSeaRouteMapProps {
  containerId?: string;
  containerNumber?: string;
  originPort?: string;
  destinationPort?: string;
  vesselName?: string;
  voyageNumber?: string;
  currentProgressPct?: number; // 0 to 100
  departureDate?: string | Date | null;
  estimatedArrival?: string | Date | null;
  status?: string;
  containersList?: ContainerTrackSummary[];
  selectedContainerId?: string;
  onSelectContainer?: (id: string) => void;
  className?: string;
}

type MapTileTheme = 'nautical-dark' | 'satellite' | 'ocean-light';

export function LiveSeaRouteMap({
  containerNumber = 'MSKU9048123',
  originPort = 'Port of Newark (USNWK)',
  destinationPort = 'Port of Jebel Ali (AEJEA)',
  vesselName = 'MAERSK VOYAGER',
  voyageNumber = 'V-2409W',
  currentProgressPct = 68,
  departureDate,
  estimatedArrival,
  status = 'In Transit',
  containersList = [],
  selectedContainerId,
  onSelectContainer,
  className = '',
}: LiveSeaRouteMapProps) {
  // Scrubber & Playback state
  const [isLiveAIS, setIsLiveAIS] = useState(true);
  const [scrubberProgress, setScrubberProgress] = useState(currentProgressPct);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapTheme, setMapTheme] = useState<MapTileTheme>('nautical-dark');
  const [centerTarget, setCenterTarget] = useState<[number, number] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync scrubber if live progress updates from parent
  useEffect(() => {
    if (isLiveAIS) {
      setScrubberProgress(currentProgressPct);
    }
  }, [currentProgressPct, isLiveAIS]);

  // Compute Maritime Route & Waypoints based on scrubber progress
  const routeAnalysis = useMemo<SeaRouteAnalysis>(() => {
    return buildMaritimeRoute(
      originPort,
      destinationPort,
      scrubberProgress,
      departureDate ? new Date(departureDate) : null,
      estimatedArrival ? new Date(estimatedArrival) : null
    );
  }, [originPort, destinationPort, scrubberProgress, departureDate, estimatedArrival]);

  // Generate AIS Telematics for current position
  const telemetry = useMemo<VesselAISTelemetry>(() => {
    return generateVesselAISTelemetry(vesselName, voyageNumber, routeAnalysis);
  }, [vesselName, voyageNumber, routeAnalysis]);

  // Live ETA countdown timer ticking every second
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const targetTime = routeAnalysis.etaDate.getTime();
      const diff = Math.max(0, targetTime - Date.now());

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [routeAnalysis.etaDate]);

  // Voyage animation playback loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setScrubberProgress((prev) => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return Math.min(100, prev + 0.3 * playbackSpeed);
      });
      setIsLiveAIS(false);
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Split dense route coordinates into Traveled vs Remaining
  const { traveledCoords, remainingCoords } = useMemo(() => {
    const all = routeAnalysis.denseRouteCoordinates;
    if (all.length === 0) return { traveledCoords: [], remainingCoords: [] };

    const splitIndex = Math.min(
      all.length - 1,
      Math.max(0, Math.floor((scrubberProgress / 100) * all.length))
    );

    return {
      traveledCoords: all.slice(0, splitIndex + 1),
      remainingCoords: all.slice(splitIndex),
    };
  }, [routeAnalysis.denseRouteCoordinates, scrubberProgress]);

  // Recenter map on vessel
  const handleCenterOnVessel = useCallback(() => {
    setCenterTarget([routeAnalysis.vesselCurrentPos.lat, routeAnalysis.vesselCurrentPos.lng]);
  }, [routeAnalysis.vesselCurrentPos]);

  // Reset to Live AIS
  const handleResetToLive = () => {
    setIsPlaying(false);
    setIsLiveAIS(true);
    setScrubberProgress(currentProgressPct);
    handleCenterOnVessel();
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Custom Leaflet Icons
  const vesselIcon = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const L = require('leaflet');

    const svgHtml = renderToStaticMarkup(
      <div className="relative flex items-center justify-center">
        {/* Pulsing Sonar Rings */}
        <div className="absolute w-12 h-12 rounded-full bg-cyan-400/25 animate-ping" />
        <div className="absolute w-8 h-8 rounded-full bg-cyan-500/35 animate-pulse" />
        
        {/* Vessel Body with Directional Heading Arrow */}
        <div 
          className="relative w-8 h-8 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] flex items-center justify-center text-cyan-300 transition-transform duration-300"
          style={{ transform: `rotate(${telemetry.headingDegrees}deg)` }}
        >
          <Navigation className="w-4 h-4 fill-cyan-400 text-cyan-400" />
        </div>
      </div>
    );

    return L.divIcon({
      html: svgHtml,
      className: 'vessel-marker-icon',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24],
    });
  }, [telemetry.headingDegrees]);

  const originIcon = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const L = require('leaflet');

    const svgHtml = renderToStaticMarkup(
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white border-2 border-white shadow-lg">
        <Anchor className="w-3.5 h-3.5" />
      </div>
    );

    return L.divIcon({
      html: svgHtml,
      className: 'origin-marker-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  }, []);

  const destinationIcon = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const L = require('leaflet');

    const svgHtml = renderToStaticMarkup(
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold border-2 border-white shadow-lg">
        <MapPin className="w-4 h-4 fill-current" />
      </div>
    );

    return L.divIcon({
      html: svgHtml,
      className: 'dest-marker-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  }, []);

  const waypointIcon = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const L = require('leaflet');

    const svgHtml = renderToStaticMarkup(
      <div className="flex items-center justify-center w-4 h-4 rounded-full bg-cyan-900 border border-cyan-400 shadow-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
      </div>
    );

    return L.divIcon({
      html: svgHtml,
      className: 'waypoint-marker-icon',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
    });
  }, []);

  // Tile layer URL based on selected theme
  const tileUrl = useMemo(() => {
    switch (mapTheme) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'ocean-light':
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      case 'nautical-dark':
      default:
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }
  }, [mapTheme]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 overflow-hidden shadow-2xl flex flex-col font-sans ${className} ${
        isFullscreen ? 'h-screen rounded-none' : 'min-h-[580px]'
      }`}
    >
      {/* ── TOP TELEMETRY HUD HEADER ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        {/* Left: Vessel Identity & Live AIS Beacon */}
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Ship className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>{vesselName}</span>
                <span title={telemetry.flag.country} className="text-base leading-none">
                  {telemetry.flag.emoji}
                </span>
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-800 border border-slate-700 text-cyan-400">
                {telemetry.imoNumber}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-slate-800/80 text-slate-400">
                {voyageNumber}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Container: <strong className="font-mono text-slate-200">{containerNumber}</strong></span>
              <span>•</span>
              <span className="text-cyan-300 font-medium flex items-center gap-1">
                <Compass className="w-3 h-3 text-cyan-400" />
                {telemetry.headingDegrees}° COG
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Gauge className="w-3 h-3 text-emerald-400" />
                {telemetry.speedKnots} kn
              </span>
              <span>•</span>
              <span className="text-slate-400 hidden sm:inline">{telemetry.aisStation}</span>
            </p>
          </div>
        </div>

        {/* Center / Right: Dynamic Port ETA Countdown HUD */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Fleet Container Switcher (if list provided) */}
          {containersList && containersList.length > 0 && onSelectContainer && (
            <div className="hidden md:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                value={selectedContainerId || containersList.find(c => c.containerNumber === containerNumber)?.id || ''}
                onChange={(e) => onSelectContainer(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-white outline-none cursor-pointer pr-1 py-0.5"
              >
                {containersList.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white font-mono">
                    {c.containerNumber} — {c.progress}% ({c.destinationPort || 'In Transit'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live ETA Ticker */}
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/25 px-3.5 py-1.5 rounded-xl flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80 block">
                Estimated Port Arrival
              </span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-extrabold text-amber-300">
                <span>{timeRemaining.days}d</span>
                <span>:</span>
                <span>{String(timeRemaining.hours).padStart(2, '0')}h</span>
                <span>:</span>
                <span>{String(timeRemaining.minutes).padStart(2, '0')}m</span>
                <span className="text-amber-400/60">:</span>
                <span className="text-amber-400/80 text-[11px]">{String(timeRemaining.seconds).padStart(2, '0')}s</span>
              </div>
            </div>
          </div>

          {/* Map Controls Group */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            {/* Center on vessel button */}
            <button
              type="button"
              onClick={handleCenterOnVessel}
              className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
              title="Center Map on Vessel"
            >
              <Crosshair className="w-4 h-4" />
            </button>

            {/* Map Theme Toggle */}
            <button
              type="button"
              onClick={() => {
                setMapTheme(prev => 
                  prev === 'nautical-dark' ? 'satellite' : 
                  prev === 'satellite' ? 'ocean-light' : 'nautical-dark'
                );
              }}
              className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
              title={`Switch Map Theme (Current: ${mapTheme})`}
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE LEAFLET MARITIME RADAR ── */}
      <div className="relative flex-1 w-full min-h-[360px] bg-slate-950">
        {typeof window !== 'undefined' && (
          <MapContainer
            center={[routeAnalysis.vesselCurrentPos.lat, routeAnalysis.vesselCurrentPos.lng]}
            zoom={4}
            minZoom={2}
            maxZoom={14}
            className="w-full h-full z-0"
            attributionControl={false}
          >
            <TileLayer
              url={tileUrl}
              maxZoom={18}
            />

            {/* Controller for programmatically flying to coordinates */}
            {centerTarget && <DynamicMapController center={centerTarget} />}

            {/* Traveled Sea Lane (Solid Glowing Gold / Cyan) */}
            {traveledCoords.length > 1 && (
              <Polyline
                positions={traveledCoords}
                pathOptions={{
                  color: '#06b6d4', // cyan-500
                  weight: 4,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}

            {/* Remaining Sea Lane (Dashed Dotted Glowing Cyan/White) */}
            {remainingCoords.length > 1 && (
              <Polyline
                positions={remainingCoords}
                pathOptions={{
                  color: '#38bdf8', // sky-400
                  weight: 3,
                  opacity: 0.45,
                  dashArray: '8, 8',
                  lineCap: 'round',
                }}
              />
            )}

            {/* Origin Port Marker */}
            {originIcon && (
              <Marker position={[routeAnalysis.originCoords.lat, routeAnalysis.originCoords.lng]} icon={originIcon}>
                <Popup className="maritime-popup">
                  <div className="p-1 text-slate-900">
                    <span className="text-[10px] font-bold uppercase text-emerald-600">Port of Loading</span>
                    <h4 className="font-bold text-xs">{routeAnalysis.originPort}</h4>
                    <p className="text-[11px] text-slate-600 mt-1">Voyage Origin • Departure Point</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Destination Port Marker */}
            {destinationIcon && (
              <Marker position={[routeAnalysis.destCoords.lat, routeAnalysis.destCoords.lng]} icon={destinationIcon}>
                <Popup className="maritime-popup">
                  <div className="p-1 text-slate-900">
                    <span className="text-[10px] font-bold uppercase text-amber-600">Destination Port</span>
                    <h4 className="font-bold text-xs">{routeAnalysis.destinationPort}</h4>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {routeAnalysis.distanceRemainingNM.toLocaleString()} NM remaining
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Maritime Strategic Choke-Points (Straits & Canals) */}
            {waypointIcon && routeAnalysis.waypoints.map((wp) => {
              if (wp.type === 'port_origin' || wp.type === 'port_destination') return null;

              return (
                <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={waypointIcon}>
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                    <span className="font-semibold text-xs text-slate-900">{wp.name}</span>
                  </Tooltip>
                  <Popup>
                    <div className="p-1 text-slate-900">
                      <span className="text-[10px] font-bold uppercase text-cyan-600">{wp.type}</span>
                      <h4 className="font-bold text-xs">{wp.name}</h4>
                      <p className="text-[11px] text-slate-600 mt-1">{wp.description}</p>
                      <div className="mt-2 text-[10px] font-mono font-bold">
                        Status: {wp.passed ? '✓ Passed' : wp.active ? '⚡ Approaching / In Transit' : 'Upcoming'}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Live Vessel AIS Marker */}
            {vesselIcon && (
              <Marker
                position={[routeAnalysis.vesselCurrentPos.lat, routeAnalysis.vesselCurrentPos.lng]}
                icon={vesselIcon}
              >
                <Popup>
                  <div className="p-1 text-slate-900 font-sans">
                    <div className="flex items-center gap-1.5 text-cyan-700 font-bold text-xs">
                      <Ship className="w-3.5 h-3.5" />
                      <span>{vesselName}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                      <div>Position: {routeAnalysis.vesselCurrentPos.lat.toFixed(4)}°N, {routeAnalysis.vesselCurrentPos.lng.toFixed(4)}°E</div>
                      <div>Speed: <strong>{telemetry.speedKnots} knots</strong></div>
                      <div>Heading: <strong>{telemetry.headingDegrees}° COG</strong></div>
                      <div>Zone: <strong>{routeAnalysis.currentZoneName}</strong></div>
                      <div>Status: <strong>{telemetry.navigationalStatus}</strong></div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        )}

        {/* Floating Ocean Conditions & Zone Pill Overlay */}
        <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 pointer-events-auto">
          <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-xl text-xs text-slate-300 shadow-xl max-w-[280px]">
            <div className="flex items-center justify-between gap-3 text-[10px] uppercase font-bold tracking-wider text-cyan-400 mb-1">
              <span>Maritime Zone</span>
              <span className="text-emerald-400">Live AIS</span>
            </div>
            <p className="font-bold text-sm text-white truncate">{routeAnalysis.currentZoneName}</p>
            <div className="mt-2 pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{telemetry.weather.waveHeightMeters}m Swell</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{telemetry.weather.windSpeedKnots} kn {telemetry.weather.windDirection}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Live vs Scrubbed State Pill */}
        {!isLiveAIS && (
          <div className="absolute top-4 right-4 z-[400] bg-amber-500/90 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
            <span>Simulating Voyage ({Math.round(scrubberProgress)}%)</span>
            <button
              onClick={handleResetToLive}
              className="bg-slate-950/20 hover:bg-slate-950/40 px-2 py-0.5 rounded text-[11px] font-semibold"
            >
              Reset to Live AIS
            </button>
          </div>
        )}
      </div>

      {/* ── BOTTOM INTERACTIVE VOYAGE SCRUBBER & METRICS HUD ── */}
      <div className="relative z-10 p-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 space-y-3">
        {/* Scrubber Control Row */}
        <div className="flex items-center gap-4">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors shadow-md shrink-0"
            title={isPlaying ? 'Pause Simulation' : 'Play Voyage Simulation'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={() => setPlaybackSpeed(s => (s === 1 ? 2 : s === 2 ? 5 : 1))}
            className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 shrink-0"
            title="Simulation Speed"
          >
            {playbackSpeed}x
          </button>

          {/* Interactive Progress Slider */}
          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={scrubberProgress}
              onChange={(e) => {
                setIsPlaying(false);
                setIsLiveAIS(false);
                setScrubberProgress(parseFloat(e.target.value));
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
          </div>

          {/* Live AIS Snapback Button */}
          <button
            type="button"
            onClick={handleResetToLive}
            disabled={isLiveAIS}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
              isLiveAIS
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveAIS ? 'animate-pulse' : ''}`} />
            <span>{isLiveAIS ? 'Live AIS Active' : 'Snap to Live'}</span>
          </button>
        </div>

        {/* Voyage Distance & Waypoints Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Distance Covered</span>
            <p className="font-mono font-bold text-slate-200 mt-0.5">
              {routeAnalysis.distanceCoveredNM.toLocaleString()} <span className="text-[10px] text-slate-400">NM</span>
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Distance Remaining</span>
            <p className="font-mono font-bold text-cyan-400 mt-0.5">
              {routeAnalysis.distanceRemainingNM.toLocaleString()} <span className="text-[10px] text-slate-400">NM</span>
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Oceanic Route</span>
            <p className="font-mono font-bold text-slate-200 mt-0.5">
              {routeAnalysis.totalDistanceNM.toLocaleString()} <span className="text-[10px] text-slate-400">NM</span>
              <span className="text-[10px] text-slate-500 ml-1">({routeAnalysis.totalDistanceKM.toLocaleString()} km)</span>
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Voyage Completion</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.round(scrubberProgress)}%` }}
                />
              </div>
              <span className="font-mono font-bold text-emerald-400">{Math.round(scrubberProgress)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
