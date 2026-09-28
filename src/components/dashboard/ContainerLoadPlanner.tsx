'use client';

import { useState, useMemo } from 'react';
import { 
  Package, 
  Car, 
  Plus, 
  Trash2, 
  Layers, 
  Scale, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Printer, 
  Download,
  Info,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { toast } from '@/components/design-system';

export interface PlannedVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  weightKg: number;
  cbm: number;
  customerName?: string;
  color?: string;
}

export type SlotKey = 'upper_front' | 'upper_rear' | 'lower_front' | 'lower_rear';

export interface ContainerItemSummary {
  id: string;
  containerNumber: string;
  capacity?: string;
}

interface ContainerLoadPlannerProps {
  containerNumber?: string;
  containerType?: '40ft_hc' | '20ft_std' | '45ft_hc';
  availableVehicles?: PlannedVehicle[];
  initialSlots?: Partial<Record<SlotKey, PlannedVehicle | null>>;
  containersList?: ContainerItemSummary[];
  selectedContainerId?: string;
  onSelectContainer?: (containerId: string) => void;
  onSave?: (slots: Record<SlotKey, PlannedVehicle | null>) => void;
  onClose?: () => void;
}

const DEFAULT_CANDIDATE_VEHICLES: PlannedVehicle[] = [
  { id: 'v1', year: 2024, make: 'Mercedes-Benz', model: 'GLE 450 4MATIC', vin: '4JGBB8EB8RA921820', weightKg: 2280, cbm: 14.2, customerName: 'Apex Motor Corp', color: 'Obsidian Black' },
  { id: 'v2', year: 2023, make: 'BMW', model: 'X5 xDrive40i', vin: '5UXCR6C08N9L81234', weightKg: 2200, cbm: 13.8, customerName: 'Gulf Star Trading', color: 'Alpine White' },
  { id: 'v3', year: 2024, make: 'Toyota', model: 'Land Cruiser Prado', vin: 'JTMAB3BV9P5019283', weightKg: 2350, cbm: 15.1, customerName: 'Jebel Ali Imports', color: 'Pearl White' },
  { id: 'v4', year: 2023, make: 'Lexus', model: 'LX 600 VIP', vin: 'JTJHY7AX4N4018273', weightKg: 2650, cbm: 16.4, customerName: 'Emirates Auto Hub', color: 'Sonic Titanium' },
  { id: 'v5', year: 2024, make: 'Porsche', model: 'Cayenne GTS', vin: 'WP1AA2AY7RDA91823', weightKg: 2190, cbm: 13.5, customerName: 'Zayed Motors', color: 'Carmine Red' },
  { id: 'v6', year: 2022, make: 'Range Rover', model: 'Autobiography LWB', vin: 'SALWR2V44NA891234', weightKg: 2580, cbm: 15.8, customerName: 'Baghdad VIP Auto', color: 'Santorini Black' },
];

