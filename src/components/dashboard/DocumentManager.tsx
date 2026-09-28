'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Chip,
  TextField,
} from '@mui/material';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal, FormField, Select } from '@/components/design-system';
import { FileUpload } from '@/components/ui/FileUpload';

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
      // 1. Upload file to blob storage
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
      throw error; // Re-throw so FileUpload shows error state
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
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const endpoint = entityType === 'container'
        ? `/api/containers/${entityId}/documents?documentId=${docId}`
        : `/api/documents/${docId}`; // Assuming shipment docs use this

      const response = await fetch(endpoint, { method: 'DELETE' });

      if (!response.ok) throw new Error('Failed to delete document');

      setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
      onDocumentsChange?.();
      toast.success('Document deleted');
      router.refresh();
    } catch (error) {
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Documents
        </Typography>
        {!readOnly && (
          <Button
            variant="contained"
            startIcon={<Upload size={18} />}
            onClick={() => setIsUploadOpen(true)}
            sx={{
                bgcolor: 'var(--accent-gold)',
                color: 'var(--background)',
                '&:hover': { bgcolor: 'var(--accent-gold-hover)' }
            }}
          >
            Upload
          </Button>
        )}
      </Box>

      {documents.length === 0 ? (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 4, 
            textAlign: 'center', 
            bgcolor: 'var(--background)',
            borderStyle: 'dashed' 
          }}
        >
          <FileText className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-2 opacity-50" />
          <Typography color="textSecondary">
            No documents attached yet
          </Typography>
        </Paper>
      ) : (
        <List sx={{ bgcolor: 'var(--panel)', borderRadius: 2, border: '1px solid var(--border)' }}>
          {documents.map((doc, index) => (
            <div key={doc.id}>
              <ListItem>
                <ListItemIcon>
                  {getIcon(doc.type)}
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{ component: 'div' }}
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                            {doc.name}
                        </Typography>
                        <Chip 
                            label={doc.category.replace('_', ' ')} 
                            size="small" 
                            sx={{ fontSize: '0.65rem', height: 20 }} 
                        />
                        {doc.isPublic === false ? (
                          <Chip
                            label="Company Only"
                            size="small"
                            color="warning"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        ) : null}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="textSecondary">
                      {formatSize(doc.size)} • Uploaded by {doc.uploadedBy} • {new Date(doc.createdAt).toLocaleDateString()}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction>
                  {!readOnly && entityType === 'shipment' && (
                    <IconButton edge="end" aria-label="edit status" sx={{ mr: 1 }} onClick={() => handleOpenStatusEditor(doc)}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        Edit Status
                      </Typography>
                    </IconButton>
                  )}
                  <IconButton edge="end" aria-label="download" sx={{ mr: 1 }} href={doc.fileUrl} target="_blank">
                    <Download className="w-4 h-4" />
                  </IconButton>
                  {!readOnly && (
                    <IconButton 
                        edge="end" 
                        aria-label="delete" 
                        color="error"
                        onClick={() => handleDelete(doc.id)}
                    >
                        <Trash2 className="w-4 h-4" />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
              {index < documents.length - 1 && <Divider component="li" />}
            </div>
          ))}
        </List>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                borderRadius: 3,
                bgcolor: 'var(--background)',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                Supported formats
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                PDF, JPG, PNG, DOC, DOCX, XLS, and XLSX. Upload one document at a time so the category and extracted details stay accurate.
              </Typography>
            </Paper>
            
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
              <Box>
                <FormControlLabel
                  control={<Checkbox checked={isCompanyDocument} onChange={(event) => setIsCompanyDocument(event.target.checked)} />}
                  label="Company document (hide from customer)"
                />
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                  Checked documents are visible to internal users only.
                </Typography>
              </Box>
            )}

            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'var(--panel)' }}>
              <FileUpload 
                multiple={false}
                maxFiles={1}
                uploadHandler={handleFileUpload}
                onProcessingChange={setIsProcessing}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                <Button 
                    onClick={() => {
                      setIsUploadOpen(false);
                      setIsCompanyDocument(false);
                    }} 
                    disabled={isProcessing}
                    sx={{ color: 'var(--text-secondary)' }}
                >
                    {isProcessing ? 'Uploading...' : 'Done'}
                </Button>
            </Box>
        </Box>
      </Modal>

      <Modal
        open={Boolean(statusEditor)}
        onClose={() => !savingStatus && setStatusEditor(null)}
        title="Edit Document Status"
        description="Update visibility for this shipment document."
        disableBackdropClick={true}
        showCloseButton={!savingStatus}
      >
        {statusEditor && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              {statusEditor.name}
            </Typography>

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

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="outlined" onClick={() => setStatusEditor(null)} disabled={savingStatus}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSaveStatus} disabled={savingStatus}>
                {savingStatus ? 'Saving...' : 'Save Status'}
              </Button>
            </Box>
          </Box>
        )}
      </Modal>

      <Modal
        open={Boolean(review)}
        onClose={() => !savingReview && setReview(null)}
        title="Review Extracted Document Details"
        disableBackdropClick={true}
        showCloseButton={!savingReview}
      >
        {review && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'var(--background)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                AI Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
                {review.extractionMethod && (
                  <Chip size="small" label={`Extraction: ${review.extractionMethod}`} />
                )}
                {review.ocrAttempted && (
                  <Chip size="small" color="warning" label="OCR attempted" />
                )}
              </Box>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1.5 }}>
                {review.summary}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                {review.extractedTextPreview}
              </Typography>
            </Paper>

            {review.failureReason && (
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-start',
                  bgcolor: 'rgba(245, 158, 11, 0.08)',
                  borderColor: 'rgba(245, 158, 11, 0.35)',
                }}
              >
                <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(180, 83, 9)', marginTop: 2 }} />
                <Typography variant="body2" sx={{ color: 'rgb(146, 64, 14)' }}>
                  {review.failureReason}
                </Typography>
              </Paper>
            )}

            <TextField
              size="small"
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

            <TextField
              size="small"
              label="Description"
              value={review.description}
              onChange={(event) => setReview((prev) => (prev ? { ...prev, description: event.target.value } : prev))}
              multiline
              minRows={3}
            />

            {entityType === 'shipment' && (
              <>
                <TextField
                  size="small"
                  label="Tags"
                  value={reviewTags}
                  onChange={(event) => setReviewTags(event.target.value)}
                  helperText="Comma-separated tags"
                />
                <Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={review.isCompanyDocument}
                        onChange={(event) =>
                          setReview((prev) => (prev ? { ...prev, isCompanyDocument: event.target.checked } : prev))
                        }
                      />
                    }
                    label="Company document (hide from customer)"
                  />
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                    Checked documents are stored as internal-only and hidden from customer shipment views.
                  </Typography>
                </Box>
              </>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setReview(null);
                  setIsCompanyDocument(false);
                }}
                disabled={savingReview}
              >
                Cancel
              </Button>
              <Button variant="contained" onClick={saveReviewedDocument} disabled={savingReview}>
                {savingReview ? 'Saving...' : 'Save Document'}
              </Button>
            </Box>
          </Box>
        )}
      </Modal>
    </Box>
  );
}

