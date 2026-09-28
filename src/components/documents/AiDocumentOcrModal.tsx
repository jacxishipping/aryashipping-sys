'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Ship,
  Car,
  DollarSign,
  Tag,
  Key,
  ShieldCheck,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import {
  Box,
  Typography,
  Chip,
  TextField,
  CircularProgress
} from '@mui/material';
import { Button, Modal, Select, toast } from '@/components/design-system';

export interface ExtractedDocumentData {
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
  suggestedCategory?: string;
  suggestedName?: string;
  summary?: string;
  confidenceNotes?: string;
  extractedTextPreview?: string;
}

interface AiDocumentOcrModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultCategory?: string;
}

export function AiDocumentOcrModal({
  open,
  onClose,
  onSuccess,
  defaultCategory = 'OTHER'
}: AiDocumentOcrModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedDocumentData | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Editable Form Fields after extraction
  const [formData, setFormData] = useState({
    vin: '',
    year: '',
    make: '',
    model: '',
    lotNumber: '',
    auctionName: 'Copart',
    purchasePrice: '',
    buyerName: '',
    titleStatus: 'CLEAN TITLE',
    hasKeys: true,
    hasTitle: true,
    category: defaultCategory,
  });

  const handleFileSelect = async (selectedFile: File) => {
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const hasValidExt = validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast.error('Please upload a PDF, PNG, or JPG of your auction gate pass, dock receipt, BOL, or title.');
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error('File size exceeds the 20MB limit.');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setExtractedData(null);

    try {
      // 1. Upload to storage
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('folder', 'ocr-intake');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload document for OCR analysis.');
      }

      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.url;
      setUploadedUrl(fileUrl);

      // 2. Call AI extraction endpoint
      const extractRes = await fetch('/api/ai/document-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'shipment-intake',
          fileUrl,
          fileName: selectedFile.name,
          fileType: selectedFile.type || 'application/pdf',
          categoryHint: defaultCategory,
        }),
      });

      if (!extractRes.ok) {
        const errJson = await extractRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'AI document parsing failed.');
      }

      const result: ExtractedDocumentData = await extractRes.json();
      setExtractedData(result);

      // Populate form
      setFormData({
        vin: result.vin || '',
        year: result.year ? String(result.year) : '',
        make: result.make || '',
        model: result.model || '',
        lotNumber: result.lotNumber || '',
        auctionName: result.auctionName || 'Copart',
        purchasePrice: result.purchasePrice ? String(result.purchasePrice) : '',
        buyerName: result.buyerName || '',
        titleStatus: result.titleStatus || 'CLEAN TITLE',
        hasKeys: result.hasKeys !== undefined ? result.hasKeys : true,
        hasTitle: result.hasTitle !== undefined ? result.hasTitle : true,
        category: result.suggestedCategory || defaultCategory,
      });

      toast.success('Document OCR Analysis Complete! Fields auto-extracted.');
    } catch (err: any) {
      console.error('OCR Error:', err);
      toast.error(err.message || 'Could not parse document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleCreateDraftShipment = async () => {
    if (!formData.vin) {
      toast.error('Please ensure a valid VIN is entered.');
      return;
    }

    setIsCreatingShipment(true);
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleVIN: formData.vin,
          vehicleYear: formData.year ? parseInt(formData.year, 10) : undefined,
          vehicleMake: formData.make || undefined,
          vehicleModel: formData.model || undefined,
          lotNumber: formData.lotNumber || undefined,
          auctionName: formData.auctionName || undefined,
          purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
          hasKey: formData.hasKeys,
          hasTitle: formData.hasTitle,
          titleStatus: formData.titleStatus || 'CLEAN TITLE',
          status: 'ON_HAND',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create draft shipment.');
      }

      const created = await res.json();
      toast.success('Draft Shipment Created from OCR Document!');
      onSuccess?.();
      onClose();
      if (created.id) {
        router.push(`/dashboard/shipments/${created.id}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not create draft shipment.');
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleSaveAsDocument = async () => {
    if (!file || !uploadedUrl) {
      toast.error('No document uploaded.');
      return;
    }

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          fileUrl: uploadedUrl,
          fileType: file.type || 'application/pdf',
          fileSize: file.size,
          category: formData.category,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save document.');
      }

      toast.success('Document saved to repository.');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save document.');
    }
  };

  const resetModal = () => {
    setFile(null);
    setExtractedData(null);
    setUploadedUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
            <Sparkles className="w-5 h-5" />
          </Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            AI Document OCR & Auto-Intake
          </Typography>
        </Box>
      }
      description="Auto-extract VIN, specs, weights & consignee from Copart, IAAI, Manheim, BOL or Title"
      size="md"
      actions={
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, width: '100%', flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>

          {extractedData && (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAsDocument}
                icon={<FileText className="w-4 h-4" />}
              >
                Save Document
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateDraftShipment}
                loading={isCreatingShipment}
                icon={<Car className="w-4 h-4" />}
              >
                1-Click Create Shipment
              </Button>
            </Box>
          )}
        </Box>
      }
    >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileSelect(e.target.files[0]);
            }
          }}
        />

        {!file && (
          <Box
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed',
              borderColor: isDragging ? 'var(--accent-gold)' : 'var(--border)',
              borderRadius: 3,
              p: 5,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragging ? 'rgba(var(--accent-gold-rgb), 0.05)' : 'var(--background)',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'var(--accent-gold)',
                bgcolor: 'rgba(var(--accent-gold-rgb), 0.02)',
              },
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
                color: 'var(--accent-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <UploadCloud className="w-7 h-7" />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', mb: 0.5 }}>
              Click to upload or drag & drop shipping documents
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxW: '400px', mx: 'auto' }}>
              Supported: Copart Sales Receipts, IAAI Invoices, Manheim Gate Passes, Carrier Bills of Lading, Dock Receipts, Certificate of Titles (PDF, PNG, JPG up to 20MB)
            </Typography>
          </Box>
        )}

        {isProcessing && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={36} sx={{ color: 'var(--accent-gold)', mb: 2 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Analyzing Document with Multimodal OCR...
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', mt: 0.5 }}>
              Extracting 17-digit VIN, vehicle year/make/model, buyer specs, and pricing
            </Typography>
          </Box>
        )}

        {file && !isProcessing && extractedData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Success Banner */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <Box>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    AI Extraction Successful: {file.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {extractedData.confidenceNotes || 'All primary fields extracted. Please review below.'}
                  </Typography>
                </Box>
              </Box>
              <Button size="sm" variant="ghost" onClick={resetModal} className="text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Scan Another
              </Button>
            </Box>

            {/* Extracted Fields Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField
                label="VIN (17 Characters)"
                size="small"
                fullWidth
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                slotProps={{
                  input: {
                    style: { fontFamily: 'monospace', fontWeight: 700 },
                  },
                }}
              />
              <TextField
                label="Vehicle Year"
                size="small"
                fullWidth
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              />
              <TextField
                label="Vehicle Make"
                size="small"
                fullWidth
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              />
              <TextField
                label="Vehicle Model"
                size="small"
                fullWidth
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
              <TextField
                label="Lot / Stock #"
                size="small"
                fullWidth
                value={formData.lotNumber}
                onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
              />
              <Select
                label="Auction / Source"
                size="small"
                value={formData.auctionName}
                onChange={(value) => setFormData({ ...formData, auctionName: String(value) as any })}
                options={['Copart', 'IAAI', 'Impact', 'Manheim', 'Other'].map((name) => ({ value: name, label: name }))}
              />
              <TextField
                label="Purchase Price ($ USD)"
                size="small"
                fullWidth
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              />
              <TextField
                label="Title Document Status"
                size="small"
                fullWidth
                value={formData.titleStatus}
                onChange={(e) => setFormData({ ...formData, titleStatus: e.target.value })}
              />
              <Select
                label="Document Category"
                size="small"
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: String(value) })}
                options={['INVOICE', 'BILL_OF_LADING', 'TITLE', 'CUSTOMS', 'INSURANCE', 'OTHER'].map((c) => ({ value: c, label: c.replace(/_/g, ' ') }))}
              />
            </div>
          </Box>
        )}
    </Modal>
  );
}
