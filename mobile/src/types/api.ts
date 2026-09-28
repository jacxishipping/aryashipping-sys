export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  activeShipments: number;
  activeContainers: number;
  pendingInvoices: number;
  pendingInvoicesTotal: number;
  dispatches: number;
  recentShipments: any[];
  statusDistribution: {
    status: string;
    count: number;
  }[];
}

export interface Notification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface NotificationListResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
