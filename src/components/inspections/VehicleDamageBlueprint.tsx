'use client';

import React, { useState, useRef, useMemo } from 'react';
import {
  BlueprintViewType,
  DamageMarker,
  SEVERITY_CONFIG,
  DAMAGE_TYPE_LABELS,
} from '@/types/vehicle-inspection';
import { Layers, Eye, Info, Sparkles, X, Camera, AlertCircle } from 'lucide-react';

interface VehicleDamageBlueprintProps {
  markers: DamageMarker[];
  activeView?: BlueprintViewType | 'all';
  onViewChange?: (view: BlueprintViewType | 'all') => void;
  onPinClick?: (marker: DamageMarker) => void;
  onAddPin?: (view: BlueprintViewType, x: number, y: number, suggestedZone: string) => void;
  readOnly?: boolean;
  selectedMarkerId?: string | null;
  className?: string;
  showThumbnailPreviews?: boolean;
}

/**
 * Intelligent zone detection algorithm based on normalized (x, y) coordinates (0-100%)
 */
export function detectVehicleZone(view: BlueprintViewType, x: number, y: number): string {
  if (view === 'top') {
    if (y < 16) return 'Front Bumper / Grille';
    if (y < 35) {
      if (x < 28) return 'Front Left Fender';
      if (x > 72) return 'Front Right Fender';
      return 'Hood / Engine Bonnet';
    }
    if (y < 48) return 'Windshield';
    if (y < 68) {
      if (x < 24) return 'Driver Door (Front)';
      if (x > 76) return 'Passenger Door (Front)';
      return 'Roof / Sunroof';
    }
    if (y < 80) {
      if (x < 24) return 'Driver Door (Rear)';
      if (x > 76) return 'Passenger Door (Rear)';
      return 'Rear Glass / Window';
    }
    if (y < 92) {
      if (x < 28) return 'Left Rear Quarter Panel';
      if (x > 72) return 'Right Rear Quarter Panel';
      return 'Trunk / Tailgate Lid';
    }
    return 'Rear Bumper';
  }

  if (view === 'left') {
    // Driver side profile (Left to right: Front -> Rear)
    if (x < 14) return 'Front Bumper (Left)';
    if (x < 32) {
      if (y > 60) return 'Front Left Wheel & Rim';
      return 'Front Left Fender';
    }
    if (x < 54) {
      if (y < 44) return 'Driver Side Mirror & Glass';
      if (y > 78) return 'Driver Side Rocker Panel';
      return 'Driver Front Door';
    }
    if (x < 74) {
      if (y < 44) return 'Rear Left Passenger Glass';
      if (y > 78) return 'Left Rocker Panel (Rear)';
      return 'Driver Rear Door';
    }
    if (x < 90) {
      if (y > 60) return 'Rear Left Wheel & Rim';
      return 'Left Rear Quarter Panel';
    }
    return 'Rear Bumper (Left)';
  }

  if (view === 'right') {
    // Passenger side profile (Left to right: Rear -> Front)
    if (x < 12) return 'Rear Bumper (Right)';
    if (x < 28) {
      if (y > 60) return 'Rear Right Wheel & Rim';
      return 'Right Rear Quarter Panel';
    }
    if (x < 48) {
      if (y < 44) return 'Rear Right Passenger Glass';
      if (y > 78) return 'Right Rocker Panel (Rear)';
      return 'Passenger Rear Door';
    }
    if (x < 70) {
      if (y < 44) return 'Passenger Side Mirror & Glass';
      if (y > 78) return 'Passenger Side Rocker Panel';
      return 'Passenger Front Door';
    }
    if (x < 88) {
      if (y > 60) return 'Front Right Wheel & Rim';
      return 'Front Right Fender';
    }
    return 'Front Bumper (Right)';
  }

  if (view === 'front') {
    if (y > 65) return 'Front Lower Bumper / Air Dam';
    if (y > 45) {
      if (x < 30) return 'Front Left Headlight / Fog';
      if (x > 70) return 'Front Right Headlight / Fog';
      return 'Front Grille / Radiator';
    }
    if (y > 25) return 'Hood Front Edge';
    return 'Windshield / Rearview Mirror';
  }

  if (view === 'rear') {
    if (y > 68) {
      if (x < 25 || x > 75) return 'Rear Bumper Corner / Exhaust';
      return 'Rear Bumper / Diffuser';
    }
    if (y > 44) {
      if (x < 30) return 'Left Taillight Assembly';
      if (x > 70) return 'Right Taillight Assembly';
      return 'Trunk / Liftgate Handle';
    }
    return 'Rear Window / Back Glass';
  }

  return 'Exterior Body Panel';
}

