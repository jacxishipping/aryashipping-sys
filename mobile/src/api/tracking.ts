import client from './client';
import { Shipment } from '../types/shipment';

export const trackingApi = {
  async trackByNumber(trackingNumber: string): Promise<Shipment> {
    const response = await client.get<Shipment>(`/api/tracking/${trackingNumber}`);
    return response.data;
  },

  async trackByVin(vin: string): Promise<Shipment> {
    const response = await client.get<Shipment>(`/api/tracking/vin/${vin}`);
    return response.data;
  },

  async getPublicTracking(trackingNumber: string): Promise<Shipment> {
    const response = await client.get<Shipment>(`/api/public/tracking/${trackingNumber}`);
    return response.data;
  },
};
