import client from './client';
import { Shipment } from '../types/shipment';

type BackendSearchShipment = Record<string, any>;

type SearchResponse = {
  shipments?: BackendSearchShipment[];
  totalShipments?: number;
  page?: number;
  limit?: number;
};

export type MobileSearchResult = {
  shipments: Shipment[];
  totalShipments: number;
};

export type MobileShipmentSearchFilters = {
  query?: string;
  status?: string;
  workflowStage?: string;
  yardReceived?: 'true' | undefined;
  dateFrom?: string;
  dateTo?: string;
  minPrice?: string;
  maxPrice?: string;
};

const normalizeShipment = (rawShipment: BackendSearchShipment): Shipment => {
  const price =
    rawShipment.price ??
    rawShipment.purchasePrice ??
    rawShipment.insuranceValue ??
    0;

  return {
    id: String(rawShipment.id),
    trackingNumber: rawShipment.trackingNumber || rawShipment.id || '',
    vehicle: {
      vin: rawShipment.vehicleVIN || '',
      year: rawShipment.vehicleYear || undefined,
      make: rawShipment.vehicleMake || undefined,
      model: rawShipment.vehicleModel || undefined,
      color: rawShipment.vehicleColor || undefined,
      type: rawShipment.vehicleType || undefined,
      keys: rawShipment.hasKey ? 'Yes' : undefined,
      title: rawShipment.hasTitle ? 'Yes' : undefined,
      titleState: rawShipment.titleStatus || undefined,
    },
    status: String(rawShipment.status || 'PENDING') as Shipment['status'],
    customerId: rawShipment.userId || '',
    customerName: rawShipment.user?.name || undefined,
    customerEmail: rawShipment.user?.email || undefined,
    origin: {
      city: rawShipment.dispatch?.origin || rawShipment.container?.loadingPort || '',
      state: '',
      country: '',
    },
    destination: {
      city: rawShipment.transit?.destination || rawShipment.dispatch?.destination || rawShipment.container?.destinationPort || '',
      state: '',
      country: '',
    },
    pickupDate: undefined,
    deliveryDate: undefined,
    estimatedDelivery: rawShipment.container?.estimatedArrival || undefined,
    containerId: rawShipment.containerId || rawShipment.container?.id || undefined,
    containerNumber: rawShipment.container?.containerNumber || undefined,
    invoiceId: undefined,
    pricing:
      price > 0
        ? {
            shippingCost: price,
            total: price,
            currency: 'USD',
          }
        : undefined,
    tracking: [],
    documents: [],
    photos: [],
    notes: rawShipment.internalNotes || undefined,
    createdAt: rawShipment.createdAt || new Date().toISOString(),
    updatedAt: rawShipment.updatedAt || rawShipment.createdAt || new Date().toISOString(),
  };
};

export const searchApi = {
  async searchShipments(filters: MobileShipmentSearchFilters, limit = 20): Promise<MobileSearchResult> {
    const response = await client.get<SearchResponse>('/api/search', {
      params: {
        query: filters.query,
        type: 'shipments',
        status: filters.status,
        workflowStage: filters.workflowStage,
        yardReceived: filters.yardReceived,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        limit,
      },
    });

    return {
      shipments: (response.data.shipments || []).map(normalizeShipment),
      totalShipments: response.data.totalShipments || 0,
    };
  },
};