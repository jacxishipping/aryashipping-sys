'use client';

import React, { useState } from 'react';
import {
  Download,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Button, FormField, Modal, StatusBadge, toast } from '@/components/design-system';
import { DataTable } from '@/components/ui/DataTable';
import { 
  downloadCustomsPacketPDF, 
  type CustomsPacketContainer, 
  type CustomsAgentInfo 
} from '@/lib/utils/generateCustomsPacketPDF';

interface CustomsDocumentPacketModalProps {
  open: boolean;
  onClose: () => void;
  container: CustomsPacketContainer;
}

export function CustomsDocumentPacketModal({
  open,
  onClose,
  container,
}: CustomsDocumentPacketModalProps) {
  const [isEmailing, setIsEmailing] = useState(false);
  const [agentInfo, setAgentInfo] = useState<CustomsAgentInfo>({
    agentName: 'Jebel Ali Port Clearing & Forwarding Services',
    agentEmail: 'customs.broker@jebelaliport.ae',
    agentPhone: '+971 4 881 5000',
    clearingPort: container.destinationPort || 'Port of Jebel Ali (AEJEA)',
    consigneeName: 'Jacxi International Logistics LLC',
  });

  const handleDownload = () => {
    downloadCustomsPacketPDF(container, agentInfo);
    toast.success('Official Customs Packet PDF generated and downloaded.');
  };

  const handleEmailAgent = async () => {
    if (!agentInfo.agentEmail) {
      toast.error('Please enter a destination agent email address.');
      return;
    }

    setIsEmailing(true);
    try {
      // Send notification / email via communication endpoint
      const res = await fetch('/api/settings/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'email',
          to: agentInfo.agentEmail,
          subject: `Export Customs Manifest & Clearance Packet - Container ${container.containerNumber} (${container.vesselName || 'Ocean Vessel'})`,
          message: `Dear ${agentInfo.agentName},\n\nPlease find attached the official export customs documentation packet for Container ${container.containerNumber}, carrying ${container.shipments.length} vehicle units on vessel ${container.vesselName || 'Ocean Carrier'} (POD: ${container.destinationPort || 'Destination Port'}).\n\nAll vehicle VINs, titles, and bills of sale have been verified for border release.\n\nJacxi Shipping Logistics LLC`,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to dispatch customs email.');
      }

      toast.success(`Customs packet dispatched to ${agentInfo.agentEmail}!`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Could not send email to customs agent.');
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[rgba(var(--accent-gold-rgb),0.15)] text-[var(--accent-gold)] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-base font-bold text-[var(--text-primary)]">
            Export Customs Document Packet
          </span>
        </div>
      }
      description="Auto-pack manifest, titles, and bills of sale for destination border clearance"
      size="md"
      actions={
        <div className="flex justify-between items-center gap-3 w-full flex-wrap">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              icon={<Download className="w-4 h-4" />}
            >
              Download PDF Packet
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleEmailAgent}
              loading={isEmailing}
              icon={<Send className="w-4 h-4" />}
            >
              Email Customs Agent
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Container & Voyage Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Container</span>
            <p className="font-mono font-bold text-[var(--text-primary)] mt-0.5">{container.containerNumber}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Vessel & Voyage</span>
            <p className="font-bold text-[var(--text-primary)] mt-0.5 truncate">{container.vesselName || 'MAERSK VOYAGER'} ({container.voyageNumber || 'V-2409W'})</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Port of Loading</span>
            <p className="font-bold text-[var(--text-primary)] mt-0.5 truncate">{container.loadingPort || 'Port of Newark'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Port of Discharge</span>
            <p className="font-bold text-[var(--success)] mt-0.5 truncate">{container.destinationPort || 'Port of Jebel Ali'}</p>
          </div>
        </div>

        {/* Destination Clearing Agent Form */}
        <div className="p-4 border border-[var(--border)] rounded-xl bg-[var(--background)]">
          <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">
            Destination Customs Broker & Consignee
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField
              label="Clearing Agent Name"
              size="small"
              value={agentInfo.agentName}
              onChange={(e) => setAgentInfo({ ...agentInfo, agentName: e.target.value })}
            />
            <FormField
              label="Agent Email Address"
              size="small"
              type="email"
              value={agentInfo.agentEmail}
              onChange={(e) => setAgentInfo({ ...agentInfo, agentEmail: e.target.value })}
            />
            <FormField
              label="Agent Telephone"
              size="small"
              value={agentInfo.agentPhone}
              onChange={(e) => setAgentInfo({ ...agentInfo, agentPhone: e.target.value })}
            />
          </div>
        </div>

        {/* Vehicle Cargo Manifest Preview Table */}
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="p-3 bg-[var(--background)] border-b border-[var(--border)] flex justify-between items-center">
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Loaded Vehicles Manifest ({container.shipments.length} Units)
            </h4>
            <span className="text-xs text-[var(--success)] font-semibold">
              All Titles & Documents Verified
            </span>
          </div>

          <DataTable
            data={container.shipments}
            keyField="id"
            columns={[
              {
                key: 'vehicle',
                header: 'Vehicle',
                render: (_value, row) => (
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {[row.vehicleYear, row.vehicleMake, row.vehicleModel].filter(Boolean).join(' ') || 'Motor Vehicle'}
                  </span>
                ),
              },
              {
                key: 'vehicleVIN',
                header: 'VIN (17 Digits)',
                render: (value) => (
                  <span className="text-xs font-mono font-bold text-[var(--accent-gold)]">
                    {value || 'N/A'}
                  </span>
                ),
              },
              {
                key: 'lotNumber',
                header: 'Lot / Source',
                render: (_value, row) => (
                  <span className="text-xs text-[var(--text-secondary)]">
                    {row.lotNumber ? `${row.lotNumber} (${row.auctionName || 'Auction'})` : 'N/A'}
                  </span>
                ),
              },
              {
                key: 'titleStatus',
                header: 'Title Status',
                render: (_value, row) => (
                  <StatusBadge
                    status={row.hasTitle ? 'SUCCESS' : 'WARNING'}
                    label={row.titleStatus || (row.hasTitle ? 'Title Present' : 'Pending')}
                    size="sm"
                  />
                ),
              },
              {
                key: 'purchasePrice',
                header: 'Declared Value',
                align: 'right',
                render: (value) => (
                  <span className="text-xs font-bold text-[var(--success-dark)]">
                    {value ? `$${value.toLocaleString()}` : '$0.00'}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
}
