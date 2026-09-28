import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '../api/invoices';
import { InvoiceFilters, Payment } from '../types/invoice';
import { PaginationParams } from '../types/api';

export const useInvoices = (filters?: InvoiceFilters, pagination?: PaginationParams) => {
  return useQuery({
    queryKey: ['invoices', filters, pagination],
    queryFn: () => invoicesApi.getInvoices(filters, pagination),
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getInvoice(id),
    enabled: !!id,
  });
};

export const useMarkInvoiceAsPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payment }: { id: string; payment: Partial<Payment> }) =>
      invoicesApi.markAsPaid(id, payment),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};
