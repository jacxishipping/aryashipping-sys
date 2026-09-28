export type DispatchStatus = 'PENDING' | 'DISPATCHED' | 'ARRIVED_AT_PORT' | 'COMPLETED' | 'CANCELLED';

export interface DispatchSummary {
  id: string;
  referenceNumber: string;
  status: DispatchStatus;
  origin: string;
  destination: string;
  dispatchDate?: string | null;
  estimatedArrival?: string | null;
  cost?: number | null;
  notes?: string | null;
  createdAt: string;
  company?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  _count: {
    shipments: number;
    events: number;
    expenses: number;
  };
}

export interface DispatchListResponse {
  dispatches: DispatchSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DispatchDetailShipment {
  id: string;
  status: string;
  dispatchId?: string | null;
  containerId?: string | null;
  transitId?: string | null;
  vehicleYear?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleVIN?: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    phone?: string | null;
  } | null;
}

export interface DispatchDetailEvent {
  id: string;
  status: string;
  location: string | null;
  description: string | null;
  eventDate: string;
  createdAt: string;
  createdBy?: string | null;
  createdByLabel?: string | null;
}

export interface DispatchDetailExpense {
  id: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  vendor: string | null;
  invoiceNumber: string | null;
  category: string | null;
  notes: string | null;
  shipment: {
    id: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleVIN: string | null;
  } | null;
}

export interface DispatchExpenseUpdateInput {
  expenseId: string;
  category: string;
  type: string;
  description: string;
  amount: number;
  currency?: string;
  date?: string;
  vendor?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
}

export interface DispatchDetail {
  id: string;
  referenceNumber: string;
  status: DispatchStatus;
  origin: string;
  destination: string;
  dispatchDate?: string | null;
  estimatedArrival?: string | null;
  actualArrival?: string | null;
  cost?: number | null;
  notes?: string | null;
  company?: {
    id: string;
    name: string;
    code: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  shipments: DispatchDetailShipment[];
  events: DispatchDetailEvent[];
  expenses: DispatchDetailExpense[];
  _count: {
    shipments: number;
    events: number;
    expenses: number;
  };
}

export interface DispatchDetailResponse {
  dispatch: DispatchDetail;
  totalExpenses: number;
}

export interface DispatchHandoffInput {
  containerId: string;
  shipmentIds: string[];
}