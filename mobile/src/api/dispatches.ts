import client from './client';
import {
  DispatchDetail,
  DispatchDetailResponse,
  DispatchExpenseUpdateInput,
  DispatchHandoffInput,
  DispatchListResponse,
  DispatchStatus,
} from '../types/dispatch';
import { PaginationParams } from '../types/api';

export const dispatchesApi = {
  async getDispatches(
    params?: { search?: string; status?: DispatchStatus },
    pagination?: PaginationParams,
  ): Promise<DispatchListResponse> {
    const response = await client.get<DispatchListResponse>('/api/dispatches', {
      params: {
        ...params,
        page: pagination?.page,
        limit: pagination?.pageSize,
      },
    });

    return response.data;
  },

  async getDispatch(id: string): Promise<DispatchDetail> {
    const response = await client.get<DispatchDetailResponse>(`/api/dispatches/${id}`);
    return response.data.dispatch;
  },

  async updateExpense(dispatchId: string, input: DispatchExpenseUpdateInput) {
    const response = await client.patch<{ expense: unknown; message: string }>(
      `/api/dispatches/${dispatchId}/expenses`,
      input,
    );
    return response.data;
  },

  async handoffDispatch(id: string, input: DispatchHandoffInput) {
    const response = await client.post(`/api/dispatches/${id}/handoff`, input);
    return response.data;
  },

  async receiveDispatch(id: string) {
    const response = await client.post(`/api/dispatches/${id}/receive`);
    return response.data;
  },
};