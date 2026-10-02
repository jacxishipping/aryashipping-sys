'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Image as ImageIcon,
  AlertTriangle,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, FormField, Select, StatusBadge, Button } from '@/components/design-system';
import { FileUpload } from '@/components/ui/FileUpload';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';

interface Document {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  uploadedBy: string;
  createdAt: string;
  type: string;
  size: number;
  isPublic?: boolean;
}

interface DocumentManagerProps {
  documents: Document[];
  entityId: string;
  entityType: 'shipment' | 'container';
  readOnly?: boolean;
  onDocumentsChange?: () => void;
}

type ExtractionReview = {
  fileUrl: string;
  fileType: string;
  fileSize: number;
  name: string;
  category: string;
  description: string;
  tags: string[];
  summary: string;
  extractedTextPreview: string;
  failureReason?: string | null;
  extractionMethod?: string;
  ocrAttempted?: boolean;
  aiInteractionLogId?: string;
  isCompanyDocument: boolean;
};

type EditingStatusDocument = {
  id: string;
  name: string;
  isPublic: boolean;
};

export function DocumentManager({
  documents: initialDocs,
  entityId,
  entityType,
  readOnly = false,
  onDocumentsChange,
}: DocumentManagerProps) {
  const router = useRouter();
  const confirmAction = useConfirmAction();
  const [documents, setDocuments] = useState<Document[]>(initialDocs);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [category, setCategory] = useState('OTHER');
  const [isProcessing, setIsProcessing] = useState(false);
  const [review, setReview] = useState<ExtractionReview | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewTags, setReviewTags] = useState('');
  const [isCompanyDocument, setIsCompanyDocument] = useState(false);
  const [statusEditor, setStatusEditor] = useState<EditingStatusDocument | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    setDocuments(initialDocs);
  }, [initialDocs]);

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.message || 'File upload failed');
      }

      const { url } = await uploadRes.json();

      const extractRes = await fetch('/api/ai/document-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'document-review',
          fileUrl: url,
          fileName: file.name,
          fileType: file.type,
          entityType: entityType.toUpperCase(),
          entityId,
          categoryHint: category,
        }),
      });

      const extracted = await extractRes.json().catch(() => ({}));
      if (!extractRes.ok) {
        throw new Error(extracted.error || 'Failed to extract document metadata');
      }

      setReview({
        fileUrl: url,
        fileType: file.type,
        fileSize: file.size,
        name: extracted.suggestedName || file.name,
        category: extracted.suggestedCategory || category,
        description: extracted.description || '',
        tags: Array.isArray(extracted.tags) ? extracted.tags : [],
        summary: extracted.summary || 'No summary available.',
        extractedTextPreview: extracted.extractedTextPreview || 'No extracted text available.',
        failureReason: extracted.failureReason || null,
        extractionMethod: extracted.extractionMethod,
        ocrAttempted: Boolean(extracted.ocrAttempted),
        aiInteractionLogId: extracted.aiInteractionLogId,
        isCompanyDocument,
      });
      setReviewTags(Array.isArray(extracted.tags) ? extracted.tags.join(', ') : '');
      setIsUploadOpen(false);

    } catch (error: any) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const saveReviewedDocument = async () => {
    if (!review) return;

    try {
      setSavingReview(true);
      const payload = {
        name: review.name,
        description: review.description,
        fileUrl: review.fileUrl,
        fileType: review.fileType,
        fileSize: review.fileSize,
        ...(entityType === 'container'
          ? {
              type: review.category,
              notes: `AI extraction review${review.aiInteractionLogId ? ` (${review.aiInteractionLogId})` : ''}: ${review.summary}`,
            }
          : {
              category: review.category,
              shipmentId: entityId,
              isPublic: !review.isCompanyDocument,
              tags: reviewTags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean),
            }),
      };

      const endpoint = entityType === 'container' ? `/api/containers/${entityId}/documents` : '/api/documents';
      const createRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const createdData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        throw new Error(createdData.error || createdData.message || 'Failed to save document metadata');
      }

      const createdDoc = createdData.document;
      if (createdDoc) {
        setDocuments((prev) => [
          {
            id: createdDoc.id,
            name: createdDoc.name,
            fileUrl: createdDoc.fileUrl,
            fileType: createdDoc.fileType,
            fileSize: createdDoc.fileSize,
            category: createdDoc.category || createdDoc.type || review.category,
            uploadedBy: createdDoc.uploadedBy,
            createdAt: (createdDoc.createdAt || createdDoc.uploadedAt || new Date().toISOString()).toString(),
            type: createdDoc.fileType || createdDoc.type || review.fileType,
            size: createdDoc.fileSize || review.fileSize,
            isPublic: createdDoc.isPublic,
          },
          ...prev,
        ]);
      }

      setReview(null);
      setReviewTags('');
      setIsCompanyDocument(false);
      onDocumentsChange?.();
      router.refresh();
      toast.success('Document saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save document');
    } finally {
      setSavingReview(false);
    }
  };

  const handleDelete = async (docId: string) => {
    const confirmed = await confirmAction({
      title: 'Delete Document',
      message: 'Are you sure you want to delete this document? This cannot be undone.',
      confirmText: 'Delete',
      severity: 'error',
    });
    if (!confirmed) return;

    try {
      const endpoint = entityType === 'container'
        ? `/api/containers/${entityId}/documents?documentId=${docId}`
        : `/api/documents/${docId}`;

      const response = await fetch(endpoint, { method: 'DELETE' });

      if (!response.ok) throw new Error('Failed to delete document');

      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      onDocumentsChange?.();
      toast.success('Document deleted');
      router.refresh();
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleOpenStatusEditor = (doc: Document) => {
    setStatusEditor({
      id: doc.id,
      name: doc.name,
      isPublic: doc.isPublic !== false,
    });
  };

  const handleSaveStatus = async () => {
    if (!statusEditor) return;

    try {
      setSavingStatus(true);
      const response = await fetch(`/api/documents/${statusEditor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: statusEditor.isPublic }),
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to update document status');
      }

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === statusEditor.id
            ? {
                ...doc,
                isPublic: statusEditor.isPublic,
              }
            : doc
        )
      );

      setStatusEditor(null);
      onDocumentsChange?.();
      router.refresh();
      toast.success('Document status updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update document status');
    } finally {
      setSavingStatus(false);
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] m-0">
          Documents
        </h2>
        {!readOnly && (
          <Button
            variant="primary"
            size="sm"
            icon={<Upload size={16} />}
            onClick={() => setIsUploadOpen(true)}
          >
            Upload
          </Button>
        )}
      </div>

      {documents.length === 0 ? (
        <div className="p-8 text-center bg-[var(--background)] border border-dashed border-[var(--border)] rounded-xl">
          <FileText className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-2 opacity-50" />
          <p className="text-[var(--text-secondary)] text-sm m-0">
            No documents attached yet
          </p>
        </div>
      ) : (
        <div className="bg-[var(--panel)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">{getIcon(doc.type)}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {doc.name}
                    </span>
                    <StatusBadge
                      status="DEFAULT"
                      label={doc.category.replace(/_/g, ' ')}
                      size="sm"
                    />
                    {doc.isPublic === false ? (
                      <StatusBadge
                        status="WARNING"
                        label="Company Only"
                        size="sm"
                      />
                    ) : null}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {formatSize(doc.size)} • Uploaded by {doc.uploadedBy} • {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!readOnly && entityType === 'shipment' && (
                  <button
                    type="button"
                    onClick={() => handleOpenStatusEditor(doc)}
                    className="p-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                  >
                    Edit Status
                  </button>
                )}
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        open={isUploadOpen}
        onClose={() => {
          if (!isProcessing) {
            setIsUploadOpen(false);
            setIsCompanyDocument(false);
          }
        }}
        title="Upload Documents"
        description="Assign the right category first, then upload a single file. The document becomes searchable once processing finishes."
        disableBackdropClick={true}
        showCloseButton={!isProcessing}
      >
        <div className="flex flex-col gap-4">
          <div className="p-3.5 flex flex-col gap-1 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              Supported formats
            </span>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed m-0">
              PDF, JPG, PNG, DOC, DOCX, XLS, and XLSX. Upload one document at a time so the category and extracted details stay accurate.
            </p>
          </div>
          
          <FormField label="Document Category">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(String(e))}
              disabled={isProcessing}
              options={[
                { value: 'INVOICE', label: 'Invoice' },
                { value: 'BILL_OF_LADING', label: 'Bill of Lading' },
                { value: 'CUSTOMS', label: 'Customs' },
                { value: 'INSURANCE', label: 'Insurance' },
                { value: 'TITLE', label: 'Title' },
                { value: 'INSPECTION_REPORT', label: 'Inspection Report' },
                { value: 'EXPORT_DOCUMENT', label: 'Export Document' },
                { value: 'PACKING_LIST', label: 'Packing List' },
                { value: 'CONTRACT', label: 'Contract' },
                { value: 'PHOTO', label: 'Photo' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </FormField>

          {entityType === 'shipment' && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={isCompanyDocument}
                  onChange={(event) => setIsCompanyDocument(event.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                />
                <span>Company document (hide from customer)</span>
              </label>
              <span className="block text-xs text-[var(--text-secondary)] mt-1">
                Checked documents are visible to internal users only.
              </span>
            </div>
          )}

          <div className="border border-[var(--border)] rounded-xl p-3 bg-[var(--panel)]">
            <FileUpload 
              multiple={false}
              maxFiles={1}
              uploadHandler={handleFileUpload}
              onProcessingChange={setIsProcessing}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button 
              variant="outline"
              onClick={() => {
                setIsUploadOpen(false);
                setIsCompanyDocument(false);
              }} 
              disabled={isProcessing}
            >
              {isProcessing ? 'Uploading...' : 'Done'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Status Modal */}
      <Modal
        open={Boolean(statusEditor)}
        onClose={() => !savingStatus && setStatusEditor(null)}
        title="Edit Document Status"
        description="Update visibility for this shipment document."
        disableBackdropClick={true}
        showCloseButton={!savingStatus}
      >
        {statusEditor && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--text-secondary)] m-0">
              {statusEditor.name}
            </p>

            <FormField label="Visibility Status">
              <Select
                label="Status"
                value={statusEditor.isPublic ? 'CUSTOMER_VISIBLE' : 'COMPANY_ONLY'}
                onChange={(value) =>
                  setStatusEditor((prev) =>
                    prev
                      ? {
                          ...prev,
                          isPublic: String(value) === 'CUSTOMER_VISIBLE',
                        }
                      : prev
                  )
                }
                options={[
                  { value: 'CUSTOMER_VISIBLE', label: 'Customer Visible' },
                  { value: 'COMPANY_ONLY', label: 'Company Only' },
                ]}
              />
            </FormField>

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setStatusEditor(null)} disabled={savingStatus}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveStatus} disabled={savingStatus} loading={savingStatus}>
                Save Status
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* AI Extraction Review Modal */}
      <Modal
        open={Boolean(review)}
        onClose={() => !savingReview && setReview(null)}
        title="Review Extracted Document Details"
        disableBackdropClick={true}
        showCloseButton={!savingReview}
      >
        {review && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
              <span className="text-sm font-semibold text-[var(--text-primary)] mb-2 block">
                AI Summary
              </span>
              <div className="flex gap-2 flex-wrap mb-2">
                {review.extractionMethod && (
                  <StatusBadge status="DEFAULT" label={`Extraction: ${review.extractionMethod}`} size="sm" />
                )}
                {review.ocrAttempted && (
                  <StatusBadge status="WARNING" label="OCR attempted" size="sm" />
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-2 m-0">
                {review.summary}
              </p>
              <div className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--panel)] p-2 rounded border border-[var(--border)] max-h-24 overflow-y-auto">
                {review.extractedTextPreview}
              </div>
            </div>

            {review.failureReason && (
              <div className="p-3 flex gap-2 items-start bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-sm text-amber-700">
                  {review.failureReason}
                </span>
              </div>
            )}

            <FormField
              label="Document Name"
              value={review.name}
              onChange={(event) => setReview((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
            />

            <FormField label="Document Category">
              <Select
                label="Category"
                value={review.category}
                onChange={(value) => setReview((prev) => (prev ? { ...prev, category: String(value) } : prev))}
                options={[
                  { value: 'INVOICE', label: 'Invoice' },
                  { value: 'BILL_OF_LADING', label: 'Bill of Lading' },
                  { value: 'CUSTOMS', label: 'Customs' },
                  { value: 'INSURANCE', label: 'Insurance' },
                  { value: 'TITLE', label: 'Title' },
                  { value: 'INSPECTION_REPORT', label: 'Inspection Report' },
                  { value: 'EXPORT_DOCUMENT', label: 'Export Document' },
                  { value: 'PACKING_LIST', label: 'Packing List' },
                  { value: 'CONTRACT', label: 'Contract' },
                  { value: 'PHOTO', label: 'Photo' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />
            </FormField>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={review.description}
                onChange={(event) => setReview((prev) => (prev ? { ...prev, description: event.target.value } : prev))}
                className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>

            {entityType === 'shipment' && (
              <>
                <FormField
                  label="Tags"
                  value={reviewTags}
                  onChange={(event) => setReviewTags(event.target.value)}
                  helperText="Comma-separated tags"
                />
                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                    <input
                      type="checkbox"
                      checked={review.isCompanyDocument}
                      onChange={(event) =>
                        setReview((prev) => (prev ? { ...prev, isCompanyDocument: event.target.checked } : prev))
                      }
                      className="rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                    />
                    <span>Company document (hide from customer)</span>
                  </label>
                  <span className="block text-xs text-[var(--text-secondary)] mt-1">
                    Checked documents are stored as internal-only and hidden from customer shipment views.
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setReview(null);
                  setIsCompanyDocument(false);
                }}
                disabled={savingReview}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={saveReviewedDocument} disabled={savingReview} loading={savingReview}>
                Save Document
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
