'use client';

import { useState, useMemo } from 'react';
import { 
  Ship, 
  Anchor, 
  Compass, 
  MapPin, 
  Navigation, 
  Clock, 
  Layers, 
  ShieldCheck, 
  AlertCircle,
  Maximize2,
  Calendar,
  Sparkles,
  Radio,
  Map
} from 'lucide-react';
import { LiveSeaRouteMap, type ContainerTrackSummary } from './LiveSeaRouteMap';

export interface RouteStop {
  portName: string;
  country: string;
  code: string;
  lat: number;
  lng: number;
  status: 'departed' | 'current' | 'next' | 'destination';
  date?: string;
}

export type { ContainerTrackSummary };

export interface OceanRouteMapProps {
  originPort?: string;
  destinationPort?: string;
  vesselName?: string;
  voyageNumber?: string;
  containerNumber?: string;
  currentProgressPct?: number; // 0 to 100
  departureDate?: string | Date | null;
  estimatedArrival?: string | Date | null;
  etaDays?: number;
  status?: string;
  containersList?: ContainerTrackSummary[];
  selectedContainerId?: string;
  onSelectContainer?: (id: string) => void;
  className?: string;
  defaultView?: 'live-radar' | 'vector';
}

export function OceanRouteMap({
  originPort = 'Port of Newark (USNWK)',
  destinationPort = 'Port of Jebel Ali (AEJEA)',
  vesselName = 'MAERSK VOYAGER',
  voyageNumber = 'V-2409W',
  containerNumber = 'MSKU9048123',
  currentProgressPct = 68,
  departureDate,
  estimatedArrival,
  etaDays = 9,
  status = 'In Transit',
  containersList = [],
  selectedContainerId,
  onSelectContainer,
  className = '',
  defaultView = 'live-radar',
}: OceanRouteMapProps) {
  const [viewMode, setViewMode] = useState<'live-radar' | 'vector'>(defaultView);
  const [selectedWaypoint, setSelectedWaypoint] = useState<number | null>(1);

  // SVG coordinate projection points for standard Transatlantic -> Mediterranean -> Suez -> Arabian Gulf corridor
  const waypoints = useMemo(() => [
    { name: originPort, code: 'ORIGIN', x: 80, y: 130, date: 'Dep: Sep 12', status: 'completed' },
    { name: 'Strait of Gibraltar (Transit)', code: 'GIBRALTAR', x: 280, y: 140, date: 'Passed: Sep 18', status: 'completed' },
    { name: 'Suez Canal Convoy', code: 'SUEZ', x: 440, y: 160, date: 'Est: Sep 25', status: 'active' },
    { name: 'Bab el-Mandeb Strait', code: 'RED_SEA', x: 520, y: 220, date: 'Est: Sep 28', status: 'upcoming' },
    { name: destinationPort, code: 'DEST', x: 640, y: 170, date: 'ETA: Oct 02', status: 'destination' },
  ], [originPort, destinationPort]);

  // Interpolated ship position along the path based on progress
  const shipPos = useMemo(() => {
    const totalSegments = waypoints.length - 1;
    const progress = Math.min(Math.max(currentProgressPct, 5), 95) / 100;
    const segmentIndex = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
    const subProgress = (progress * totalSegments) - segmentIndex;

    const p1 = waypoints[segmentIndex];
    const p2 = waypoints[segmentIndex + 1];

    const currentX = p1.x + (p2.x - p1.x) * subProgress;
    const currentY = p1.y + (p2.y - p1.y) * subProgress;

    return { x: currentX, y: currentY };
  }, [waypoints, currentProgressPct]);

  return (
    <div className={`w-full flex flex-col gap-2 ${className}`}>
      {/* Top Switcher Bar between Live AIS Radar and Vector Schematic */}
      <div className="flex items-center justify-end px-1">
        <div className="inline-flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 text-xs shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('live-radar')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'live-radar'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live AIS Radar</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('vector')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
              viewMode === 'vector'
                ? 'bg-slate-700 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Vector Chart</span>
          </button>
        </div>
      </div>

      {viewMode === 'live-radar' ? (
        <LiveSeaRouteMap
          containerNumber={containerNumber}
          originPort={originPort}
          destinationPort={destinationPort}
          vesselName={vesselName}
          voyageNumber={voyageNumber}
          currentProgressPct={currentProgressPct}
          departureDate={departureDate}
          estimatedArrival={estimatedArrival}
          status={status}
          containersList={containersList}
          selectedContainerId={selectedContainerId}
          onSelectContainer={onSelectContainer}
        />
      ) : (
        /* Legacy Vector Schematic View */
        <div className="w-full rounded-2xl bg-[var(--panel)] border border-[var(--border)] overflow-hidden shadow-sm flex flex-col">
          {/* Header Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[var(--border)] bg-[var(--background)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--accent-gold)] text-white shadow-md">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {vesselName}
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-[var(--panel)] border border-[var(--border)] text-[var(--text-secondary)]">
                    {voyageNumber}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>Container: <strong className="font-mono text-[var(--text-primary)]">{containerNumber}</strong></span>
                  <span>•</span>
                  <span className="text-emerald-500 font-semibold">{status}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {containersList && containersList.length > 0 && onSelectContainer && (
                <div className="flex items-center gap-2 bg-[var(--panel)] px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-sm hover:border-[var(--accent-gold)] transition-colors">
                  <Navigation className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
                  <label htmlFor="ocean-container-select-legacy" className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Container:
                  </label>
                  <select
                    id="ocean-container-select-legacy"
                    value={selectedContainerId || containersList.find(c => c.containerNumber === containerNumber)?.id || ''}
                    onChange={(e) => onSelectContainer(e.target.value)}
                    className="bg-transparent text-xs font-mono font-bold text-[var(--text-primary)] outline-none cursor-pointer pr-1 py-0.5"
                  >
                    {containersList.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[var(--panel)] text-[var(--text-primary)] font-mono">
                        {c.containerNumber} — {c.progress}% ({c.destinationPort || 'In Transit'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
                  Estimated Arrival
                </span>
                <span className="text-sm font-bold text-[var(--accent-gold)]">
                  {etaDays} Days Remaining
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <span>{currentProgressPct}% Completed</span>
              </div>
            </div>
          </div>

          {/* Interactive Oceanic Map Canvas */}
          <div className="relative w-full h-72 bg-gradient-to-b from-[#0e1e2d] to-[#0a1622] p-4 overflow-hidden select-none">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

            <svg viewBox="0 0 720 280" className="w-full h-full">
              <path
                d="M 60 70 Q 110 50 140 100 T 110 200 Q 80 220 50 180 Z"
                fill="#162c42"
                opacity="0.35"
              />
              <path
                d="M 240 60 Q 340 40 400 90 T 360 140 Q 280 160 250 120 Z"
                fill="#162c42"
                opacity="0.35"
              />
              <path
                d="M 270 150 Q 380 140 420 220 T 310 260 Q 250 240 260 180 Z"
                fill="#162c42"
                opacity="0.35"
              />
              <path
                d="M 430 70 Q 560 50 660 110 T 600 240 Q 480 200 450 140 Z"
                fill="#162c42"
                opacity="0.35"
              />

              <path
                d="M 80 130 C 180 135, 220 140, 280 140 C 340 140, 390 155, 440 160 C 480 165, 500 200, 520 220 C 560 240, 600 200, 640 170"
                fill="none"
                stroke="#1e3a58"
                strokeWidth="4"
                strokeLinecap="round"
              />

              <path
                d="M 80 130 C 180 135, 220 140, 280 140 C 340 140, 390 155, 440 160 C 480 165, 500 200, 520 220 C 560 240, 600 200, 640 170"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="6 6"
                className="animate-pulse"
              />

              {waypoints.map((wp, idx) => (
                <g 
                  key={idx} 
                  transform={`translate(${wp.x}, ${wp.y})`}
                  className="cursor-pointer transition-transform duration-200 hover:scale-125"
                  onClick={() => setSelectedWaypoint(idx)}
                >
                  <circle 
                    cx="0" 
                    cy="0" 
                    r={wp.status === 'destination' ? '8' : '6'} 
                    fill={
                      wp.status === 'completed' ? '#10b981' : 
                      wp.status === 'active' ? '#D4AF37' : 
                      wp.status === 'destination' ? '#f59e0b' : '#334155'
                    } 
                    stroke="#ffffff" 
                    strokeWidth="2"
                    className={wp.status === 'active' ? 'animate-pulse' : ''}
                  />
                  <text 
                    x="0" 
                    y="18" 
                    fill="#94a3b8" 
                    fontSize="9" 
                    fontWeight="bold" 
                    textAnchor="middle" 
                    className="select-none font-mono"
                  >
                    {wp.code}
                  </text>
                </g>
              ))}

              <g 
                transform={`translate(${shipPos.x}, ${shipPos.y})`}
                className="transition-all duration-700 ease-out"
              >
                <circle cx="0" cy="0" r="14" fill="none" stroke="#D4AF37" strokeWidth="1.5" className="animate-ping" opacity="0.6" />
                <circle cx="0" cy="0" r="10" fill="#D4AF37" stroke="#ffffff" strokeWidth="2" />
                <path
                  d="M -4 -3 L 4 -3 L 0 5 Z"
                  fill="#000000"
                  transform="rotate(90)"
                />
              </g>
            </svg>

            <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md rounded-xl p-2.5 border border-white/10 text-white flex items-center gap-3 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="font-bold leading-none text-[11px]">{originPort.split('(')[0]} → {destinationPort.split('(')[0]}</p>
                <p className="text-[9px] text-neutral-400 mt-0.5">Speed: 19.4 Knots • Course: 088° E • Deep Ocean Passage</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] border-t border-[var(--border)] bg-[var(--panel)]">
            {waypoints.map((wp, idx) => (
              <div 
                key={idx} 
                className={`p-3 text-left transition-colors cursor-pointer ${
                  selectedWaypoint === idx ? 'bg-[var(--accent-gold)]/10' : 'hover:bg-[var(--background)]'
                }`}
                onClick={() => setSelectedWaypoint(idx)}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${
                    wp.status === 'completed' ? 'bg-emerald-500' : wp.status === 'active' ? 'bg-[var(--accent-gold)] animate-pulse' : 'bg-[var(--border)]'
                  }`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] truncate">
                    {wp.code}
                  </span>
                </div>
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {wp.name}
                </p>
                <span className="text-[10px] text-[var(--text-secondary)] mt-0.5 block">
                  {wp.date}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
