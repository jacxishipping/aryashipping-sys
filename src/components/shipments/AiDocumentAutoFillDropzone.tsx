'use client';

import { useState, useRef } from 'react';
import { Upload, Sparkles, FileText, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Box, Typography, Chip } from '@mui/material';
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
    <Box
      sx={{
        mb: 2.5,
        p: 2,
        borderRadius: 2.5,
        border: '1px dashed',
        borderColor: isDragging
          ? 'var(--accent-gold)'
          : extractedData
          ? 'rgba(var(--success-rgb), 0.4)'
          : 'rgba(var(--border-rgb), 0.8)',
        bgcolor: isDragging
          ? 'rgba(var(--accent-gold-rgb), 0.04)'
          : extractedData
          ? 'rgba(var(--success-rgb), 0.03)'
          : 'var(--panel)',
        transition: 'all 0.2s ease',
      }}
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
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
      />

      {/* Header & Description */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 1.5,
              bgcolor: 'rgba(var(--accent-gold-rgb), 0.12)',
              color: 'var(--accent-gold)',
            }}
          >
            <Sparkles size={16} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Smart Document Auto-Fill
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Drop a Copart / IAAI Bill of Sale, Title, or Dock Receipt to auto-populate vehicle & auction info
            </Typography>
          </Box>
        </Box>

        {!isProcessing && !extractedData && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="text-xs shrink-0"
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            Upload File
          </Button>
        )}

        {extractedData && (
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Upload Another
          </Button>
        )}
      </Box>

      {/* Processing State */}
      {isProcessing && (
        <Box sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
          <Loader2 className="w-5 h-5 text-[var(--accent-gold)] animate-spin" />
          <Typography sx={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Analyzing document with AI... Extracting VIN, Lot #, and vehicle details
          </Typography>
        </Box>
      )}

      {/* Extracted Data Preview Pills */}
      {extractedData && (
        <Box sx={{ mt: 1, pt: 1.5, borderTop: '1px solid rgba(var(--border-rgb), 0.5)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CheckCircle2 size={15} style={{ color: 'var(--success-dark)' }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success-dark)' }}>
              Extracted from {fileName}:
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {extractedData.vin && (
              <Chip
                label={`VIN: ${extractedData.vin}`}
                size="small"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
                  color: 'var(--text-primary)',
                  border: '1px solid rgba(var(--accent-gold-rgb), 0.3)',
                }}
              />
            )}
            {(extractedData.year || extractedData.make || extractedData.model) && (
              <Chip
                label={[extractedData.year, extractedData.make, extractedData.model].filter(Boolean).join(' ')}
                size="small"
                sx={{ fontSize: '0.75rem', fontWeight: 600, bgcolor: 'var(--background)' }}
              />
            )}
            {extractedData.lotNumber && (
              <Chip
                label={`Lot #${extractedData.lotNumber}${extractedData.auctionName ? ` (${extractedData.auctionName})` : ''}`}
                size="small"
                sx={{ fontSize: '0.75rem', fontWeight: 600, bgcolor: 'var(--background)' }}
              />
            )}
            {extractedData.hasKeys !== undefined && (
              <Chip
                label={`Keys: ${extractedData.hasKeys ? 'Yes' : 'No'}`}
                size="small"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  bgcolor: extractedData.hasKeys ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--error-rgb), 0.1)',
                  color: extractedData.hasKeys ? 'var(--success-dark)' : 'var(--error)',
                }}
              />
            )}
            {extractedData.titleStatus && (
              <Chip
                label={`Title: ${extractedData.titleStatus}`}
                size="small"
                sx={{ fontSize: '0.75rem', fontWeight: 600, bgcolor: 'var(--background)' }}
              />
            )}
            {typeof extractedData.purchasePrice === 'number' && extractedData.purchasePrice > 0 && (
              <Chip
                label={`Price: $${extractedData.purchasePrice.toLocaleString()}`}
                size="small"
                sx={{ fontSize: '0.75rem', fontWeight: 600, bgcolor: 'rgba(var(--info-rgb), 0.1)', color: 'var(--info-dark)' }}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
