import client from './client';
import { PartnerPortalCreateInput, PartnerPortalDetail, PartnerPortalSummary, PartnerPortalUpdateInput, PortalActivityItem } from '../types/admin';

export interface PartnerPortalsResponse {
  portals: PartnerPortalSummary[];
}

export interface PortalActivityResponse {
  portal: {
    id: string;
    name: string;
    code: string | null;
  };
  activities: PortalActivityItem[];
}

export const partnerPortalsApi = {
  async getPortals(): Promise<PartnerPortalsResponse> {
    const response = await client.get<PartnerPortalsResponse>('/api/partner-portals');
    return response.data;
  },

  async getPortal(id: string): Promise<PartnerPortalDetail> {
    const response = await client.get<{ portal: PartnerPortalDetail }>(`/api/partner-portals/${id}`);
    return response.data.portal;
  },

  async getActivity(portalId: string, params?: { limit?: number; action?: string; actor?: string }): Promise<PortalActivityResponse> {
    const response = await client.get<PortalActivityResponse>(`/api/partner-portals/${portalId}/activity`, {
      params,
    });

    return response.data;
  },

  async createPortal(input: PartnerPortalCreateInput): Promise<PartnerPortalSummary> {
    const response = await client.post<{ portal: PartnerPortalSummary }>('/api/partner-portals', input);
    return response.data.portal;
  },

  async updatePortal(id: string, input: PartnerPortalUpdateInput): Promise<PartnerPortalDetail> {
    const response = await client.patch<{ portal: PartnerPortalDetail }>(`/api/partner-portals/${id}`, input);
    return response.data.portal;
  },
};