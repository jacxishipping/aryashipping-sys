import client from './client';
import { Customer, CustomerFilters, CustomerListResponse, CustomerStats } from '../types/user';
import { PaginationParams } from '../types/api';

type UserListItem = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  accountBalance?: number;
  _count?: {
    shipments?: number;
  };
};

type UserListResponse = {
  users: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type UserDetailResponse = {
  user: {
    id: string;
    name: string | null;
    email: string;
    role?: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    collectionStatus?: string | null;
    promiseToPayDate?: string | null;
    collectionFollowUpDate?: string | null;
    collectionNotes?: string | null;
    loginCode?: string | null;
    createdAt: string;
    updatedAt: string;
    shipments?: Array<{
      id: string;
      vehicleMake?: string | null;
      vehicleModel?: string | null;
      vehicleYear?: number | null;
      vehicleVIN?: string | null;
      status: string;
      createdAt: string;
      containerId?: string | null;
      price?: number | null;
      container?: {
        containerNumber?: string | null;
      } | null;
    }>;
    statement?: {
      summary?: {
        accountBalance?: number;
        openInvoiceCount?: number;
        overdueInvoiceCount?: number;
        overdueAmount?: number;
        paidAmount?: number;
        availableCredit?: number;
      };
      collections?: {
        status?: string | null;
        promiseToPayDate?: string | null;
        followUpDate?: string | null;
        notes?: string | null;
      };
      generatedAt?: string;
    } | null;
  };
};

type CustomerMutationInput = {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  collectionStatus?: string;
  promiseToPayDate?: string | null;
  followUpDate?: string | null;
  collectionNotes?: string;
};

const inactiveShipmentStatuses = new Set(['DELIVERED', 'CANCELLED']);

function mapUserListItemToCustomer(user: UserListItem): Customer {
  return {
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    role: 'user',
    balance: user.accountBalance ?? 0,
    totalShipments: user._count?.shipments || 0,
    activeShipments: 0,
    deliveredShipments: user._count?.shipments || 0,
    isActive: true,
    createdAt: user.createdAt,
    updatedAt: user.createdAt,
  };
}

function mapUserDetailToCustomer(user: UserDetailResponse['user']): Customer {
  const shipments = user.shipments || [];
  const activeShipments = shipments.filter((shipment) => !inactiveShipmentStatuses.has(shipment.status)).length;

  return {
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    role: user.role || 'user',
    phone: user.phone || undefined,
    address: user.address || user.city || user.country
      ? {
          street: user.address || undefined,
          city: user.city || undefined,
          country: user.country || undefined,
        }
      : undefined,
    balance: user.statement?.summary?.accountBalance ?? 0,
    totalShipments: shipments.length,
    activeShipments,
    deliveredShipments: Math.max(shipments.length - activeShipments, 0),
    isActive: true,
    loginCode: user.loginCode || undefined,
    notes: user.statement?.collections?.notes || user.collectionNotes || undefined,
    collectionStatus: user.statement?.collections?.status || user.collectionStatus || undefined,
    promiseToPayDate: user.statement?.collections?.promiseToPayDate || user.promiseToPayDate || undefined,
    followUpDate: user.statement?.collections?.followUpDate || user.collectionFollowUpDate || undefined,
    openInvoiceCount: user.statement?.summary?.openInvoiceCount ?? 0,
    overdueInvoiceCount: user.statement?.summary?.overdueInvoiceCount ?? 0,
    overdueAmount: user.statement?.summary?.overdueAmount ?? 0,
    paidAmount: user.statement?.summary?.paidAmount ?? 0,
    availableCredit: user.statement?.summary?.availableCredit ?? 0,
    statementGeneratedAt: user.statement?.generatedAt,
    shipments: shipments.map((shipment) => ({
      id: shipment.id,
      status: shipment.status,
      createdAt: shipment.createdAt,
      vehicleMake: shipment.vehicleMake || undefined,
      vehicleModel: shipment.vehicleModel || undefined,
      vehicleYear: shipment.vehicleYear || undefined,
      vehicleVIN: shipment.vehicleVIN || undefined,
      containerNumber: shipment.container?.containerNumber || undefined,
      price: shipment.price ?? undefined,
    })),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function sanitizeCustomerPayload(data: Partial<Customer>): CustomerMutationInput {
  return {
    name: (data.name || '').trim(),
    email: (data.email || '').trim(),
    ...(data.password ? { password: data.password } : {}),
    ...(data.phone ? { phone: data.phone.trim() } : {}),
    ...(data.address?.street ? { address: data.address.street.trim() } : {}),
    ...(data.address?.city ? { city: data.address.city.trim() } : {}),
    ...(data.address?.country ? { country: data.address.country.trim() } : {}),
    ...(data.collectionStatus ? { collectionStatus: data.collectionStatus } : {}),
    ...(data.promiseToPayDate !== undefined ? { promiseToPayDate: data.promiseToPayDate || null } : {}),
    ...(data.followUpDate !== undefined ? { followUpDate: data.followUpDate || null } : {}),
    ...(data.notes !== undefined ? { collectionNotes: data.notes.trim() } : {}),
  };
}

export const customersApi = {
  async getCustomers(
    filters?: CustomerFilters,
    pagination?: PaginationParams
  ): Promise<CustomerListResponse> {
    const response = await client.get<UserListResponse>('/api/users', {
      params: {
        query: filters?.search,
        roleType: 'customers',
        ...pagination,
      },
    });

    return {
      data: (response.data.users || []).map(mapUserListItemToCustomer),
      total: response.data.total,
      page: response.data.page,
      pageSize: response.data.pageSize,
    };
  },

  async getCustomer(id: string): Promise<Customer> {
    const response = await client.get<UserDetailResponse>(`/api/users/${id}`);
    return mapUserDetailToCustomer(response.data.user);
  },

  async getCustomerStats(id: string): Promise<CustomerStats> {
    const customer = await this.getCustomer(id);

    return {
      totalShipments: customer.totalShipments,
      activeShipments: customer.activeShipments,
      deliveredShipments: Math.max(customer.totalShipments - customer.activeShipments, 0),
      totalSpent: 0,
      currentBalance: customer.balance,
      overdueInvoices: 0,
    };
  },

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const response = await client.post<{ user: UserDetailResponse['user'] }>('/api/mobile-auth/register', {
      ...sanitizeCustomerPayload(data),
      role: 'user',
      password: data.password,
    });

    return mapUserDetailToCustomer(response.data.user);
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const response = await client.patch<{ user: UserDetailResponse['user'] }>(`/api/users/${id}`, sanitizeCustomerPayload(data));
    return mapUserDetailToCustomer(response.data.user);
  },

  async deleteCustomer(id: string): Promise<void> {
    await client.delete(`/api/users/${id}`);
  },
};
