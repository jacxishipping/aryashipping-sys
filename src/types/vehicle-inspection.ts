export type DamageSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type DamageType =
  | 'SCRATCH'
  | 'DENT'
  | 'CRACK'
  | 'CHIP'
  | 'BROKEN_GLASS'
  | 'MISSING_PART'
  | 'RUST'
  | 'PAINT_PEEL'
  | 'HAIL'
  | 'MECHANICAL'
  | 'FLOOD_WATER'
  | 'OTHER';

export type BlueprintViewType = 'top' | 'left' | 'right' | 'front' | 'rear';

export interface DamageMarker {
  id: string;
  pinNumber: number;
  view: BlueprintViewType;
  x: number; // 0 to 100 (%)
  y: number; // 0 to 100 (%)
  zone: string;
  damageType: DamageType;
  severity: DamageSeverity;
  description: string;
  estimatedCost?: number | null;
  photos: string[];
  createdAt: string;
}

export type FuelLevel = 'EMPTY' | 'QUARTER' | 'HALF' | 'THREE_QUARTERS' | 'FULL';

export type KeyStatus = 'TWO_KEYS' | 'ONE_KEY' | 'FOB_ONLY' | 'NO_KEYS';

export type DrivableStatus =
  | 'RUNS_AND_DRIVES'
  | 'STARTS_WITH_BOOST'
  | 'ENGINE_STARTS_ONLY'
  | 'NON_RUNNER_TOW';

export type WindshieldCondition = 'INTACT' | 'CHIPPED' | 'CRACKED' | 'SHATTERED';

export type AirbagStatus = 'INTACT' | 'DEPLOYED';

export type TireCondition = 'ALL_GOOD' | 'ONE_FLAT' | 'MULTIPLE_FLAT' | 'MISSING_WHEEL';

export type VehicleConditionGrade =
  | 'GRADE_A' // Clean / Minimal Wear
  | 'GRADE_B' // Normal Wear & Tear
  | 'GRADE_C' // Moderate Damage / Salvage Intake
  | 'GRADE_D'; // Heavy Collision / Severe Damage

export interface VehicleInspectionData {
  id?: string;
  shipmentId: string;
  reportNumber: string; // e.g. "JACXI-CR-2026-94812"
  inspectorName: string;
  yardLocation: string;
  inspectedAt: string;

  // Custody Checklist
  odometerReading?: number | null;
  odometerUnit: 'MILES' | 'KM';
  fuelLevel: FuelLevel;
  keyStatus: KeyStatus;
  hasPhysicalKey: boolean;
  drivableStatus: DrivableStatus;
  windshieldCondition: WindshieldCondition;
  airbagStatus: AirbagStatus;
  tireCondition: TireCondition;
  overallGrade: VehicleConditionGrade;

  // Damage Hotspots & Photos
  markers: DamageMarker[];
  generalPhotos: string[];

  // Sign-off & Legal
  generalNotes?: string | null;
  driverName?: string | null;
  driverLicenseNumber?: string | null;
  driverSignatureDate?: string | null;
  inspectorSignatureDate?: string | null;
  insuranceDisclaimerAgreed: boolean;
}

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  SCRATCH: 'Scratch / Scuff',
  DENT: 'Dent / Ding',
  CRACK: 'Crack / Tear',
  CHIP: 'Stone Chip',
  BROKEN_GLASS: 'Broken Glass',
  MISSING_PART: 'Missing Part / Trim',
  RUST: 'Rust / Corrosion',
  PAINT_PEEL: 'Paint Peel / Fade',
  HAIL: 'Hail Damage',
  MECHANICAL: 'Mechanical / Leak',
  FLOOD_WATER: 'Flood / Water Damage',
  OTHER: 'Other Damage',
};

export const SEVERITY_CONFIG: Record<
  DamageSeverity,
  { label: string; color: string; bg: string; border: string; badgeClass: string }
> = {
  LOW: {
    label: 'Minor',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.15)',
    border: 'rgba(234, 179, 8, 0.4)',
    badgeClass: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  MEDIUM: {
    label: 'Moderate',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.4)',
    badgeClass: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  },
  HIGH: {
    label: 'Major',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    badgeClass: 'text-red-400 bg-red-500/10 border-red-500/30',
  },
  CRITICAL: {
    label: 'Critical / Frame',
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.25)',
    border: 'rgba(220, 38, 38, 0.6)',
    badgeClass: 'text-red-300 bg-red-600/20 border-red-500/50',
  },
};

export const GRADE_CONFIG: Record<
  VehicleConditionGrade,
  { label: string; badge: string; color: string; desc: string }
> = {
  GRADE_A: {
    label: 'Grade A - Clean',
    badge: 'Clean / Minimal Wear',
    color: '#22c55e',
    desc: 'No structural or major cosmetic damage. Ready for export.',
  },
  GRADE_B: {
    label: 'Grade B - Normal Wear',
    badge: 'Normal Wear & Tear',
    color: '#3b82f6',
    desc: 'Minor stone chips or small surface scratches consistent with mileage.',
  },
  GRADE_C: {
    label: 'Grade C - Moderate Damage',
    badge: 'Salvage / Moderate Damage',
    color: '#f97316',
    desc: 'Noticeable panel dents, cracks, or auction salvage damage.',
  },
  GRADE_D: {
    label: 'Grade D - Heavy Collision',
    badge: 'Heavy Collision / Total Loss',
    color: '#ef4444',
    desc: 'Major structural frame damage, deployed airbags, or non-rolling unit.',
  },
};
