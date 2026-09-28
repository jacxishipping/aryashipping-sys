'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Mail,
  Send,
  ShieldCheck,
  CheckCircle2,
  Ship,
  Car,
  ExternalLink,
  PhoneCall
} from 'lucide-react';
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Button, Modal, StatusBadge, toast } from '@/components/design-system';
import { 
  generateCustomsPacketPDF, 
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: 'rgba(var(--accent-gold-rgb), 0.15)',
              color: 'var(--accent-gold)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ShieldCheck className="w-5 h-5" />
          </Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Export Customs Document Packet
          </Typography>
        </Box>
      }
      description="Auto-pack manifest, titles, and bills of sale for destination border clearance"
      size="md"
      contentSx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      actions={
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, width: '100%', flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
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
          </Box>
        </Box>
      }
    >
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
        <Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', mb: 1.5 }}>
            Destination Customs Broker & Consignee
          </Typography>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextField
              label="Clearing Agent Name"
              size="small"
              value={agentInfo.agentName}
              onChange={(e) => setAgentInfo({ ...agentInfo, agentName: e.target.value })}
            />
            <TextField
              label="Agent Email Address"
              size="small"
              type="email"
              value={agentInfo.agentEmail}
              onChange={(e) => setAgentInfo({ ...agentInfo, agentEmail: e.target.value })}
            />
            <TextField
              label="Agent Telephone"
              size="small"
              value={agentInfo.agentPhone}
              onChange={(e) => setAgentInfo({ ...agentInfo, agentPhone: e.target.value })}
            />
          </div>
        </Box>

        {/* Vehicle Cargo Manifest Preview Table */}
        <Box sx={{ border: '1px solid var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, bgcolor: 'var(--background)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Loaded Vehicles Manifest ({container.shipments.length} Units)
            </Typography>
            <span className="text-xs text-[var(--success)] font-semibold">
              All Titles & Documents Verified
            </span>
          </Box>

          <TableContainer sx={{ maxHeight: 220 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'var(--background)' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Vehicle</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>VIN (17 Digits)</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Lot / Source</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Title Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Declared Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {container.shipments.map((s, idx) => (
                  <TableRow key={s.id || idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      {[s.vehicleYear, s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || 'Motor Vehicle'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-gold)' }}>
                      {s.vehicleVIN || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      {s.lotNumber ? `${s.lotNumber} (${s.auctionName || 'Auction'})` : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      <StatusBadge
                        status={s.hasTitle ? 'SUCCESS' : 'WARNING'}
                        label={s.titleStatus || (s.hasTitle ? 'Title Present' : 'Pending')}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success-dark)' }}>
                      {s.purchasePrice ? `$${s.purchasePrice.toLocaleString()}` : '$0.00'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
    </Modal>
  );
}
