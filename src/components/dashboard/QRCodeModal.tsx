'use client';

import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { Box, Typography } from '@mui/material';
import { Copy, Download, Printer, QrCode, Check } from 'lucide-react';
import { Modal, Button, toast } from '@/components/design-system';

export interface QRCodeData {
  type: 'SHIPMENT' | 'CONTAINER';
  id: string;
  title: string;
  subtitle?: string;
  code: string; // VIN or Container #
  trackingUrl: string;
  metadata?: {
    customerName?: string;
    origin?: string;
    destination?: string;
    bookingNumber?: string;
    sealNumber?: string;
    vesselName?: string;
    status?: string;
  };
}

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  data: QRCodeData | null;
}

export function QRCodeModal({ open, onClose, data }: QRCodeModalProps) {
  const [copied, setCopied] = React.useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(data.trackingUrl);
      setCopied(true);
      toast.success('Tracking URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy tracking URL');
    }
  };

  const handlePrint = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Yard Label - ${data.code}</title>
          <style>
            @page {
              size: 4in 6in;
              margin: 0.2in;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 10px;
              color: #000;
              background: #fff;
            }
            .label-card {
              border: 2px solid #000;
              border-radius: 8px;
              padding: 16px;
              display: flex;
              flex-direction: column;
              height: calc(100% - 32px);
              box-sizing: border-box;
            }
            .header {
              border-bottom: 2px solid #000;
              padding-bottom: 8px;
              margin-bottom: 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .brand {
              font-size: 20px;
              font-weight: 900;
              letter-spacing: 1px;
            }
            .type-badge {
              font-size: 12px;
              font-weight: 800;
              border: 1px solid #000;
              padding: 2px 6px;
              border-radius: 4px;
            }
            .code-display {
              font-size: 24px;
              font-weight: 900;
              text-align: center;
              margin: 8px 0;
              letter-spacing: 2px;
            }
            .qr-wrapper {
              display: flex;
              justify-content: center;
              margin: 12px 0;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              font-size: 12px;
              margin-top: auto;
              border-top: 1px solid #ccc;
              padding-top: 8px;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
            }
            .meta-label {
              font-size: 9px;
              color: #555;
              text-transform: uppercase;
              font-weight: bold;
            }
            .meta-value {
              font-size: 13px;
              font-weight: bold;
            }
            .footer-url {
              margin-top: 8px;
              font-size: 9px;
              text-align: center;
              color: #666;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yard QR & Barcode Label"
      description={`Generate & print thermal scan stickers for ${data.type.toLowerCase()} verification`}
      size="md"
      actions={
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyUrl}
            icon={copied ? <Check size={16} /> : <Copy size={16} />}
          >
            {copied ? 'Copied' : 'Copy Tracking Link'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            icon={<Printer size={16} />}
          >
            Print Yard Label
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
        {/* Printable Label Preview Card */}
        <div ref={printAreaRef}>
          <Box
            sx={{
              border: '2px dashed var(--border)',
              borderRadius: 3,
              p: 3,
              backgroundColor: '#ffffff',
              color: '#09090b',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Header */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid #09090b',
                pb: 1.5,
                mb: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.05em', color: '#09090b' }}>
                  JACXI SHIPPING
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 600 }}>
                  Yard Manifest Verification Tag
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  backgroundColor: '#09090b',
                  color: '#ffffff',
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                }}
              >
                {data.type}
              </Box>
            </Box>

            {/* Code identifier */}
            <Box sx={{ textAlign: 'center', my: 1.5 }}>
              <Typography sx={{ fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
                {data.type === 'SHIPMENT' ? 'Vehicle VIN' : 'Container Number'}
              </Typography>
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.1em', color: '#09090b' }}>
                {data.code}
              </Typography>
            </Box>

            {/* QR Code */}
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e4e4e7',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <QRCode
                  value={data.trackingUrl}
                  size={160}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  viewBox={`0 0 256 256`}
                />
              </Box>
            </Box>

            {/* Metadata Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.5,
                borderTop: '1px solid #e4e4e7',
                pt: 2,
                mt: 1,
              }}
            >
              {data.metadata?.customerName && (
                <Box>
                  <Typography sx={{ fontSize: '0.68rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
                    Consignee / Customer
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                    {data.metadata.customerName}
                  </Typography>
                </Box>
              )}
              {data.metadata?.destination && (
                <Box>
                  <Typography sx={{ fontSize: '0.68rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
                    Destination Port
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                    {data.metadata.destination}
                  </Typography>
                </Box>
              )}
              {data.metadata?.bookingNumber && (
                <Box>
                  <Typography sx={{ fontSize: '0.68rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
                    Booking #
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                    {data.metadata.bookingNumber}
                  </Typography>
                </Box>
              )}
              {data.metadata?.vesselName && (
                <Box>
                  <Typography sx={{ fontSize: '0.68rem', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
                    Vessel
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#09090b' }}>
                    {data.metadata.vesselName}
                  </Typography>
                </Box>
              )}
            </Box>

            <Typography sx={{ textAlign: 'center', fontSize: '0.7rem', color: '#71717a', mt: 2, wordBreak: 'break-all' }}>
              {data.trackingUrl}
            </Typography>
          </Box>
        </div>
      </Box>
    </Modal>
  );
}
