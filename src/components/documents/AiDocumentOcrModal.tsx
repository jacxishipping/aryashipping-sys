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
import { Button, FormField, Modal, Select, toast } from '@/components/design-system';

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
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[rgba(var(--accent-gold-rgb),0.15)] text-[var(--accent-gold)] flex items-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-base font-bold text-[var(--text-primary)]">
            AI Document OCR & Auto-Intake
          </span>
        </div>
      }
      description="Auto-extract VIN, specs, weights & consignee from Copart, IAAI, Manheim, BOL or Title"
      size="md"
      actions={
        <div className="flex justify-between items-center gap-2 w-full flex-wrap">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>

          {extractedData && (
            <div className="flex gap-2">
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
            </div>
          )}
        </div>
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
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.05)]'
              : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)] hover:bg-[rgba(var(--accent-gold-rgb),0.02)]'
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-[rgba(var(--accent-gold-rgb),0.1)] text-[var(--accent-gold)] flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-7 h-7" />
          </div>
          <p className="font-bold text-sm text-[var(--text-primary)] mb-1">
            Click to upload or drag & drop shipping documents
          </p>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            Supported: Copart Sales Receipts, IAAI Invoices, Manheim Gate Passes, Carrier Bills of Lading, Dock Receipts, Certificate of Titles (PDF, PNG, JPG up to 20MB)
          </p>
        </div>
      )}

      {isProcessing && (
        <div className="py-12 text-center">
          <Loader2 className="w-9 h-9 text-[var(--accent-gold)] animate-spin mx-auto mb-3" />
          <p className="font-bold text-sm text-[var(--text-primary)]">
            Analyzing Document with Multimodal OCR...
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Extracting 17-digit VIN, vehicle year/make/model, buyer specs, and pricing
          </p>
        </div>
      )}

      {file && !isProcessing && extractedData && (
        <div className="flex flex-col gap-3">
          {/* Success Banner */}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">
                  AI Extraction Successful: {file.name}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)]">
                  {extractedData.confidenceNotes || 'All primary fields extracted. Please review below.'}
                </div>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={resetModal} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Scan Another
            </Button>
          </div>

          {/* Extracted Fields Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField
              label="VIN (17 Characters)"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
            />
            <FormField
              label="Vehicle Year"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            />
            <FormField
              label="Vehicle Make"
              value={formData.make}
              onChange={(e) => setFormData({ ...formData, make: e.target.value })}
            />
            <FormField
              label="Vehicle Model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            />
            <FormField
              label="Lot / Stock #"
              value={formData.lotNumber}
              onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
            />
            <Select
              label="Auction / Source"
              value={formData.auctionName}
              onChange={(value) => setFormData({ ...formData, auctionName: String(value) as any })}
              options={['Copart', 'IAAI', 'Impact', 'Manheim', 'Other'].map((name) => ({ value: name, label: name }))}
            />
            <FormField
              label="Purchase Price ($ USD)"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
            />
            <FormField
              label="Title Document Status"
              value={formData.titleStatus}
              onChange={(e) => setFormData({ ...formData, titleStatus: e.target.value })}
            />
            <Select
              label="Document Category"
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: String(value) })}
              options={['INVOICE', 'BILL_OF_LADING', 'TITLE', 'CUSTOMS', 'INSURANCE', 'OTHER'].map((c) => ({ value: c, label: c.replace(/_/g, ' ') }))}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
