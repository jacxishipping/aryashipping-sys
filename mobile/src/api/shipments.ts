import client from './client';
import {
  Shipment,
  ShipmentCreateInput,
  ShipmentFilters,
  ShipmentListResponse,
  ShipmentUpdateInput,
  ShipmentTracking,
} from '../types/shipment';
import { PaginationParams } from '../types/api';

type BackendShipmentListItem = Record<string, any>;

type BackendShipmentListResponse = {
  shipments?: BackendShipmentListItem[];
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
  };
  data?: Shipment[];
  total?: number;
  page?: number;
  pageSize?: number;
};

type BackendShipmentDetailResponse = {
  shipment?: Record<string, any>;
};

const mapTrackingItem = (item: Record<string, any>): ShipmentTracking => ({
  id: String(item.id || item.referenceLabel || Math.random()),
  status: String(item.status || item.title || 'PENDING') as ShipmentTracking['status'],
  location: item.location || undefined,
  description: item.description || undefined,
  timestamp: item.timestamp || item.occurredAt || item.eventDate || item.createdAt || new Date().toISOString(),
  updatedBy: item.updatedBy || item.actorLabel || item.createdByLabel || undefined,
});

const normalizeShipment = (rawShipment: Record<string, any>): Shipment => {
  const rawTracking = Array.isArray(rawShipment.tracking)
    ? rawShipment.tracking
    : Array.isArray(rawShipment.unifiedTimeline)
    ? rawShipment.unifiedTimeline
    : [];

  const rawDocuments = Array.isArray(rawShipment.documents) ? rawShipment.documents : [];
  const rawPhotos = Array.isArray(rawShipment.photos)
    ? rawShipment.photos
    : Array.isArray(rawShipment.vehiclePhotos)
    ? rawShipment.vehiclePhotos.map((url: string, index: number) => ({
        id: `vehicle-photo-${index}`,
        url,
        uploadedAt: rawShipment.updatedAt || rawShipment.createdAt || new Date().toISOString(),
      }))
    : [];

  const originCity = rawShipment.origin?.city || rawShipment.purchaseLocation || rawShipment.dispatch?.origin || rawShipment.transit?.origin || '';
  const destinationCity = rawShipment.destination?.city || rawShipment.dispatch?.destination || rawShipment.transit?.destination || rawShipment.container?.destinationPort || '';

  const pricingTotal =
    rawShipment.pricing?.total ??
    rawShipment.amountDue ??
    rawShipment.price ??
    rawShipment.purchasePrice ??
    0;

  return {
    id: String(rawShipment.id),
    trackingNumber: rawShipment.trackingNumber || rawShipment.id || '',
    vehicle: {
      vin: rawShipment.vehicle?.vin || rawShipment.vehicleVIN || '',
      year: rawShipment.vehicle?.year || rawShipment.vehicleYear || undefined,
      make: rawShipment.vehicle?.make || rawShipment.vehicleMake || undefined,
      model: rawShipment.vehicle?.model || rawShipment.vehicleModel || undefined,
      color: rawShipment.vehicle?.color || rawShipment.vehicleColor || undefined,
      type: rawShipment.vehicle?.type || rawShipment.vehicleType || undefined,
    },
    status: String(rawShipment.status || 'PENDING') as Shipment['status'],
    customerId: rawShipment.customerId || rawShipment.userId || rawShipment.user?.id || '',
    customerName: rawShipment.customerName || rawShipment.user?.name || undefined,
    customerEmail: rawShipment.customerEmail || rawShipment.user?.email || undefined,
    origin: rawShipment.origin || {
      city: originCity,
      state: rawShipment.origin?.state || '',
      country: rawShipment.origin?.country || '',
    },
    destination: rawShipment.destination || {
      city: destinationCity,
      state: rawShipment.destination?.state || '',
      country: rawShipment.destination?.country || '',
    },
    pickupDate: rawShipment.pickupDate || undefined,
    deliveryDate: rawShipment.deliveryDate || undefined,
    estimatedDelivery:
      rawShipment.estimatedDelivery ||
      rawShipment.container?.estimatedArrival ||
      rawShipment.estimatedArrival ||
      undefined,
    containerId: rawShipment.containerId || rawShipment.container?.id || undefined,
    containerNumber: rawShipment.containerNumber || rawShipment.container?.containerNumber || undefined,
    containerStatus: rawShipment.container?.status || null,
    transitId: rawShipment.transitId || rawShipment.transit?.id || null,
    releaseToken: rawShipment.releaseToken || null,
    invoiceId: rawShipment.invoiceId || undefined,
    pricing:
      pricingTotal > 0
        ? {
            shippingCost: rawShipment.pricing?.shippingCost || rawShipment.price || pricingTotal,
            oceanFreight: rawShipment.pricing?.oceanFreight || undefined,
            insurance: rawShipment.pricing?.insurance || undefined,
            total: pricingTotal,
            currency: rawShipment.pricing?.currency || 'USD',
          }
        : undefined,
    tracking: rawTracking.map(mapTrackingItem),
    documents: rawDocuments.map((document: Record<string, any>) => ({
      id: String(document.id),
      name: document.name || document.filename || 'Document',
      type: document.type || document.category || document.fileType || 'OTHER',
      url: document.url || document.fileUrl || '',
      size: Number(document.size || document.fileSize || 0),
      uploadedAt: document.uploadedAt || document.createdAt || document.updatedAt || new Date().toISOString(),
      uploadedBy: document.uploadedBy || document.user?.name || document.user?.email || undefined,
    })),
    photos: rawPhotos.map((photo: Record<string, any>, index: number) => ({
      id: String(photo.id || `photo-${index}`),
      url: photo.url,
      thumbnail: photo.thumbnail || undefined,
      caption: photo.caption || undefined,
      uploadedAt: photo.uploadedAt || rawShipment.updatedAt || rawShipment.createdAt || new Date().toISOString(),
    })),
    notes: rawShipment.notes || rawShipment.internalNotes || undefined,
    createdAt: rawShipment.createdAt || new Date().toISOString(),
    updatedAt: rawShipment.updatedAt || rawShipment.createdAt || new Date().toISOString(),
  };
};

