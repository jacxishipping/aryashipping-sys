import { z } from 'zod';

// Shipment validation schema - Container-first architecture
// Shipments only contain: car info, status, container ID, owner, and internal notes
export const shipmentSchema = z.object({
  // Owner/Customer
  userId: z.string().min(1, 'User assignment is required'),
  
  // Service Type - Determines if this is purchase+shipping or shipping-only
  serviceType: z.enum(['PURCHASE_AND_SHIPPING', 'SHIPPING_ONLY']).default('SHIPPING_ONLY'),
  
  // Car Information
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional().refine(
    (val) => !val || (parseInt(val) >= 1900 && parseInt(val) <= new Date().getFullYear() + 1),
    { message: 'Please enter a valid year between 1900 and ' + (new Date().getFullYear() + 1) }
  ),
  vehicleVIN: z.string().optional(),
  vehicleColor: z.string().optional(),
  lotNumber: z.string().optional(),
  auctionName: z.string().optional(),
  weight: z.string().optional().refine(
    (val) => !val || (parseFloat(val) > 0 && parseFloat(val) <= 50000),
    { message: 'Weight must be between 0 and 50,000 lbs' }
  ),
  dimensions: z.string().optional().refine(
    (val) => !val || val.length <= 100,
    { message: 'Dimensions cannot exceed 100 characters' }
  ),
  
  // Purchase Information - Only for PURCHASE_AND_SHIPPING service type
  purchasePrice: z.string().optional().refine(
    (val) => !val || (parseFloat(val) > 0),
    { message: 'Purchase price must be greater than 0' }
  ),
  purchaseDate: z.string().optional(), // Will be converted to Date on server
  purchaseLocation: z.string().optional(),
  dealerName: z.string().optional(),
  purchaseNotes: z.string().optional().refine(
    (val) => !val || val.length <= 500,
    { message: 'Purchase notes cannot exceed 500 characters' }
  ),
  
  vehiclePhotos: z.array(z.string()).default([]),
  hasKey: z.boolean().optional(),
  hasTitle: z.boolean().optional(),
  titleStatus: z.enum(['PENDING', 'DELIVERED']).optional(),
  paymentMode: z.enum(['CASH', 'DUE']).optional(),
  
  // Status lifecycle
  status: z.enum(['ON_HAND', 'IN_TRANSIT', 'RELEASED']).default('ON_HAND'),
  
  // Container ID (nullable, required when status is IN_TRANSIT)
  containerId: z.string().optional(),
  
  // Internal Notes
  internalNotes: z.string().optional().refine(
    (val) => !val || val.length <= 2000,
    { message: 'Internal notes cannot exceed 2000 characters' }
  ),
}).refine((data) => {
  // In-transit or released shipments must be linked to a container
  if ((data.status === 'IN_TRANSIT' || data.status === 'RELEASED') && !data.containerId) {
    return false;
  }
  return true;
}, {
  message: 'Container selection is required when status is IN_TRANSIT or RELEASED',
  path: ['containerId'],
}).refine((data) => {
  // If service type is PURCHASE_AND_SHIPPING, purchase price is required
  if (data.serviceType === 'PURCHASE_AND_SHIPPING' && !data.purchasePrice) {
    return false;
  }
  return true;
}, {
  message: 'Purchase price is required for Purchase + Shipping service',
  path: ['purchasePrice'],
});

export const shipmentUpdateSchema = z.object({
  // Service Type
  serviceType: z.enum(['PURCHASE_AND_SHIPPING', 'SHIPPING_ONLY']).optional(),
  
  // Car Information
  vehicleType: z.string().min(1, 'Vehicle type is required').optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional().refine(
    (val) => !val || (parseInt(val) >= 1900 && parseInt(val) <= new Date().getFullYear() + 1),
    { message: 'Please enter a valid year between 1900 and ' + (new Date().getFullYear() + 1) }
  ),
  vehicleVIN: z.string().optional(),
  vehicleColor: z.string().optional(),
  lotNumber: z.string().optional(),
  auctionName: z.string().optional(),
  weight: z.string().optional().refine(
    (val) => !val || (parseFloat(val) > 0 && parseFloat(val) <= 50000),
    { message: 'Weight must be between 0 and 50,000 lbs' }
  ),
  dimensions: z.string().optional().refine(
    (val) => !val || val.length <= 100,
    { message: 'Dimensions cannot exceed 100 characters' }
  ),
  
  // Purchase Information
  purchasePrice: z.string().optional().refine(
    (val) => !val || (parseFloat(val) > 0),
    { message: 'Purchase price must be greater than 0' }
  ),
  purchaseDate: z.string().optional(),
  purchaseLocation: z.string().optional(),
  dealerName: z.string().optional(),
  purchaseNotes: z.string().optional().refine(
    (val) => !val || val.length <= 500,
    { message: 'Purchase notes cannot exceed 500 characters' }
  ),
  
  hasKey: z.boolean().optional(),
  hasTitle: z.boolean().optional(),
  titleStatus: z.enum(['PENDING', 'DELIVERED']).optional(),
  paymentMode: z.enum(['CASH', 'DUE']).optional(),
  
  // Status and Container
  status: z.enum(['ON_HAND', 'IN_TRANSIT', 'RELEASED']).optional(),
  containerId: z.string().optional(),
  
  // Internal Notes
  internalNotes: z.string().optional().refine(
    (val) => !val || val.length <= 2000,
    { message: 'Internal notes cannot exceed 2000 characters' }
  ),
});

export type ShipmentFormData = z.input<typeof shipmentSchema>;
export type ShipmentUpdateFormData = z.infer<typeof shipmentUpdateSchema>;
