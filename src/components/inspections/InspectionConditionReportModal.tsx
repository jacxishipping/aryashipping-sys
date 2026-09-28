'use client';

import React, { useRef } from 'react';
import {
  VehicleInspectionData,
  SEVERITY_CONFIG,
  DAMAGE_TYPE_LABELS,
  GRADE_CONFIG,
} from '@/types/vehicle-inspection';
import { downloadInspectionReportPDF } from '@/lib/utils/generateInspectionReportPDF';
import {
  Printer,
  Download,
  X,
  ShieldCheck,
  ShieldAlert,
  Car,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Camera,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { toast, CopyButton } from '@/components/design-system';

interface InspectionConditionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: VehicleInspectionData;
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
    user?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
  };
}

export default function InspectionConditionReportModal({
  isOpen,
  onClose,
  inspection,
  shipment,
}: InspectionConditionReportModalProps) {
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      downloadInspectionReportPDF(inspection, shipment);
      toast.success('Official Condition Report PDF generated and downloaded!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to generate PDF. You can use the Print option.');
    }
  };

  const gradeInfo = GRADE_CONFIG[inspection.overallGrade] || GRADE_CONFIG.GRADE_B;
  const totalCost = inspection.markers.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);
  const vehicleTitle = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
    .filter(Boolean)
    .join(' ') || 'Unspecified Vehicle';

  const formattedDate = new Date(inspection.inspectedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      {/* Container Card */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95">
        
        {/* Sticky Action Toolbar (Hidden during print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Condition Report & Damage Receipt
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Export marine transit insurance & custody certification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--card)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--background)] transition-all shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print Receipt</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-gold)] text-black hover:brightness-110 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
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

        {/* Scrollable Printable Document Body */}
        <div ref={printableRef} className="overflow-y-auto p-6 sm:p-8 space-y-6 print:p-0 print:space-y-4 text-slate-900 dark:text-slate-100">
          
          {/* Header & Logo */}
          <div className="rounded-xl border border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-6 text-white shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-wider text-white">JACXI</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-[var(--accent-gold)] text-black">
                    LOGISTICS & SHIPPING
                  </span>
                </div>
                <h1 className="text-lg font-bold text-slate-100 mt-2">
                  VEHICLE INTAKE & DAMAGE CONDITION REPORT
                </h1>
                <p className="text-xs text-slate-300">
                  Pre-Export Yard Verification • Marine Transit Insurance Custody Certificate
                </p>
              </div>

              <div className="text-right">
                <div className="inline-block rounded-md border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 px-3 py-1 text-xs font-mono font-bold text-[var(--accent-gold)]">
                  {inspection.reportNumber}
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Verified: {formattedDate}
                </p>
                <p className="text-xs text-slate-400">
                  Yard: {inspection.yardLocation || 'Main Hub Terminal'}
                </p>
              </div>
            </div>
          </div>

          {/* 2-Column Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Vehicle Particulars */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)] mb-3 pb-1 border-b border-[var(--border)] flex items-center justify-between">
                <span>Vehicle Identification</span>
                <Car className="w-4 h-4 text-[var(--text-secondary)]" />
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-secondary)]">Vehicle:</span>
                  <span className="font-bold text-[var(--text-primary)]">{vehicleTitle}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-secondary)]">VIN:</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {shipment.vehicleVIN || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-secondary)]">Lot # / Auction:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {shipment.lotNumber || 'N/A'} • {shipment.auctionName || 'Private Purchase'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-secondary)]">Color / Location:</span>
                  <span className="text-[var(--text-primary)]">
                    {shipment.vehicleColor || 'Standard'} • {shipment.purchaseLocation || 'USA'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-secondary)]">Owner / Client:</span>
                  <span className="text-[var(--text-primary)] font-medium">
                    {shipment.user?.name || shipment.user?.email || 'Valued Client'}
                  </span>
                </div>
              </div>
            </div>

            {/* Custody Checklist */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)] mb-3 pb-1 border-b border-[var(--border)] flex items-center justify-between">
                <span>Custody & Mechanical State</span>
                <ShieldCheck className="w-4 h-4 text-[var(--text-secondary)]" />
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-[var(--text-secondary)]">Overall Condition Grade:</span>
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-bold"
                    style={{
                      backgroundColor: `${gradeInfo.color}20`,
                      color: gradeInfo.color,
                      border: `1px solid ${gradeInfo.color}50`,
                    }}
                  >
                    {gradeInfo.label}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-secondary)]">Odometer:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {inspection.odometerReading
                      ? `${inspection.odometerReading.toLocaleString()} ${inspection.odometerUnit}`
                      : 'Not recorded / TMU'}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-secondary)]">Physical Keys:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {inspection.keyStatus === 'NO_KEYS' ? '❌ No Keys Present' : `🔑 ${inspection.keyStatus.replace('_', ' ')}`}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-secondary)]">Drivability:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {inspection.drivableStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-[var(--text-secondary)]">Glass & Tires:</span>
                  <span className="text-[var(--text-primary)]">
                    {inspection.windshieldCondition} Windshield • {inspection.tireCondition.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Damage Hotspots Ledger Table */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)]">
                  Cataloged Pre-Existing Damage ({inspection.markers.length} Hotspots)
                </h3>
              </div>
              {totalCost > 0 && (
                <div className="text-xs font-bold text-red-500">
                  Total Estimated Assessment: ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>

            {inspection.markers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] bg-[var(--background)]">
                      <th className="py-2 px-2.5 font-bold w-12 text-center">Pin</th>
                      <th className="py-2 px-2.5 font-bold">Zone / Body Panel</th>
                      <th className="py-2 px-2.5 font-bold">Damage Type</th>
                      <th className="py-2 px-2.5 font-bold">Severity</th>
                      <th className="py-2 px-2.5 font-bold">Description / Observations</th>
                      <th className="py-2 px-2.5 font-bold text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {inspection.markers.map((marker) => {
                      const sev = SEVERITY_CONFIG[marker.severity] || SEVERITY_CONFIG.MEDIUM;
                      return (
                        <tr key={marker.id} className="hover:bg-[var(--border)]/10">
                          <td className="py-2.5 px-2.5 text-center font-bold">
                            <span
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
                              style={{ backgroundColor: sev.color }}
                            >
                              {marker.pinNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 font-semibold text-[var(--text-primary)]">
                            {marker.zone}
                          </td>
                          <td className="py-2.5 px-2.5 text-[var(--text-secondary)]">
                            {DAMAGE_TYPE_LABELS[marker.damageType] || marker.damageType}
                          </td>
                          <td className="py-2.5 px-2.5">
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{
                                backgroundColor: sev.bg,
                                color: sev.color,
                                border: `1px solid ${sev.border}`,
                              }}
                            >
                              {sev.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-[var(--text-secondary)] max-w-xs">
                            {marker.description || 'Marked on blueprint during intake'}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-semibold text-[var(--text-primary)]">
                            {marker.estimatedCost ? `$${marker.estimatedCost.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-emerald-500 font-semibold bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                ✓ No body collision, frame, or cosmetic damage hotspots marked. Vehicle accepted in clean condition.
              </div>
            )}
          </div>

          {/* Photo Evidence Grid (If photos are attached) */}
          {inspection.markers.some((m) => m.photos.length > 0) && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-gold)] flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                <span>Damage Photographic Evidence</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {inspection.markers
                  .flatMap((m) =>
                    m.photos.map((p, idx) => ({
                      photoUrl: p,
                      pinNumber: m.pinNumber,
                      zone: m.zone,
                      idx,
                    }))
                  )
                  .map((item, i) => (
                    <div
                      key={i}
                      className="group relative rounded-lg border border-[var(--border)] overflow-hidden bg-black/40 aspect-video flex items-center justify-center"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.photoUrl}
                        alt={`Pin #${item.pinNumber} - ${item.zone}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 p-1.5 bg-black/80 text-[10px] text-white flex items-center justify-between">
                        <span className="font-bold text-[var(--accent-gold)]">
                          Pin #{item.pinNumber}
                        </span>
                        <span className="truncate max-w-[120px]">{item.zone}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Legal Export Transit Insurance Waiver */}
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs space-y-1.5">
            <h4 className="font-bold text-red-500 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Export Transit Insurance Exclusion & Custody Hand-off Clause</span>
            </h4>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              This Vehicle Condition Report certifies the physical state and cosmetic condition of the above-referenced unit upon intake at the Jacxi Shipping facility. All pre-existing damages noted herein are strictly excluded from marine transit insurance claims against the freight forwarder, loading stevedores, and vessel operators. Signatures below verify the vehicle was inspected jointly by the carrier driver and yard receiving staff. Any damages contested must be submitted in writing within 24 hours of container discharge at the destination port.
            </p>
          </div>

          {/* Signature Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
              <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">
                Yard Receiving Inspector
              </p>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-[var(--text-primary)]">
                  {inspection.inspectorName || 'Authorized Staff'}
                </p>
                <p className="text-[var(--text-secondary)]">Signed & Verified: {formattedDate}</p>
              </div>
              <div className="h-10 border-b-2 border-dashed border-[var(--border)] flex items-end">
                <span className="text-[10px] font-mono text-[var(--text-secondary)] italic">
                  ✓ Verified Electronic Audit Trail
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
              <p className="text-xs font-bold uppercase text-[var(--text-secondary)]">
                Inland Carrier / Tow Driver
              </p>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-[var(--text-primary)]">
                  {inspection.driverName || 'Carrier Driver'}
                </p>
                <p className="text-[var(--text-secondary)]">
                  License/ID: {inspection.driverLicenseNumber || 'Verified at Gate'}
                </p>
              </div>
              <div className="h-10 border-b-2 border-dashed border-[var(--border)] flex items-end">
                <span className="text-[10px] font-mono text-[var(--text-secondary)] italic">
                  Driver Release Sign-off
                </span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-[10px] text-[var(--text-secondary)] pt-4 border-t border-[var(--border)]">
            JACXI Shipping & Logistics • Official Export Custody Certificate • Verification ID: {inspection.reportNumber}
          </div>

        </div>

      </div>
    </div>
  );
}
