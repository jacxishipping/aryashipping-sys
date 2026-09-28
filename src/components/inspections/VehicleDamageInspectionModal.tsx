'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  BlueprintViewType,
  DamageMarker,
  DamageSeverity,
  DamageType,
  VehicleInspectionData,
  VehicleConditionGrade,
  FuelLevel,
  KeyStatus,
  DrivableStatus,
  WindshieldCondition,
  AirbagStatus,
  TireCondition,
  SEVERITY_CONFIG,
  DAMAGE_TYPE_LABELS,
  GRADE_CONFIG,
} from '@/types/vehicle-inspection';
import VehicleDamageBlueprint, { detectVehicleZone } from './VehicleDamageBlueprint';
import InspectionConditionReportModal from './InspectionConditionReportModal';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Car,
  Camera,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Sparkles,
  Save,
  Gauge,
  UploadCloud,
  ChevronRight,
  Info,
} from 'lucide-react';
import { toast, CopyButton, Button, Select } from '@/components/design-system';

interface VehicleDamageInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: {
    id: string;
    vehicleYear?: number | null;
    vehicleMake?: string | null;
    vehicleModel?: string | null;
    vehicleVIN?: string | null;
    vehicleColor?: string | null;
    lotNumber?: string | null;
    auctionName?: string | null;
    purchaseLocation?: string | null;
    hasKey?: boolean | null;
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
  };
  onInspectionSaved?: (inspection: VehicleInspectionData) => void;
}

