import type { UnifiedShipmentTimelineItem } from '@/lib/shipment-timeline';

export interface ShipmentEvent {
  id: string;
  status: string;
  location: string | null;
  eventDate: string;
  description: string | null;
  completed: boolean;
  vesselName?: string | null;
  source?: string | null;
}

export interface Container {
  id: string;
  containerNumber: string;
  trackingNumber: string | null;
  vesselName: string | null;
  voyageNumber: string | null;
  shippingLine: string | null;
  bookingNumber: string | null;
  loadingPort: string | null;
  destinationPort: string | null;
  transshipmentPorts: string[];
  loadingDate: string | null;
  departureDate: string | null;
  estimatedArrival: string | null;
  actualArrival: string | null;
  status: string;
  currentLocation: string | null;
  progress: number;
  maxCapacity: number;
  currentCount: number;
  notes: string | null;
  trackingEvents: ShipmentEvent[];
}

export interface ShipmentTransit {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  currentCompany: { id: string; name: string } | null;
  currentEvent: {
    id: string;
    companyId: string | null;
    origin: string;
    destination: string;
    status: string;
  } | null;
}

export interface ShipmentDispatch {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  company: { id: string; name: string } | null;
}

export interface Shipment {
  id: string;
  userId: string;
  serviceType?: string;
  purchasePrice?: number | null;
  vehicleType: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  vehicleColor: string | null;
  lotNumber: string | null;
  auctionName: string | null;
  purchaseLocation?: string | null;
  status: string;
  price: number | null;
  priceListPricingSnapshot?: {
    source?: string;
    companyId?: string;
    companyName?: string;
    priceListId?: string | null;
    priceListName?: string | null;
    sourceFileName?: string | null;
    destinationLabel?: string | null;
    totalPrice?: number;
    dispatchAmount?: number;
    shippingAmount?: number;
    dispatchShare?: number;
    currency?: string;
    calculatedAt?: string;
    matchedLane?: {
      stateCode?: string | null;
      branch?: string | null;
      city?: string | null;
      loadingPoint?: string | null;
      source?: string | null;
      confidence?: string | null;
    };
    posted?: {
      dispatch?: { chargeId?: string; postedAt?: string };
      shipping?: { chargeId?: string; postedAt?: string };
    };
  } | null;
  companyShippingFare?: number | null;
  damageCost?: number | null;
  damageCredit: number | null;
  weight: number | null;
  dimensions: string | null;
  insuranceValue: number | null;
  vehiclePhotos: string[];
  arrivalPhotos: string[];
  hasKey: boolean | null;
  hasTitle: boolean | null;
  titleStatus: string | null;
  vehicleAge: number | null;
  dispatchId: string | null;
  containerId: string | null;
  transitId: string | null;
  dispatch: ShipmentDispatch | null;
  container: Container | null;
  transit: ShipmentTransit | null;
  internalNotes: string | null;
  paymentStatus: string;
  paymentMode: string | null;
  releaseToken: string | null;
  releaseTokenCreatedAt: string | null;
  companyGetpassStartedAt: string | null;
  companyGetpassCompletedAt: string | null;
  companyGetpassDurationSeconds: number | null;
  shippingCompany: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
  };
  documents: Array<{
    id: string;
    name: string;
    description: string | null;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    category: string;
    isPublic?: boolean;
    uploadedBy: string;
    createdAt: string;
  }>;
  ledgerEntries: Array<{
    id: string;
    transactionDate: string;
    description: string;
    type: string;
    amount: number;
    balance: number;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
  }>;
  companyLedgerEntries?: Array<{
    id: string;
    companyId: string;
    transactionDate: string;
    description: string;
    type: string;
    amount: number;
    balance: number;
    reference?: string | null;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
    company: {
      id: string;
      name: string;
      code: string | null;
    };
  }>;
  companyPaymentSummary?: {
    charged: number;
    paid: number;
    remaining: number;
    status: 'NOT_DUE' | 'UNPAID' | 'PARTIAL' | 'PAID_TO_COMPANY';
  };
  containerDamages: Array<{
    id: string;
    containerId: string;
    damageType: 'WE_PAY' | 'COMPANY_PAYS';
    amount: number;
    description: string;
    createdAt: string;
  }>;
  auditLogs?: Array<{
    id: string;
    action: string;
    description: string;
    performedBy: string;
    oldValue?: string | null;
    newValue?: string | null;
    timestamp: string;
    metadata?: Record<string, unknown> | null;
  }>;
  unifiedTimeline?: UnifiedShipmentTimelineItem[];
}

export type ExpenseActionContext = {
  modalTitle: string;
  contextType?: 'CONTAINER' | 'DISPATCH' | 'TRANSIT';
  contextId?: string;
};

export type ExpenseSourceFilter = 'ALL' | 'SHIPMENT' | 'DISPATCH' | 'TRANSIT';
export type ClassifiedExpenseSource = Exclude<ExpenseSourceFilter, 'ALL'>;
export type LinkedCompanyLedgerEntry = NonNullable<Shipment['companyLedgerEntries']>[number];

export type StatusColors = {
  bg: string;
  text: string;
  border: string;
};

export type ShipmentExpenseEntry = Shipment['ledgerEntries'][number] & {
  source: ClassifiedExpenseSource;
};

export type ShipmentExpenseEntryWithCompanyLedger = ShipmentExpenseEntry & {
  linkedCompanyLedgerEntry: LinkedCompanyLedgerEntry | null;
};

export type ClassifiedShipmentExpenseData = {
  entries: ShipmentExpenseEntry[];
  totals: Record<ClassifiedExpenseSource, number>;
  counts: Record<ClassifiedExpenseSource, number>;
  total: number;
};

type ComparisonTransactionBase = {
  id: string;
  transactionDate: string;
  description: string;
  type: string;
  amount: number;
};

export type CompanyComparisonTransaction = ComparisonTransactionBase & {
  source: 'COMPANY';
  companyLedgerEntry: LinkedCompanyLedgerEntry;
};

export type CustomerComparisonTransaction = ComparisonTransactionBase & {
  source: 'CUSTOMER';
  userLedgerEntryId: string;
  linkedCompanyLedgerEntry: LinkedCompanyLedgerEntry | null;
};

export type ComparisonTransactionWithDrillDown =
  | CompanyComparisonTransaction
  | CustomerComparisonTransaction;

export type ShipmentPhotoLightboxState = {
  images: string[];
  index: number;
  title: string;
} | null;

export type AvailableDispatchOption = {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  company: { name: string };
};

export type AvailableTransitOption = {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  currentCompany: { id: string; name: string; code: string | null } | null;
  _count?: { shipments: number; events: number; expenses: number };
};