export default function VehicleDamageBlueprint({
  markers,
  activeView = 'top',
  onViewChange,
  onPinClick,
  onAddPin,
  readOnly = false,
  selectedMarkerId,
  className = '',
  showThumbnailPreviews = true,
}: VehicleDamageBlueprintProps) {
  const [internalView, setInternalView] = useState<BlueprintViewType | 'all'>(activeView);
  const [hoveredMarker, setHoveredMarker] = useState<DamageMarker | null>(null);
  const [hoveredCoords, setHoveredCoords] = useState<{ x: number; y: number } | null>(null);

  const currentView = onViewChange ? activeView : internalView;

  const handleViewSelect = (v: BlueprintViewType | 'all') => {
    if (onViewChange) {
      onViewChange(v);
    } else {
      setInternalView(v);
    }
  };

  const handleCanvasClick = (view: BlueprintViewType, e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !onAddPin) return;

    // Check if click was directly on an existing pin marker
    const target = e.target as HTMLElement;
    if (target.closest('[data-pin-marker="true"]')) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.max(2, Math.min(98, Math.round(rawX * 10) / 10));
    const clampedY = Math.max(2, Math.min(98, Math.round(rawY * 10) / 10));

    const detectedZone = detectVehicleZone(view, clampedX, clampedY);
    onAddPin(view, clampedX, clampedY, detectedZone);
  };

  // Group markers by view
  const markersByView = useMemo(() => {
    const map: Record<BlueprintViewType, DamageMarker[]> = {
      top: [],
      left: [],
      right: [],
      front: [],
      rear: [],
    };
    markers.forEach((m) => {
      if (map[m.view]) {
        map[m.view].push(m);
      }
    });
    return map;
  }, [markers]);

  // Render a specific view angle
  const renderAngleView = (view: BlueprintViewType, isGridItem = false) => {
    const viewMarkers = markersByView[view] || [];

    return (
      <div
        key={view}
        className={`relative flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#04070e] p-3 shadow-inner select-none transition-all ${
          isGridItem ? 'min-h-[220px]' : 'min-h-[360px] md:min-h-[420px]'
        } ${!readOnly ? 'cursor-crosshair hover:border-[var(--accent-gold)]/60' : ''}`}
        onClick={(e) => handleCanvasClick(view, e)}
        title={!readOnly ? `Click to place damage pin on ${view.toUpperCase()} view` : undefined}
      >
        {/* Subtle Engineering Grid Background */}
        <div
          className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.4) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* View Header Badge */}
        <div className="absolute top-2.5 left-3 z-10 flex items-center gap-2">
          <span className="rounded-md border border-cyan-500/30 bg-cyan-950/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-cyan-300 uppercase shadow-sm">
            {view === 'top' && 'Top Plan'}
            {view === 'left' && 'Driver Side (L)'}
            {view === 'right' && 'Passenger Side (R)'}
            {view === 'front' && 'Front Elevation'}
            {view === 'rear' && 'Rear Elevation'}
          </span>
          {viewMarkers.length > 0 && (
            <span className="rounded-full bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
              {viewMarkers.length} {viewMarkers.length === 1 ? 'Pin' : 'Pins'}
            </span>
          )}
        </div>

        {!readOnly && !isGridItem && (
          <div className="absolute top-2.5 right-3 z-10 hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-700/60 pointer-events-none">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>Tap anywhere to mark damage</span>
          </div>
        )}

        {/* The SVG Vehicle Blueprint */}
        <div className="relative w-full h-full max-w-[500px] flex items-center justify-center p-2">
          {view === 'top' && <TopViewBlueprintSVG />}
          {view === 'left' && <SideViewBlueprintSVG side="left" />}
          {view === 'right' && <SideViewBlueprintSVG side="right" />}
          {view === 'front' && <FrontViewBlueprintSVG />}
          {view === 'rear' && <RearViewBlueprintSVG />}

          {/* Render Pin Markers */}
          {viewMarkers.map((marker) => {
            const isSelected = selectedMarkerId === marker.id;
            const isHovered = hoveredMarker?.id === marker.id;
            const sev = SEVERITY_CONFIG[marker.severity] || SEVERITY_CONFIG.MEDIUM;

            return (
              <div
                key={marker.id}
                data-pin-marker="true"
                style={{
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer transition-transform duration-150 ${
                  isSelected ? 'scale-125 z-30' : 'hover:scale-125'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onPinClick?.(marker);
                }}
                onMouseEnter={(e) => {
                  setHoveredMarker(marker);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredCoords({ x: rect.x + rect.width / 2, y: rect.y });
                }}
                onMouseLeave={() => {
                  setHoveredMarker(null);
                  setHoveredCoords(null);
                }}
              >
                {/* Ping animation for high / critical severity */}
                {(marker.severity === 'CRITICAL' || marker.severity === 'HIGH') && (
                  <span
                    className="absolute -inset-1 rounded-full animate-ping opacity-75"
                    style={{ backgroundColor: sev.color }}
                  />
                )}

                {/* Pin Circle Indicator */}
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full font-bold text-[11px] shadow-lg border-2"
                  style={{
                    backgroundColor: sev.color,
                    borderColor: '#ffffff',
                    color: '#ffffff',
                    boxShadow: `0 0 10px ${sev.color}`,
                  }}
                >
                  {marker.pinNumber}
                </div>

                {/* Mini Pin Zone Tag */}
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-tight shadow pointer-events-none"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    color: sev.color,
                    border: `1px solid ${sev.border}`,
                  }}
                >
                  #{marker.pinNumber} {marker.zone}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleViewSelect('top')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentView === 'top'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-sm'
                : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            🚗 Top Plan
            {markersByView.top.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-inherit font-bold">
                {markersByView.top.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleViewSelect('left')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentView === 'left'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-sm'
                : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            🚙 Driver Side (L)
            {markersByView.left.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-inherit font-bold">
                {markersByView.left.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleViewSelect('right')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentView === 'right'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-sm'
                : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            🚙 Passenger Side (R)
            {markersByView.right.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-inherit font-bold">
                {markersByView.right.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleViewSelect('front')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentView === 'front'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-sm'
                : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            🚘 Front Face
            {markersByView.front.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-inherit font-bold">
                {markersByView.front.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleViewSelect('rear')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentView === 'rear'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-sm'
                : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            🚘 Rear Face
            {markersByView.rear.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-inherit font-bold">
                {markersByView.rear.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleViewSelect('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentView === 'all'
                ? 'bg-[var(--accent-gold)] text-black font-semibold shadow-sm'
                : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>5-Angle Overview</span>
          </button>
        </div>

        {/* Severity Legend */}
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Minor
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Mod
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Major
          </span>
        </div>
      </div>

      {/* Blueprint Canvas View */}
      {currentView === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="md:col-span-2 lg:col-span-1">{renderAngleView('top', true)}</div>
          <div>{renderAngleView('left', true)}</div>
          <div>{renderAngleView('right', true)}</div>
          <div>{renderAngleView('front', true)}</div>
          <div>{renderAngleView('rear', true)}</div>
        </div>
      ) : (
        renderAngleView(currentView)
      )}

      {/* Pin Hover / Preview Tooltip Drawer */}
      {hoveredMarker && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 shadow-md transition-all flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0"
              style={{
                backgroundColor: SEVERITY_CONFIG[hoveredMarker.severity]?.color || '#f97316',
              }}
            >
              {hoveredMarker.pinNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[var(--text-primary)]">
                  {hoveredMarker.zone}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
                  style={{
                    backgroundColor: SEVERITY_CONFIG[hoveredMarker.severity]?.bg,
                    color: SEVERITY_CONFIG[hoveredMarker.severity]?.color,
                  }}
                >
                  {DAMAGE_TYPE_LABELS[hoveredMarker.damageType] || hoveredMarker.damageType} (
                  {SEVERITY_CONFIG[hoveredMarker.severity]?.label})
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                {hoveredMarker.description || 'No description provided'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hoveredMarker.photos.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-2 py-1 rounded">
                <Camera className="w-3.5 h-3.5" />
                {hoveredMarker.photos.length} Photo{hoveredMarker.photos.length > 1 ? 's' : ''}
              </span>
            )}
            {hoveredMarker.estimatedCost && hoveredMarker.estimatedCost > 0 && (
              <span className="text-xs font-bold text-[var(--accent-gold)]">
                ${hoveredMarker.estimatedCost.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// HIGH-FIDELITY VECTOR BLUEPRINT SCHEMATIC COMPONENTS
// =========================================================================

function TopViewBlueprintSVG() {
  return (
    <svg
      viewBox="0 0 400 700"
      className="w-full max-h-[360px] md:max-h-[400px] text-cyan-400/80 drop-shadow-[0_0_12px_rgba(6,182,212,0.15)]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Vehicle Chassis Silhouette */}
      <path
        d="M 120 40 
           C 140 25, 260 25, 280 40
           C 310 55, 330 90, 335 150
           C 340 210, 345 360, 345 490
           C 345 570, 340 610, 320 645
           C 300 675, 260 685, 200 685
           C 140 685, 100 675, 80 645
           C 60 610, 55 570, 55 490
           C 55 360, 60 210, 65 150
           C 70 90, 90 55, 120 40 Z"
        stroke="currentColor"
        strokeWidth="3.5"
        fill="rgba(15, 23, 42, 0.4)"
      />

      {/* Front Bumper & Grille Contours */}
      <path d="M 100 70 C 150 50, 250 50, 300 70" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <path d="M 130 50 C 160 40, 240 40, 270 50" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
      
      {/* Headlights */}
      <polygon points="85,60 115,65 105,100 80,90" stroke="#38bdf8" strokeWidth="2" fill="rgba(56, 189, 248, 0.15)" />
      <polygon points="315,60 285,65 295,100 320,90" stroke="#38bdf8" strokeWidth="2" fill="rgba(56, 189, 248, 0.15)" />

      {/* Hood Character Lines */}
      <path d="M 115 110 C 135 180, 140 220, 130 250" stroke="currentColor" strokeWidth="1.8" opacity="0.6" />
      <path d="M 285 110 C 265 180, 260 220, 270 250" stroke="currentColor" strokeWidth="1.8" opacity="0.6" />
      <path d="M 155 80 L 155 230" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
      <path d="M 245 80 L 245 230" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

      {/* Windshield */}
      <path
        d="M 110 255 L 290 255 L 275 340 L 125 340 Z"
        stroke="#38bdf8"
        strokeWidth="2.5"
        fill="rgba(56, 189, 248, 0.08)"
      />
      {/* Rearview mirror */}
      <circle cx="200" cy="270" r="5" fill="#38bdf8" opacity="0.7" />

      {/* Side Mirrors */}
      <path d="M 68 250 C 45 240, 40 260, 65 270 Z" stroke="currentColor" strokeWidth="2" fill="rgba(15, 23, 42, 0.8)" />
      <path d="M 332 250 C 355 240, 360 260, 335 270 Z" stroke="currentColor" strokeWidth="2" fill="rgba(15, 23, 42, 0.8)" />

      {/* Roof & Sunroof */}
      <rect x="140" y="360" width="120" height="90" rx="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
      <line x1="85" y1="380" x2="315" y2="380" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <line x1="85" y1="460" x2="315" y2="460" stroke="currentColor" strokeWidth="1" opacity="0.25" />

      {/* Door Separation Seams */}
      <line x1="60" y1="360" x2="115" y2="360" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <line x1="340" y1="360" x2="285" y2="360" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <line x1="58" y1="480" x2="115" y2="480" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <line x1="342" y1="480" x2="285" y2="480" stroke="currentColor" strokeWidth="2" opacity="0.7" />

      {/* Rear Window */}
      <path
        d="M 125 490 L 275 490 L 290 565 L 110 565 Z"
        stroke="#38bdf8"
        strokeWidth="2.5"
        fill="rgba(56, 189, 248, 0.08)"
      />

      {/* Trunk Lid & Rear Spoiler */}
      <path d="M 115 580 C 160 595, 240 595, 285 580" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <path d="M 110 635 C 160 655, 240 655, 290 635" stroke="currentColor" strokeWidth="2.5" opacity="0.8" />

      {/* Taillights */}
      <polygon points="75,615 105,625 100,645 72,635" stroke="#ef4444" strokeWidth="2" fill="rgba(239, 68, 68, 0.3)" />
      <polygon points="325,615 295,625 300,645 328,635" stroke="#ef4444" strokeWidth="2" fill="rgba(239, 68, 68, 0.3)" />

      {/* Label Overlays for Clear Guidance */}
      <text x="200" y="160" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="600" opacity="0.6">HOOD</text>
      <text x="200" y="300" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="600" opacity="0.6">WINDSHIELD</text>
      <text x="200" y="420" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="600" opacity="0.6">ROOF</text>
      <text x="200" y="530" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="600" opacity="0.6">REAR GLASS</text>
      <text x="200" y="615" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="600" opacity="0.6">TRUNK</text>
      <text x="90" y="420" textAnchor="middle" fill="#94a3b8" fontSize="10" opacity="0.6" transform="rotate(-90 90 420)">DRIVER DOORS</text>
      <text x="310" y="420" textAnchor="middle" fill="#94a3b8" fontSize="10" opacity="0.6" transform="rotate(90 310 420)">PASSENGER DOORS</text>
    </svg>
  );
}

function SideViewBlueprintSVG({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left';
  return (
    <svg
      viewBox="0 0 800 320"
      className="w-full max-h-[320px] text-cyan-400/80 drop-shadow-[0_0_12px_rgba(6,182,212,0.15)]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: isLeft ? 'none' : 'scaleX(-1)' }}
    >
      {/* Outer Silhouette */}
      <path
        d="M 50 220 
           L 30 210
           C 20 190, 30 170, 70 160
           L 180 150
           C 240 145, 270 95, 340 75
           C 400 60, 560 60, 610 85
           C 660 110, 700 145, 750 160
           C 775 168, 785 185, 775 210
           L 750 225
           L 680 225
           C 680 175, 590 175, 590 225
           L 290 225
           C 290 175, 200 175, 200 225
           L 50 225 Z"
        stroke="currentColor"
        strokeWidth="3.5"
        fill="rgba(15, 23, 42, 0.4)"
      />

      {/* Greenhouse / Windows */}
      <path
        d="M 280 145 
           L 345 85 
           L 460 82 
           L 460 145 Z"
        stroke="#38bdf8"
        strokeWidth="2"
        fill="rgba(56, 189, 248, 0.1)"
      />
      <path
        d="M 475 82 
           L 590 85 
           C 640 105, 665 130, 680 145 
           L 475 145 Z"
        stroke="#38bdf8"
        strokeWidth="2"
        fill="rgba(56, 189, 248, 0.1)"
      />

      {/* Side Mirror */}
      <path d="M 315 135 C 295 125, 290 145, 310 150 Z" stroke="currentColor" strokeWidth="2" fill="rgba(15, 23, 42, 0.8)" />

      {/* Door Cutouts */}
      <line x1="260" y1="148" x2="250" y2="222" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <line x1="468" y1="83" x2="468" y2="222" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <line x1="595" y1="145" x2="575" y2="222" stroke="currentColor" strokeWidth="2" opacity="0.7" />

      {/* Door Handles */}
      <rect x="420" y="152" width="28" height="6" rx="3" stroke="currentColor" strokeWidth="1.5" fill="rgba(255,255,255,0.2)" />
      <rect x="525" y="152" width="28" height="6" rx="3" stroke="currentColor" strokeWidth="1.5" fill="rgba(255,255,255,0.2)" />

      {/* Wheels & Rims */}
      <g>
        <circle cx="245" cy="225" r="45" stroke="currentColor" strokeWidth="3" fill="#090d16" />
        <circle cx="245" cy="225" r="30" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 3" fill="rgba(56, 189, 248, 0.15)" />
        <circle cx="245" cy="225" r="8" fill="#38bdf8" />
      </g>
      <g>
        <circle cx="635" cy="225" r="45" stroke="currentColor" strokeWidth="3" fill="#090d16" />
        <circle cx="635" cy="225" r="30" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 3" fill="rgba(56, 189, 248, 0.15)" />
        <circle cx="635" cy="225" r="8" fill="#38bdf8" />
      </g>

      {/* Headlight & Taillight wraps */}
      <path d="M 45 175 L 85 165" stroke="#38bdf8" strokeWidth="3" />
      <path d="M 760 175 L 725 170" stroke="#ef4444" strokeWidth="3" />

      {/* Rocker Panel */}
      <line x1="290" y1="222" x2="590" y2="222" stroke="currentColor" strokeWidth="3" opacity="0.8" />

      {/* Labels */}
      <g style={{ transform: isLeft ? 'none' : 'scaleX(-1) translate(-800px, 0)' }}>
        <text x="140" y="180" textAnchor="middle" fill="#94a3b8" fontSize="11" opacity="0.6">FRONT FENDER</text>
        <text x="370" y="190" textAnchor="middle" fill="#94a3b8" fontSize="11" opacity="0.6">FRONT DOOR</text>
        <text x="525" y="190" textAnchor="middle" fill="#94a3b8" fontSize="11" opacity="0.6">REAR DOOR</text>
        <text x="705" y="180" textAnchor="middle" fill="#94a3b8" fontSize="11" opacity="0.6">QUARTER PANEL</text>
      </g>
    </svg>
  );
}

function FrontViewBlueprintSVG() {
  return (
    <svg
      viewBox="0 0 500 350"
      className="w-full max-h-[320px] text-cyan-400/80 drop-shadow-[0_0_12px_rgba(6,182,212,0.15)]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Front Body Silhouette */}
      <path
        d="M 140 70 
           C 180 50, 320 50, 360 70
           L 410 145
           C 445 165, 455 195, 450 255
           L 435 285
           L 65 285
           L 50 255
           C 45 195, 55 165, 90 145 Z"
        stroke="currentColor"
        strokeWidth="3.5"
        fill="rgba(15, 23, 42, 0.4)"
      />

      {/* Windshield */}
      <path
        d="M 145 75 L 355 75 L 395 140 L 105 140 Z"
        stroke="#38bdf8"
        strokeWidth="2.5"
        fill="rgba(56, 189, 248, 0.1)"
      />
      <circle cx="250" cy="90" r="5" fill="#38bdf8" opacity="0.7" />

      {/* Mirrors */}
      <path d="M 90 130 C 50 120, 50 145, 85 150 Z" stroke="currentColor" strokeWidth="2" fill="rgba(15, 23, 42, 0.8)" />
      <path d="M 410 130 C 450 120, 450 145, 415 150 Z" stroke="currentColor" strokeWidth="2" fill="rgba(15, 23, 42, 0.8)" />

      {/* Hood Leading Edge */}
      <path d="M 100 160 C 180 170, 320 170, 400 160" stroke="currentColor" strokeWidth="2" opacity="0.7" />

      {/* Headlights */}
      <polygon points="75,170 140,165 130,195 70,190" stroke="#38bdf8" strokeWidth="2" fill="rgba(56, 189, 248, 0.2)" />
      <polygon points="425,170 360,165 370,195 430,190" stroke="#38bdf8" strokeWidth="2" fill="rgba(56, 189, 248, 0.2)" />

      {/* Grille */}
      <rect x="160" y="170" width="180" height="45" rx="6" stroke="currentColor" strokeWidth="2" fill="rgba(15, 23, 42, 0.8)" />
      <line x1="170" y1="185" x2="330" y2="185" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
      <line x1="170" y1="200" x2="330" y2="200" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />

      {/* Lower Bumper & Fog Lights */}
      <path d="M 60 230 C 150 245, 350 245, 440 230" stroke="currentColor" strokeWidth="2.5" opacity="0.8" />
      <circle cx="100" cy="250" r="10" stroke="#38bdf8" strokeWidth="1.5" />
      <circle cx="400" cy="250" r="10" stroke="#38bdf8" strokeWidth="1.5" />
      <rect x="190" y="240" width="120" height="25" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />

      {/* Front Tires visible */}
      <rect x="65" y="275" width="40" height="25" rx="4" fill="#090d16" stroke="currentColor" strokeWidth="2" />
      <rect x="395" y="275" width="40" height="25" rx="4" fill="#090d16" stroke="currentColor" strokeWidth="2" />

      {/* Labels */}
      <text x="250" y="110" textAnchor="middle" fill="#38bdf8" fontSize="12" opacity="0.6">WINDSHIELD</text>
      <text x="250" y="197" textAnchor="middle" fill="#94a3b8" fontSize="11" opacity="0.6">GRILLE</text>
      <text x="250" y="257" textAnchor="middle" fill="#94a3b8" fontSize="11" opacity="0.6">FRONT BUMPER</text>
    </svg>
  );
}

function RearViewBlueprintSVG() {
  return (
    <svg
      viewBox="0 0 500 350"
      className="w-full max-h-[320px] text-cyan-400/80 drop-shadow-[0_0_12px_rgba(6,182,212,0.15)]"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rear Body Silhouette */}
      <path
        d="M 140 70 
           C 180 50, 320 50, 360 70
           L 410 145
           C 445 165, 455 195, 450 255
           L 435 285
           L 65 285
           L 50 255
           C 45 195, 55 165, 90 145 Z"
        stroke="currentColor"
        strokeWidth="3.5"
        fill="rgba(15, 23, 42, 0.4)"
      />

      {/* Rear Window / Back Glass */}
      <path
        d="M 150 78 L 350 78 L 390 140 L 110 140 Z"
        stroke="#38bdf8"
        strokeWidth="2.5"
        fill="rgba(56, 189, 248, 0.1)"
      />
      {/* Defroster lines */}
      <line x1="130" y1="95" x2="370" y2="95" stroke="#38bdf8" strokeWidth="0.8" opacity="0.3" />
      <line x1="120" y1="115" x2="380" y2="115" stroke="#38bdf8" strokeWidth="0.8" opacity="0.3" />

      {/* Trunk Seam */}
      <path d="M 95 155 C 180 160, 320 160, 405 155" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <path d="M 120 160 L 120 225 L 380 225 L 380 160" stroke="currentColor" strokeWidth="2" opacity="0.7" />

      {/* Taillights */}
      <polygon points="70,165 130,165 125,195 65,190" stroke="#ef4444" strokeWidth="2" fill="rgba(239, 68, 68, 0.3)" />
      <polygon points="430,165 370,165 375,195 435,190" stroke="#ef4444" strokeWidth="2" fill="rgba(239, 68, 68, 0.3)" />

      {/* License Plate Recess */}
      <rect x="200" y="175" width="100" height="35" rx="4" stroke="currentColor" strokeWidth="1.5" fill="rgba(15, 23, 42, 0.9)" />
      <text x="250" y="197" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="bold" opacity="0.5">JACXI EXPORT</text>

      {/* Rear Bumper & Exhaust Tips */}
      <path d="M 60 235 C 150 250, 350 250, 440 235" stroke="currentColor" strokeWidth="2.5" opacity="0.8" />
      <rect x="90" y="270" width="30" height="12" rx="4" stroke="#e2e8f0" strokeWidth="1.5" fill="#334155" />
      <rect x="380" y="270" width="30" height="12" rx="4" stroke="#e2e8f0" strokeWidth="1.5" fill="#334155" />

      {/* Rear Tires */}
      <rect x="65" y="275" width="40" height="25" rx="4" fill="#090d16" stroke="currentColor" strokeWidth="2" />
      <rect x="395" y="275" width="40" height="25" rx="4" fill="#090d16" stroke="currentColor" strokeWidth="2" />

      {/* Labels */}
      <text x="250" y="112" textAnchor="middle" fill="#38bdf8" fontSize="12" opacity="0.6">REAR GLASS</text>
      <text x="250" y="248" textAnchor="middle" fill="#94a3b8" fontSize="11" opacity="0.6">REAR BUMPER</text>
    </svg>
  );
}
