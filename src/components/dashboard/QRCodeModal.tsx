'use client';

import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Printer, Check } from 'lucide-react';
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
        <div className="flex gap-2 justify-end w-full">
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
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        {/* Printable Label Preview Card */}
        <div ref={printAreaRef}>
          <div className="border-2 border-dashed border-[var(--border)] rounded-2xl p-6 bg-white text-zinc-950 shadow-sm">
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-zinc-950 pb-3 mb-4">
              <div>
                <div className="font-black text-xl tracking-wider text-zinc-950">
                  JACXI SHIPPING
                </div>
                <div className="text-xs text-zinc-500 uppercase font-semibold">
                  Yard Manifest Verification Tag
                </div>
              </div>
              <div className="px-3 py-1 bg-zinc-950 text-white rounded font-extrabold text-xs tracking-wider">
                {data.type}
              </div>
            </div>

            {/* Code identifier */}
            <div className="text-center my-3">
              <span className="text-xs text-zinc-500 uppercase font-bold block">
                {data.type === 'SHIPMENT' ? 'Vehicle VIN' : 'Container Number'}
              </span>
              <span className="text-2xl font-black tracking-widest text-zinc-950 block mt-0.5">
                {data.code}
              </span>
            </div>

            {/* QR Code */}
            <div className="flex justify-center py-4">
              <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
                <QRCode
                  value={data.trackingUrl}
                  size={160}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                  viewBox={`0 0 256 256`}
                />
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 border-t border-zinc-200 pt-4 mt-2">
              {data.metadata?.customerName && (
                <div>
                  <span className="text-[0.68rem] text-zinc-500 uppercase font-bold block">
                    Consignee / Customer
                  </span>
                  <span className="text-sm font-bold text-zinc-950 block">
                    {data.metadata.customerName}
                  </span>
                </div>
              )}
              {data.metadata?.destination && (
                <div>
                  <span className="text-[0.68rem] text-zinc-500 uppercase font-bold block">
                    Destination Port
                  </span>
                  <span className="text-sm font-bold text-zinc-950 block">
                    {data.metadata.destination}
                  </span>
                </div>
              )}
              {data.metadata?.bookingNumber && (
                <div>
                  <span className="text-[0.68rem] text-zinc-500 uppercase font-bold block">
                    Booking #
                  </span>
                  <span className="text-sm font-bold text-zinc-950 block">
                    {data.metadata.bookingNumber}
                  </span>
                </div>
              )}
              {data.metadata?.vesselName && (
                <div>
                  <span className="text-[0.68rem] text-zinc-500 uppercase font-bold block">
                    Vessel
                  </span>
                  <span className="text-sm font-bold text-zinc-950 block">
                    {data.metadata.vesselName}
                  </span>
                </div>
              )}
            </div>

            <div className="text-center text-[0.7rem] text-zinc-500 mt-4 break-all">
              {data.trackingUrl}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
