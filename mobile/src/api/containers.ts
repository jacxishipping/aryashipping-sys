import client from './client';
import { Container, ContainerDetail, ContainerExpenseUpdateInput, ContainerFilters, ContainerListResponse } from '../types/container';
import { PaginationParams } from '../types/api';

export const containersApi = {
  async getContainers(
    filters?: ContainerFilters,
    pagination?: PaginationParams
  ): Promise<ContainerListResponse> {
    const response = await client.get<ContainerListResponse>('/api/containers', {
      params: {
        ...filters,
        page: pagination?.page,
        limit: pagination?.pageSize,
      },
    });
    return response.data;
  },

  async getContainer(id: string): Promise<ContainerDetail> {
    const response = await client.get<{ container: ContainerDetail }>(`/api/containers/${id}`);
    return response.data.container;
  },

  async createContainer(data: Partial<Container>): Promise<Container> {
    const response = await client.post<Container>('/api/containers', data);
    return response.data;
  },

  async updateContainer(id: string, data: Partial<Container>): Promise<Container> {
    const response = await client.patch<Container>(`/api/containers/${id}`, data);
    return response.data;
  },

  async updateExpense(containerId: string, input: ContainerExpenseUpdateInput) {
    const response = await client.patch<{ expense: unknown; message: string }>(
      `/api/containers/${containerId}/expenses`,
      input,
    );
    return response.data;
  },

  async deleteContainer(id: string): Promise<void> {
    await client.delete(`/api/containers/${id}`);
  },

  async addShipmentToContainer(containerId: string, shipmentId: string): Promise<Container> {
    const response = await client.post<Container>(
      `/api/containers/${containerId}/shipments/${shipmentId}`
    );
    return response.data;
  },

  async removeShipmentFromContainer(containerId: string, shipmentId: string): Promise<Container> {
    const response = await client.delete<Container>(
      `/api/containers/${containerId}/shipments/${shipmentId}`
    );
    return response.data;
  },
};