export default function VehicleDamageInspectionModal({
  isOpen,
  onClose,
  shipment,
  onInspectionSaved,
}: VehicleDamageInspectionModalProps) {
  const { data: session } = useSession();

  // Active Blueprint View
  const [activeView, setActiveView] = useState<BlueprintViewType | 'all'>('top');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Pin Edit / Creation Form State
  const [isPinFormOpen, setIsPinFormOpen] = useState(false);
  const [pinFormView, setPinFormView] = useState<BlueprintViewType>('top');
  const [pinFormX, setPinFormX] = useState<number>(50);
  const [pinFormY, setPinFormY] = useState<number>(50);
  const [pinFormZone, setPinFormZone] = useState<string>('');
  const [pinFormDamageType, setPinFormDamageType] = useState<DamageType>('SCRATCH');
  const [pinFormSeverity, setPinFormSeverity] = useState<DamageSeverity>('LOW');
  const [pinFormDescription, setPinFormDescription] = useState<string>('');
  const [pinFormCost, setPinFormCost] = useState<string>('');
  const [pinFormPhotos, setPinFormPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Custody Checklist State
  const [inspectorName, setInspectorName] = useState<string>('');
  const [yardLocation, setYardLocation] = useState<string>('Savannah Port Logistics Center');
  const [odometerReading, setOdometerReading] = useState<string>('');
  const [odometerUnit, setOdometerUnit] = useState<'MILES' | 'KM'>('MILES');
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>('QUARTER');
  const [keyStatus, setKeyStatus] = useState<KeyStatus>(shipment.hasKey ? 'ONE_KEY' : 'NO_KEYS');
  const [drivableStatus, setDrivableStatus] = useState<DrivableStatus>('RUNS_AND_DRIVES');
  const [windshieldCondition, setWindshieldCondition] = useState<WindshieldCondition>('INTACT');
  const [airbagStatus, setAirbagStatus] = useState<AirbagStatus>('INTACT');
  const [tireCondition, setTireCondition] = useState<TireCondition>('ALL_GOOD');
  const [overallGrade, setOverallGrade] = useState<VehicleConditionGrade>('GRADE_B');
  const [driverName, setDriverName] = useState<string>('');
  const [driverLicenseNumber, setDriverLicenseNumber] = useState<string>('');
  const [generalNotes, setGeneralNotes] = useState<string>('');
  const [disclaimerAgreed, setDisclaimerAgreed] = useState<boolean>(true);

  // Markers List
  const [markers, setMarkers] = useState<DamageMarker[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingInspection, setIsLoadingInspection] = useState(false);

  // Condition Report Receipt Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastSavedInspection, setLastSavedInspection] = useState<VehicleInspectionData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize inspector name from session
  useEffect(() => {
    if (session?.user?.name && !inspectorName) {
      setInspectorName(session.user.name);
    }
  }, [session, inspectorName]);

  // Load existing inspection data if available
  useEffect(() => {
    if (!isOpen || !shipment.id) return;

    let isMounted = true;
    setIsLoadingInspection(true);

    fetch(`/api/shipments/${shipment.id}/inspection`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.inspection) return;
        const insp = data.inspection as VehicleInspectionData;
        setMarkers(insp.markers || []);
        if (insp.inspectorName) setInspectorName(insp.inspectorName);
        if (insp.yardLocation) setYardLocation(insp.yardLocation);
        if (insp.odometerReading) setOdometerReading(String(insp.odometerReading));
        if (insp.odometerUnit) setOdometerUnit(insp.odometerUnit);
        if (insp.fuelLevel) setFuelLevel(insp.fuelLevel);
        if (insp.keyStatus) setKeyStatus(insp.keyStatus);
        if (insp.drivableStatus) setDrivableStatus(insp.drivableStatus);
        if (insp.windshieldCondition) setWindshieldCondition(insp.windshieldCondition);
        if (insp.airbagStatus) setAirbagStatus(insp.airbagStatus);
        if (insp.tireCondition) setTireCondition(insp.tireCondition);
        if (insp.overallGrade) setOverallGrade(insp.overallGrade);
        if (insp.driverName) setDriverName(insp.driverName);
        if (insp.driverLicenseNumber) setDriverLicenseNumber(insp.driverLicenseNumber);
        if (insp.generalNotes) setGeneralNotes(insp.generalNotes);
        setLastSavedInspection(insp);
      })
      .catch((err) => {
        console.error('Failed to load existing inspection:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingInspection(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, shipment.id]);

  if (!isOpen) return null;

  // Handler when user clicks on blueprint to add pin
  const handleAddPinFromBlueprint = (
    view: BlueprintViewType,
    x: number,
    y: number,
    suggestedZone: string
  ) => {
    setSelectedMarkerId(null);
    setPinFormView(view);
    setPinFormX(x);
    setPinFormY(y);
    setPinFormZone(suggestedZone);
    setPinFormDamageType('SCRATCH');
    setPinFormSeverity('LOW');
    setPinFormDescription('');
    setPinFormCost('');
    setPinFormPhotos([]);
    setIsPinFormOpen(true);
  };

  // Handler when user clicks an existing pin on the blueprint
  const handlePinClick = (marker: DamageMarker) => {
    setSelectedMarkerId(marker.id);
    setPinFormView(marker.view);
    setPinFormX(marker.x);
    setPinFormY(marker.y);
    setPinFormZone(marker.zone);
    setPinFormDamageType(marker.damageType);
    setPinFormSeverity(marker.severity);
    setPinFormDescription(marker.description);
    setPinFormCost(marker.estimatedCost ? String(marker.estimatedCost) : '');
    setPinFormPhotos(marker.photos || []);
    setIsPinFormOpen(true);
  };

  // Save current pin form
  const handleSavePin = () => {
    if (!pinFormZone.trim()) {
      toast.error('Please specify the body zone/panel');
      return;
    }

    const costNum = pinFormCost ? parseFloat(pinFormCost) : null;

    if (selectedMarkerId) {
      // Edit existing marker
      setMarkers((prev) =>
        prev.map((m) =>
          m.id === selectedMarkerId
            ? {
                ...m,
                view: pinFormView,
                x: pinFormX,
                y: pinFormY,
                zone: pinFormZone.trim(),
                damageType: pinFormDamageType,
                severity: pinFormSeverity,
                description: pinFormDescription.trim(),
                estimatedCost: isNaN(costNum || 0) ? null : costNum,
                photos: pinFormPhotos,
              }
            : m
        )
      );
      toast.success(`Updated damage pin #${selectedMarkerId}`);
    } else {
      // Create new marker
      const newPinNumber = markers.length + 1;
      const newMarker: DamageMarker = {
        id: `dmg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        pinNumber: newPinNumber,
        view: pinFormView,
        x: pinFormX,
        y: pinFormY,
        zone: pinFormZone.trim(),
        damageType: pinFormDamageType,
        severity: pinFormSeverity,
        description: pinFormDescription.trim(),
        estimatedCost: isNaN(costNum || 0) ? null : costNum,
        photos: pinFormPhotos,
        createdAt: new Date().toISOString(),
      };
      setMarkers((prev) => [...prev, newMarker]);
      toast.success(`Placed damage pin #${newPinNumber} on ${newMarker.zone}`);
    }

    setIsPinFormOpen(false);
    setSelectedMarkerId(null);
  };

  // Delete a pin
  const handleDeletePin = (pinId: string) => {
    setMarkers((prev) => {
      const filtered = prev.filter((m) => m.id !== pinId);
      // Re-number pins sequentially
      return filtered.map((m, idx) => ({ ...m, pinNumber: idx + 1 }));
    });
    if (selectedMarkerId === pinId) {
      setIsPinFormOpen(false);
      setSelectedMarkerId(null);
    }
    toast.success('Damage pin removed');
  };

  // Upload or attach photo for pin
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    const newPhotos: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            newPhotos.push(data.url);
            continue;
          }
        }
      } catch (err) {
        console.warn('Direct upload failed, falling back to client base64 storage:', err);
      }

      // Fallback: Read as base64 data URL so yard staff never lose photo attachments
      const base64Url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newPhotos.push(base64Url);
    }

    setPinFormPhotos((prev) => [...prev, ...newPhotos]);
    setIsUploadingPhoto(false);
    toast.success(`Attached ${newPhotos.length} photo(s)`);
  };

  // Build the complete inspection payload
  const currentInspectionPayload: VehicleInspectionData = useMemo(() => {
    const cleanVin = (shipment.vehicleVIN || 'VEH').slice(-6);
    const reportNum =
      lastSavedInspection?.reportNumber ||
      `JACXI-CR-${cleanVin}-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      shipmentId: shipment.id,
      reportNumber: reportNum,
      inspectorName: inspectorName || 'Yard Inspector',
      yardLocation: yardLocation || 'Savannah Terminal',
      inspectedAt: new Date().toISOString(),
      odometerReading: odometerReading ? parseInt(odometerReading, 10) : null,
      odometerUnit,
      fuelLevel,
      keyStatus,
      hasPhysicalKey: keyStatus !== 'NO_KEYS',
      drivableStatus,
      windshieldCondition,
      airbagStatus,
      tireCondition,
      overallGrade,
      markers,
      generalPhotos: [],
      generalNotes: generalNotes || null,
      driverName: driverName || null,
      driverLicenseNumber: driverLicenseNumber || null,
      driverSignatureDate: new Date().toISOString(),
      inspectorSignatureDate: new Date().toISOString(),
      insuranceDisclaimerAgreed: disclaimerAgreed,
    };
  }, [
    shipment.id,
    shipment.vehicleVIN,
    lastSavedInspection?.reportNumber,
    inspectorName,
    yardLocation,
    odometerReading,
    odometerUnit,
    fuelLevel,
    keyStatus,
    drivableStatus,
    windshieldCondition,
    airbagStatus,
    tireCondition,
    overallGrade,
    markers,
    generalNotes,
    driverName,
    driverLicenseNumber,
    disclaimerAgreed,
  ]);

  // Save complete inspection to backend
  const handleSaveInspection = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentInspectionPayload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to save inspection');
      }

      const data = await res.json();
      setLastSavedInspection(data.inspection);
      onInspectionSaved?.(data.inspection);
      toast.success('Vehicle yard condition inspection saved successfully!');
    } catch (err: unknown) {
      console.error('Error saving inspection:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save inspection');
    } finally {
      setIsSaving(false);
    }
  };

  const totalDamageCost = markers.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);
  const vehicleTitle = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
    .filter(Boolean)
    .join(' ') || 'Vehicle';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/20">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    {vehicleTitle}
                  </h2>
                  <span className="font-mono text-xs text-[var(--text-secondary)] bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)]">
                    VIN: {shipment.vehicleVIN || 'N/A'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Yard Intake Damage Blueprint & Export Insurance Certification
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--card)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--border)]/20 transition-all shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>Condition Receipt</span>
              </button>

              <button
                type="button"
                onClick={handleSaveInspection}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-gold)] text-black hover:brightness-110 transition-all shadow-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Inspection'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]/30 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Body (Split Grid: Left Blueprint, Right Form & Checklist) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left 7 Columns: Interactive 2D Blueprint Canvas & Damage Pin Ledger */}
            <div className="lg:col-span-7 space-y-4">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
                    <span>Interactive 2D Vehicle Blueprint</span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Tap or click anywhere on the vehicle body to pin scratches, dents, or broken glass
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    {markers.length} Hotspot{markers.length === 1 ? '' : 's'} Tagged
                  </span>
                  {totalDamageCost > 0 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                      Est. ${totalDamageCost.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* The Blueprint Component */}
              <VehicleDamageBlueprint
                markers={markers}
                activeView={activeView}
                onViewChange={setActiveView}
                onPinClick={handlePinClick}
                onAddPin={handleAddPinFromBlueprint}
                selectedMarkerId={selectedMarkerId}
              />

              {/* Tagged Hotspots Manifest Card */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Tagged Damage Hotspots ({markers.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddPinFromBlueprint(
                        activeView === 'all' ? 'top' : activeView,
                        50,
                        50,
                        'Exterior Body Panel'
                      );
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-gold)] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Pin Manually
                  </button>
                </div>

                {markers.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {markers.map((marker) => {
                      const sev = SEVERITY_CONFIG[marker.severity] || SEVERITY_CONFIG.MEDIUM;
                      const isSelected = selectedMarkerId === marker.id;

                      return (
                        <div
                          key={marker.id}
                          onClick={() => handlePinClick(marker)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                              : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--border)]/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
                              style={{ backgroundColor: sev.color }}
                            >
                              {marker.pinNumber}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[var(--text-primary)]">
                                  {marker.zone}
                                </span>
                                <span
                                  className="px-1.5 py-0.2 rounded text-[10px] font-semibold"
                                  style={{
                                    backgroundColor: sev.bg,
                                    color: sev.color,
                                    border: `1px solid ${sev.border}`,
                                  }}
                                >
                                  {DAMAGE_TYPE_LABELS[marker.damageType]}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">
                                {marker.description || 'Marked on blueprint'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {marker.photos.length > 0 && (
                              <span className="flex items-center gap-1 text-[11px] text-cyan-400">
                                <Camera className="w-3 h-3" /> {marker.photos.length}
                              </span>
                            )}
                            {marker.estimatedCost && (
                              <span className="text-xs font-semibold text-[var(--accent-gold)]">
                                ${marker.estimatedCost.toFixed(2)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePin(marker.id);
                              }}
                              className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-[var(--text-secondary)]">
                    No damage hotspots marked yet. Tap anywhere on the blueprint above to log damage.
                  </p>
                )}
              </div>

            </div>

            {/* Right 5 Columns: Pin Editor Drawer OR Yard Custody Checklist */}
            <div className="lg:col-span-5 space-y-4">
              
              {isPinFormOpen ? (
                /* Add / Edit Pin Flyout */
                <div className="rounded-xl border border-[var(--accent-gold)]/50 bg-[var(--card)] p-4 shadow-lg space-y-3.5 animate-in fade-in-0 duration-200">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent-gold)] text-black text-xs font-bold">
                        {selectedMarkerId
                          ? markers.find((m) => m.id === selectedMarkerId)?.pinNumber || '•'
                          : markers.length + 1}
                      </span>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">
                        {selectedMarkerId ? 'Edit Damage Pin' : 'Place Damage Pin'}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPinFormOpen(false)}
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body Zone Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Body Zone / Vehicle Panel
                    </label>
                    <input
                      type="text"
                      value={pinFormZone}
                      onChange={(e) => setPinFormZone(e.target.value)}
                      placeholder="e.g. Front Bumper, Driver Door, Windshield"
                      className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                    />
                  </div>

                  {/* Damage Type & Severity */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <Select
                        label="Damage Category"
                        value={pinFormDamageType}
                        onChange={(value) => setPinFormDamageType(value as DamageType)}
                        size="small"
                        options={Object.entries(DAMAGE_TYPE_LABELS).map(([key, label]) => ({ value: key, label }))}
                      />
                    </div>

                    <div>
                      <Select
                        label="Severity Level"
                        value={pinFormSeverity}
                        onChange={(value) => setPinFormSeverity(value as DamageSeverity)}
                        size="small"
                        options={[
                          { value: 'LOW', label: 'Minor (Surface scratch, ding)' },
                          { value: 'MEDIUM', label: 'Moderate (Noticeable dent, chip)' },
                          { value: 'HIGH', label: 'Major (Cracked bumper, tear)' },
                          { value: 'CRITICAL', label: 'Critical (Frame / Deployed)' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Description & Observations */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Inspector Description
                    </label>
                    <textarea
                      rows={2}
                      value={pinFormDescription}
                      onChange={(e) => setPinFormDescription(e.target.value)}
                      placeholder="Describe location, scratch length, dent depth, paint condition..."
                      className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                    />
                  </div>

                  {/* Repair Cost Estimate */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Estimated Repair Cost ($ USD, optional)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] font-bold">
                        $
                      </span>
                      <input
                        type="number"
                        step="10"
                        value={pinFormCost}
                        onChange={(e) => setPinFormCost(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                      />
                    </div>
                  </div>

                  {/* Camera & Photo Attachments */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[var(--text-secondary)]">
                        Attach Damage Photos ({pinFormPhotos.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Take Photo / Upload</span>
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      className="hidden"
                      onChange={handlePhotoSelect}
                    />

                    {pinFormPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {pinFormPhotos.map((url, i) => (
                          <div
                            key={i}
                            className="relative aspect-video rounded border border-[var(--border)] overflow-hidden bg-black/40 group"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Damage" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setPinFormPhotos((prev) => prev.filter((_, idx) => idx !== i));
                              }}
                              className="absolute top-1 right-1 p-1 rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                    {selectedMarkerId && (
                      <button
                        type="button"
                        onClick={() => handleDeletePin(selectedMarkerId)}
                        className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Pin</span>
                      </button>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setIsPinFormOpen(false)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:bg-[var(--border)]/20"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePin}
                        className="px-4 py-1.5 rounded-lg bg-[var(--accent-gold)] text-black font-semibold text-xs hover:brightness-110"
                      >
                        {selectedMarkerId ? 'Update Pin' : 'Save Pin'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Custody Checklist Form */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[var(--accent-gold)]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Yard Custody & Mechanical Intake
                    </h4>
                  </div>
                </div>

                {/* Overall Condition Grade */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Overall Condition Grade
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(GRADE_CONFIG).map(([key, item]) => {
                      const isSelected = overallGrade === key;
                      return (
                        <div
                          key={key}
                          onClick={() => setOverallGrade(key as VehicleConditionGrade)}
                          className={`p-2 rounded-lg border cursor-pointer transition-all text-xs ${
                            isSelected
                              ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 font-bold'
                              : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--border)]/80'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-[var(--text-primary)]">{item.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Odometer & Fuel Level */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>Odometer</span>
                    </label>
                    <div className="flex">
                      <input
                        type="number"
                        value={odometerReading}
                        onChange={(e) => setOdometerReading(e.target.value)}
                        placeholder="e.g. 45200"
                        className="w-full px-2.5 py-1.5 rounded-l-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                      />
                      <select
                        value={odometerUnit}
                        onChange={(e) => setOdometerUnit(e.target.value as 'MILES' | 'KM')}
                        className="px-2 py-1.5 rounded-r-lg border border-l-0 border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-secondary)]"
                      >
                        <option value="MILES">mi</option>
                        <option value="KM">km</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Select
                      label="Fuel Level"
                      value={fuelLevel}
                      onChange={(value) => setFuelLevel(value as FuelLevel)}
                      size="small"
                      options={[
                        { value: 'EMPTY', label: 'Empty' },
                        { value: 'QUARTER', label: '1/4 Tank' },
                        { value: 'HALF', label: '1/2 Tank' },
                        { value: 'THREE_QUARTERS', label: '3/4 Tank' },
                        { value: 'FULL', label: 'Full Tank' },
                      ]}
                    />
                  </div>
                </div>

                {/* Key Status & Drivability */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Select
                      label="Keys Present"
                      value={keyStatus}
                      onChange={(value) => setKeyStatus(value as KeyStatus)}
                      size="small"
                      error={keyStatus === 'NO_KEYS' ? 'No keys — yard hold' : undefined}
                      options={[
                        { value: 'TWO_KEYS', label: '✓ 2 Keys Present' },
                        { value: 'ONE_KEY', label: '✓ 1 Key Present' },
                        { value: 'FOB_ONLY', label: '✓ Smart Fob Only' },
                        { value: 'NO_KEYS', label: '⚠️ NO KEYS (Yard Hold)' },
                      ]}
                    />
                  </div>

                  <div>
                    <Select
                      label="Drivability"
                      value={drivableStatus}
                      onChange={(value) => setDrivableStatus(value as DrivableStatus)}
                      size="small"
                      options={[
                        { value: 'RUNS_AND_DRIVES', label: 'Runs & Drives' },
                        { value: 'STARTS_WITH_BOOST', label: 'Starts with Boost/Jump' },
                        { value: 'ENGINE_STARTS_ONLY', label: "Engine Starts (Won't move)" },
                        { value: 'NON_RUNNER_TOW', label: 'Non-Runner (Forklift/Tow)' },
                      ]}
                    />
                  </div>
                </div>

                {/* Glass, Airbags & Tires */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Select
                      label="Windshield"
                      value={windshieldCondition}
                      onChange={(value) => setWindshieldCondition(value as WindshieldCondition)}
                      size="small"
                      options={[
                        { value: 'INTACT', label: 'Intact' },
                        { value: 'CHIPPED', label: 'Chipped' },
                        { value: 'CRACKED', label: 'Cracked' },
                        { value: 'SHATTERED', label: 'Shattered' },
                      ]}
                    />
                  </div>

                  <div>
                    <Select
                      label="Airbags"
                      value={airbagStatus}
                      onChange={(value) => setAirbagStatus(value as AirbagStatus)}
                      size="small"
                      options={[
                        { value: 'INTACT', label: 'Intact' },
                        { value: 'DEPLOYED', label: '⚠️ Deployed' },
                      ]}
                    />
                  </div>

                  <div>
                    <Select
                      label="Tires"
                      value={tireCondition}
                      onChange={(value) => setTireCondition(value as TireCondition)}
                      size="small"
                      options={[
                        { value: 'ALL_GOOD', label: '4 Inflated' },
                        { value: 'ONE_FLAT', label: '1 Flat' },
                        { value: 'MULTIPLE_FLAT', label: 'Multi Flat' },
                        { value: 'MISSING_WHEEL', label: 'Missing' },
                      ]}
                    />
                  </div>
                </div>

                {/* Yard Inspector & Carrier Driver */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[var(--border)]">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Receiving Inspector
                    </label>
                    <input
                      type="text"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      placeholder="Inspector name"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Carrier Tow Driver
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Driver name / Co."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                {/* Export Insurance Disclaimer Checkbox */}
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="disclaimer"
                    checked={disclaimerAgreed}
                    onChange={(e) => setDisclaimerAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                  />
                  <label htmlFor="disclaimer" className="text-[11px] text-[var(--text-secondary)] leading-tight cursor-pointer">
                    <span className="font-semibold text-[var(--text-primary)]">
                      Export Transit Protection:
                    </span>{' '}
                    I certify pre-existing damages noted on this blueprint are excluded from marine carrier transit insurance claims.
                  </label>
                </div>

              </div>

            </div>

          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>Inspection automatically creates audit log & syncs with condition reports</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--border)]/20 transition-all"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--card)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--background)] transition-all shadow-sm"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>Print Condition Receipt</span>
              </button>

              <button
                type="button"
                onClick={handleSaveInspection}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold bg-[var(--accent-gold)] text-black hover:brightness-110 transition-all shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Yard Inspection'}</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Printable Condition Report Receipt Modal */}
      {isReceiptModalOpen && (
        <InspectionConditionReportModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          inspection={currentInspectionPayload}
          shipment={shipment}
        />
      )}
    </>
  );
}
