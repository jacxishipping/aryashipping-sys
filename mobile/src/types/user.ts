export interface Customer {
  id: string;
  name: string;
  email: string;
  password?: string;
  role?: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  balance: number;
  totalShipments: number;
  activeShipments: number;
  deliveredShipments?: number;
  isActive: boolean;
  loginCode?: string;
  notes?: string;
  collectionStatus?: string;
  promiseToPayDate?: string;
  followUpDate?: string;
  openInvoiceCount?: number;
  overdueInvoiceCount?: number;
  overdueAmount?: number;
  paidAmount?: number;
  availableCredit?: number;
  statementGeneratedAt?: string;
  shipments?: Array<{
    id: string;
    status: string;
    createdAt: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleYear?: number;
    vehicleVIN?: string;
    containerNumber?: string;
    price?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerStats {
  totalShipments: number;
  activeShipments: number;
  deliveredShipments: number;
  totalSpent: number;
  currentBalance: number;
  overdueInvoices: number;
}

export interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  hasBalance?: boolean;
}

export interface CustomerListResponse {
  data: Customer[];
  total: number;
  page: number;
  pageSize: number;
}