export const shipmentsApi = {
  async getShipments(
    filters?: ShipmentFilters,
    pagination?: PaginationParams
  ): Promise<ShipmentListResponse> {
    const response = await client.get<BackendShipmentListResponse>('/api/shipments', {
      params: {
        ...filters,
        page: pagination?.page,
        limit: pagination?.pageSize,
      },
    });

    if (Array.isArray(response.data.shipments)) {
      return {
        data: response.data.shipments.map(normalizeShipment),
        total: response.data.pagination?.total || 0,
        page: response.data.pagination?.page || 1,
        pageSize: response.data.pagination?.limit || pagination?.pageSize || 10,
      };
    }

    return response.data as ShipmentListResponse;
  },

  async getShipment(id: string): Promise<Shipment> {
    const response = await client.get<Shipment | BackendShipmentDetailResponse>(`/api/shipments/${id}`);
    const payload = 'shipment' in response.data ? response.data.shipment : response.data;
    return normalizeShipment(payload as Record<string, any>);
  },

  async getShipmentByTracking(trackingNumber: string): Promise<Shipment> {
    const response = await client.get<Shipment | BackendShipmentDetailResponse>(`/api/shipments/tracking/${trackingNumber}`);
    const payload = 'shipment' in response.data ? response.data.shipment : response.data;
    return normalizeShipment(payload as Record<string, any>);
  },

  async createShipment(data: ShipmentCreateInput): Promise<Shipment> {
    const response = await client.post<Shipment>('/api/shipments', data);
    return response.data;
  },

  async updateShipment(id: string, data: ShipmentUpdateInput): Promise<Shipment> {
    const response = await client.patch<Shipment>(`/api/shipments/${id}`, data);
    return response.data;
  },

  async deleteShipment(id: string): Promise<void> {
    await client.delete(`/api/shipments/${id}`);
  },

  async addTracking(id: string, tracking: Omit<ShipmentTracking, 'id'>): Promise<Shipment> {
    const response = await client.post<Shipment>(`/api/shipments/${id}/tracking`, tracking);
    return response.data;
  },

  async uploadDocument(id: string, file: FormData): Promise<Shipment> {
    const response = await client.post<Shipment>(`/api/shipments/${id}/documents`, file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadPhoto(id: string, file: FormData): Promise<Shipment> {
    const response = await client.post<Shipment>(`/api/shipments/${id}/photos`, file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async deleteDocument(id: string, documentId: string): Promise<void> {
    await client.delete(`/api/shipments/${id}/documents/${documentId}`);
  },

  async deletePhoto(id: string, photoId: string): Promise<void> {
    await client.delete(`/api/shipments/${id}/photos/${photoId}`);
  },
};
