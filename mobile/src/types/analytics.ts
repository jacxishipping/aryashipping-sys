export interface AnalyticsSummary {
  totalShipments: number;
  activeShipments: number;
  activeDispatches: number;
  adminUsers: number;
  totalRevenue: number;
  totalDispatchSpend: number;
  overdueInvoices: number;
  activeContainers: number;
}

export interface AnalyticsCountByStatus {
  status: string;
  count: number;
}

export interface AnalyticsMonthValue {
  month: string;
  count?: number;
  totalUSD?: number;
}

export interface AnalyticsInvoiceStatus {
  status: string;
  count: number;
  totalUSD: number;
}

export interface AnalyticsOutstandingInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalUSD: number;
  dueDate: string | null;
}

export interface AnalyticsTopCustomer {
  userId: string;
  name: string;
  email: string | null;
  shipmentCount: number;
  revenue: number;
  lastShipmentAt: string | null;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  shipmentsByStatus: AnalyticsCountByStatus[];
  dispatchesByStatus: AnalyticsCountByStatus[];
  shipmentsByMonth: AnalyticsMonthValue[];
  revenueByMonth: AnalyticsMonthValue[];
  dispatchSpendByMonth: AnalyticsMonthValue[];
  invoiceStatusDistribution: AnalyticsInvoiceStatus[];
  outstandingInvoices: AnalyticsOutstandingInvoice[];
  topCustomers: AnalyticsTopCustomer[];
  lastUpdated: string;
}