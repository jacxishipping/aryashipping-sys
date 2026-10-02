'use client';

import { useState, useRef } from 'react';
import { Upload, Sparkles, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Button, toast } from '@/components/design-system';

export interface ExtractedShipmentData {
  vin?: string;
  year?: number | null;
  make?: string;
  model?: string;
  lotNumber?: string;
  auctionName?: 'Copart' | 'IAAI' | 'Impact' | 'Manheim' | 'Other';
  purchasePrice?: number | null;
  buyerName?: string;
  buyerNumber?: string;
  titleStatus?: string;
  hasTitle?: boolean;
  hasKeys?: boolean;
  odometer?: number | null;
  primaryDamage?: string;
  color?: string;
  confidenceNotes?: string;
}

interface AiDocumentAutoFillDropzoneProps {
  onExtracted: (data: ExtractedShipmentData) => void;
  disabled?: boolean;
}

export function AiDocumentAutoFillDropzone({ onExtracted, disabled = false }: AiDocumentAutoFillDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedShipmentData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast.error('Unsupported file format. Please upload a PDF, PNG, or JPG of your Bill of Sale or Title.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds the 15MB limit.');
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setExtractedData(null);

    try {
      // 1. Upload file to server storage
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'shipments');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload document for processing.');
      }

      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.url;

      // 2. Call AI extraction endpoint with shipment-intake mode
      const extractRes = await fetch('/api/ai/document-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'shipment-intake',
          fileUrl,
          fileName: file.name,
          fileType: file.type || 'application/pdf',
        }),
      });

      if (!extractRes.ok) {
        const errorJson = await extractRes.json().catch(() => ({}));
        throw new Error(errorJson.error || 'AI document extraction failed.');
      }

      const extractionResult: ExtractedShipmentData = await extractRes.json();
      setExtractedData(extractionResult);

      // Auto-apply immediately to streamline intake
      onExtracted(extractionResult);
      toast.success('Document analyzed! Vehicle fields auto-populated.');
    } catch (err: any) {
      console.error('AI Document Intake error:', err);
      toast.error(err.message || 'Could not analyze document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const reset = () => {
    setFileName(null);
    setExtractedData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className={`mb-6 p-4 rounded-2xl border transition-all ${
        isDragging
          ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.04)] border-dashed'
          : extractedData
          ? 'border-emerald-500/40 bg-emerald-500/5 border-dashed'
          : 'border-[var(--border)] bg-[var(--panel)] border-dashed'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !isProcessing) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
      />

      {/* Header & Description */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
              Smart Document Auto-Fill
            </h4>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Drop a Copart / IAAI Bill of Sale, Title, or Dock Receipt to auto-populate vehicle & auction info
            </p>
          </div>
        </div>

        {!isProcessing && !extractedData && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            icon={<Upload className="w-3.5 h-3.5" />}
          >
            Upload File
          </Button>
        )}

        {extractedData && (
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Upload Another
          </Button>
        )}
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div className="py-4 flex items-center justify-center gap-2.5">
          <Loader2 className="w-5 h-5 text-[var(--accent-gold)] animate-spin" />
          <span className="text-xs text-[var(--text-secondary)] font-medium">
            Analyzing document with AI... Extracting VIN, Lot #, and vehicle details
          </span>
        </div>
      )}

      {/* Extracted Data Preview Pills */}
      {extractedData && (
        <div className="mt-2 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600">
              Extracted from {fileName}:
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {extractedData.vin && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[rgba(var(--accent-gold-rgb),0.1)] text-[var(--text-primary)] border border-[rgba(var(--accent-gold-rgb),0.3)]">
                VIN: {extractedData.vin}
              </span>
            )}
            {(extractedData.year || extractedData.make || extractedData.model) && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]">
                {[extractedData.year, extractedData.make, extractedData.model].filter(Boolean).join(' ')}
              </span>
            )}
            {extractedData.lotNumber && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]">
                Lot #{extractedData.lotNumber}{extractedData.auctionName ? ` (${extractedData.auctionName})` : ''}
              </span>
            )}
            {extractedData.hasKeys !== undefined && (
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                  extractedData.hasKeys
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                    : 'bg-red-500/10 border-red-500/30 text-red-600'
                }`}
              >
                Keys: {extractedData.hasKeys ? 'Yes' : 'No'}
              </span>
            )}
            {extractedData.titleStatus && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]">
                Title: {extractedData.titleStatus}
              </span>
            )}
            {typeof extractedData.purchasePrice === 'number' && extractedData.purchasePrice > 0 && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-600">
                Price: ${extractedData.purchasePrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