export function ContainerLoadPlanner({
  containerNumber = 'MSKU9021824',
  containerType = '40ft_hc',
  availableVehicles = DEFAULT_CANDIDATE_VEHICLES,
  initialSlots = {},
  containersList = [],
  selectedContainerId,
  onSelectContainer,
  onSave,
  onClose,
}: ContainerLoadPlannerProps) {
  const [slots, setSlots] = useState<Record<SlotKey, PlannedVehicle | null>>({
    upper_front: initialSlots.upper_front || availableVehicles[0] || null,
    upper_rear: initialSlots.upper_rear || availableVehicles[1] || null,
    lower_front: initialSlots.lower_front || availableVehicles[2] || null,
    lower_rear: initialSlots.lower_rear || null,
  });

  const [activeSlotTarget, setActiveSlotTarget] = useState<SlotKey | null>(null);

  // Maximum rated payload limits
  const MAX_PAYLOAD_KG = containerType === '40ft_hc' ? 28500 : 21700;
  const MAX_VOLUME_CBM = containerType === '40ft_hc' ? 76.4 : 33.2;

  // Track assigned vehicle IDs
  const assignedIds = useMemo(() => {
    return new Set(
      Object.values(slots)
        .filter((v): v is PlannedVehicle => v !== null)
        .map((v) => v.id)
    );
  }, [slots]);

  // Candidate unassigned pool
  const unassignedPool = useMemo(() => {
    return availableVehicles.filter((v) => !assignedIds.has(v.id));
  }, [availableVehicles, assignedIds]);

  // Aggregate metrics
  const totalWeightKg = useMemo(() => {
    return Object.values(slots).reduce((acc, v) => acc + (v?.weightKg || 0), 0);
  }, [slots]);

  const totalCbm = useMemo(() => {
    return Object.values(slots).reduce((acc, v) => acc + (v?.cbm || 0), 0);
  }, [slots]);

  const frontWeight = (slots.upper_front?.weightKg || 0) + (slots.lower_front?.weightKg || 0);
  const rearWeight = (slots.upper_rear?.weightKg || 0) + (slots.lower_rear?.weightKg || 0);
  const frontPct = totalWeightKg > 0 ? Math.round((frontWeight / totalWeightKg) * 100) : 50;
  const rearPct = totalWeightKg > 0 ? Math.round((rearWeight / totalWeightKg) * 100) : 50;

  const isBalanced = frontPct >= 42 && frontPct <= 58;

  const assignVehicleToSlot = (slot: SlotKey, vehicle: PlannedVehicle) => {
    setSlots((prev) => ({ ...prev, [slot]: vehicle }));
    setActiveSlotTarget(null);
    toast.success(`Assigned ${vehicle.year} ${vehicle.make} to ${slot.replace('_', ' ').toUpperCase()}`);
  };

  const clearSlot = (slot: SlotKey) => {
    setSlots((prev) => ({ ...prev, [slot]: null }));
  };

  const resetPlanner = () => {
    setSlots({
      upper_front: null,
      upper_rear: null,
      lower_front: null,
      lower_rear: null,
    });
    toast.info('Cleared all container slots');
  };

  const handleSave = () => {
    if (onSave) onSave(slots);
    toast.success('Container loading plan saved successfully!');
    if (onClose) onClose();
  };

  const renderSlotBox = (slot: SlotKey, label: string, positionLabel: string) => {
    const vehicle = slots[slot];
    const isTarget = activeSlotTarget === slot;

    return (
      <div
        onClick={() => {
          if (!vehicle) setActiveSlotTarget(slot);
        }}
        className={`relative flex flex-col justify-between p-3.5 rounded-xl border-2 transition-all min-h-[140px] ${
          vehicle
            ? 'border-[var(--accent-gold)] bg-[var(--panel)] shadow-sm'
            : isTarget
            ? 'border-dashed border-amber-500 bg-amber-500/10 animate-pulse cursor-pointer'
            : 'border-dashed border-[var(--border)] bg-[var(--background)]/60 hover:border-[var(--accent-gold)]/50 cursor-pointer'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]">
            {positionLabel}
          </span>

          {vehicle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearSlot(slot);
              }}
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--error)] rounded transition-colors"
              title="Remove vehicle from slot"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {vehicle ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
            </div>
            <p className="text-[10px] font-mono text-[var(--text-secondary)] truncate">
              VIN: {vehicle.vin}
            </p>
            <div className="flex items-center justify-between pt-1 text-[10px] text-[var(--text-secondary)] border-t border-[var(--border)]">
              <span>{vehicle.weightKg.toLocaleString()} kg</span>
              <span>{vehicle.cbm} CBM</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center my-auto py-2">
            <Plus className="w-5 h-5 text-[var(--text-secondary)] mb-1 opacity-60" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {isTarget ? 'Select vehicle from queue below' : 'Click to Assign Vehicle'}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-md overflow-hidden flex flex-col">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--accent-gold)] text-white shadow-sm">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                2D Visual Container Load Planner
              </h2>
              <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-[var(--panel)] border border-[var(--border)] text-[var(--accent-gold)]">
                {containerNumber}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              40ft High Cube Ramped Stacking • Dynamic Axle Balance & CBM Gauges
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Container Selector Dropdown */}
          {containersList && containersList.length > 0 && onSelectContainer && (
            <div className="flex items-center gap-2 bg-[var(--panel)] px-3 py-1.5 rounded-xl border border-[var(--border)] shadow-sm hover:border-[var(--accent-gold)] transition-colors">
              <Package className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
              <label htmlFor="planner-container-select" className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Container:
              </label>
              <select
                id="planner-container-select"
                value={selectedContainerId || containersList.find(c => c.containerNumber === containerNumber)?.id || ''}
                onChange={(e) => onSelectContainer(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-[var(--text-primary)] outline-none cursor-pointer pr-1 py-0.5"
              >
                {containersList.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[var(--panel)] text-[var(--text-primary)] font-mono py-1">
                    {c.containerNumber} {c.capacity ? `(${c.capacity})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={resetPlanner}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Bays
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel)]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Container Cutaway Bay & Telemetry */}
      <div className="p-6 space-y-6">
        {/* Container Architectural Cutaway Grid */}
        <div className="relative rounded-2xl border-4 border-neutral-700 bg-neutral-900/90 p-5 shadow-inner text-white">
          <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-2">
            <span className="text-xs font-mono font-bold text-neutral-400">
              FRONT (NOSE WALL) ◄────────────────────────────────────────► REAR (DOOR END)
            </span>
            <span className="text-xs font-bold text-[var(--accent-gold)]">
              {Object.values(slots).filter(Boolean).length} / 4 BAYS LOADED
            </span>
          </div>

          {/* 2-Tier Stack Blueprint */}
          <div className="space-y-4">
            {/* Upper Ramped Tier */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-amber-400">
                <Layers className="w-3.5 h-3.5" />
                <span>UPPER RAMPED VEHICLE TIER</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderSlotBox('upper_front', 'Upper Front Ramp', 'Bay 1: Upper Front')}
                {renderSlotBox('upper_rear', 'Upper Rear Ramp', 'Bay 2: Upper Rear')}
              </div>
            </div>

            {/* Lower Floor Tier */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5 text-xs font-bold text-blue-400">
                <Layers className="w-3.5 h-3.5" />
                <span>LOWER FLOOR VEHICLE TIER</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderSlotBox('lower_front', 'Lower Front Deck', 'Bay 3: Lower Front')}
                {renderSlotBox('lower_rear', 'Lower Rear Deck', 'Bay 4: Lower Rear')}
              </div>
            </div>
          </div>
        </div>

        {/* Live Gauges: Axle Balance & Payload Utilization */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Payload Weight Gauge */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                Gross Vehicle Weight
              </span>
              <Scale className="w-4 h-4 text-[var(--accent-gold)]" />
            </div>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {totalWeightKg.toLocaleString()} <span className="text-xs font-normal text-[var(--text-secondary)]">/ {MAX_PAYLOAD_KG.toLocaleString()} kg</span>
            </p>
            <div className="w-full h-2 rounded-full bg-[var(--border)] mt-2 overflow-hidden">
              <div 
                className="h-full bg-[var(--accent-gold)] transition-all duration-300"
                style={{ width: `${Math.min((totalWeightKg / MAX_PAYLOAD_KG) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Axle Balance Indicator */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                Axle Weight Balance
              </span>
              {isBalanced ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)] mb-1.5">
              <span>Front: {frontPct}%</span>
              <span>Rear: {rearPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 flex overflow-hidden">
              <div className="bg-blue-500 h-full transition-all" style={{ width: `${frontPct}%` }} />
              <div className="bg-amber-500 h-full transition-all" style={{ width: `${rearPct}%` }} />
            </div>
          </div>

          {/* Volume CBM Gauge */}
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">
                CBM Space Utilization
              </span>
              <Package className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-lg font-bold text-[var(--text-primary)]">
              {totalCbm.toFixed(1)} <span className="text-xs font-normal text-[var(--text-secondary)]">/ {MAX_VOLUME_CBM} m³</span>
            </p>
            <div className="w-full h-2 rounded-full bg-[var(--border)] mt-2 overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.min((totalCbm / MAX_VOLUME_CBM) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Unassigned Vehicle Staging Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Pending Vehicles in Yard Queue ({unassignedPool.length})
            </h3>
            {activeSlotTarget && (
              <span className="text-xs font-bold text-amber-500">
                Click any vehicle to place in {activeSlotTarget.replace('_', ' ').toUpperCase()}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unassignedPool.map((veh) => (
              <div
                key={veh.id}
                className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent-gold)] transition-all shadow-sm"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {veh.year} {veh.make} {veh.model}
                  </p>
                  <p className="text-[10px] font-mono text-[var(--text-secondary)] truncate">
                    VIN: {veh.vin}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {veh.weightKg} kg • {veh.cbm} CBM
                  </p>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  {/* Quick Assignment Dropdown / Trigger */}
                  {(['upper_front', 'upper_rear', 'lower_front', 'lower_rear'] as SlotKey[]).map((slot) => {
                    if (slots[slot]) return null;
                    return (
                      <button
                        key={slot}
                        onClick={() => assignVehicleToSlot(slot, veh)}
                        className="px-2 py-0.5 text-[9px] font-bold rounded bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--accent-gold)] hover:text-white transition-colors"
                      >
                        + {slot.split('_')[0].toUpperCase()} {slot.split('_')[1].toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 border-t border-[var(--border)] bg-[var(--background)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              window.print();
              toast.success('Printing loading bay manifest...');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Bay Diagram
          </button>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-[var(--accent-gold)] text-white text-xs font-bold shadow-md hover:opacity-90 transition-opacity"
        >
          <CheckCircle2 className="w-4 h-4" />
          Lock & Save Load Plan
        </button>
      </div>
    </div>
  );
}
