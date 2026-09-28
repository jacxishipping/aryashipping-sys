import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shipmentsApi } from '../api/shipments';
import {
  ShipmentFilters,
  ShipmentCreateInput,
  ShipmentUpdateInput,
  ShipmentTracking,
} from '../types/shipment';
import { PaginationParams } from '../types/api';

export const useShipments = (filters?: ShipmentFilters, pagination?: PaginationParams) => {
  return useQuery({
    queryKey: ['shipments', filters, pagination],
    queryFn: () => shipmentsApi.getShipments(filters, pagination),
  });
};

export const useShipment = (id: string) => {
  return useQuery({
    queryKey: ['shipment', id],
    queryFn: () => shipmentsApi.getShipment(id),
    enabled: !!id,
  });
};

export const useTrackShipment = (trackingNumber: string) => {
  return useQuery({
    queryKey: ['shipment', 'tracking', trackingNumber],
    queryFn: () => shipmentsApi.getShipmentByTracking(trackingNumber),
    enabled: !!trackingNumber,
  });
};

export const useCreateShipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ShipmentCreateInput) => shipmentsApi.createShipment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
};

export const useUpdateShipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ShipmentUpdateInput }) =>
      shipmentsApi.updateShipment(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipment', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
};

export const useDeleteShipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => shipmentsApi.deleteShipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
    },
  });
};

export const useAddTracking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, tracking }: { id: string; tracking: Omit<ShipmentTracking, 'id'> }) =>
      shipmentsApi.addTracking(id, tracking),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipment', variables.id] });
    },
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: FormData }) =>
      shipmentsApi.uploadDocument(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipment', variables.id] });
    },
  });
};

export const useUploadPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: FormData }) =>
      shipmentsApi.uploadPhoto(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipment', variables.id] });
    },
  });
};
