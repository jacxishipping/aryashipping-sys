import client from './client';
import { AnalyticsResponse } from '../types/analytics';

export const analyticsApi = {
  async getOverview(): Promise<AnalyticsResponse> {
    const response = await client.get<AnalyticsResponse>('/api/analytics');
    return response.data;
  },
};