import client from './client';
import { TransitDetail, TransitExpense, TransitExpenseUpdateInput, TransitStatus, TransitSummary } from '../types/admin';

export interface TransitsResponse {
  transits: TransitSummary[];
}

export interface TransitDetailResponse {
  transit: TransitDetail;
  totalExpenses: number;
}

export interface BulkAssignResult {
  assigned: number;
  errors: Array<{ shipmentId: string; error: string }>;
}

export const transitsApi = {
  async getTransits(params?: { search?: string; status?: TransitStatus; companyId?: string }): Promise<TransitsResponse> {
    const response = await client.get<TransitsResponse>('/api/transits', {
      params,
    });

    return response.data;
  },

  async getTransit(id: string): Promise<TransitDetailResponse> {
    const response = await client.get<TransitDetailResponse>(`/api/transits/${id}`);
    return response.data;
  },

  async updateExpense(transitId: string, input: TransitExpenseUpdateInput): Promise<{ expense: TransitExpense; message: string }> {
    const response = await client.patch<{ expense: TransitExpense; message: string }>(
      `/api/transits/${transitId}/expenses`,
      input,
    );
    return response.data;
  },

  async assignShipment(transitId: string, shipmentId: string, releaseToken: string) {
    const response = await client.post<{ shipment: unknown }>(`/api/transits/${transitId}/shipments`, {
      shipmentId,
      releaseToken: releaseToken.trim(),
    });
    return response.data;
  },

  async assignShipmentsBulk(transitId: string, shipmentIds: string[]): Promise<BulkAssignResult> {
    const response = await client.post<BulkAssignResult>(`/api/transits/${transitId}/shipments/bulk`, {
      shipmentIds,
    });
    return response.data;
  },
};
