export type DocumentCategory =
  | 'INVOICE'
  | 'BILL_OF_LADING'
  | 'CUSTOMS'
  | 'INSURANCE'
  | 'TITLE'
  | 'INSPECTION_REPORT'
  | 'PHOTO'
  | 'CONTRACT'
  | 'OTHER';

export interface DocumentRecord {
  id: string;
  name: string;
  description?: string | null;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  uploadedBy: string;
  isPublic?: boolean;
  createdAt: string;
  updatedAt?: string;
  shipment?: {
    id: string;
    vehicleType?: string | null;
  } | null;
  user?: {
    name: string | null;
    email: string | null;
  } | null;
}

export interface DocumentListResponse {
  documents: DocumentRecord[];
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    limit: number;
  };
}

export interface DocumentFilters {
  search?: string;
  category?: DocumentCategory;
  shipmentId?: string;
  userId?: string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
}

export interface DocumentCreateInput {
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: DocumentCategory;
  description?: string;
  shipmentId?: string;
  userId?: string;
  isPublic?: boolean;
}

export interface UploadDocumentResult {
  message: string;
  url: string;
  filename: string;
}