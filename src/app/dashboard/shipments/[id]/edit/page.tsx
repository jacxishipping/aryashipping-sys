'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Loader2, 
  Package, 
  User, 
  CheckCircle,
  Save,
  AlertCircle
} from 'lucide-react';
import {
  Box,
  Typography,
  LinearProgress,
  Autocomplete,
  TextField,
} from '@mui/material';

import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, FormField, Breadcrumbs, Select, toast, EmptyState, FormPageSkeleton } from '@/components/design-system';
import ShipmentWorkflowStrip from '@/components/shipments/ShipmentWorkflowStrip';
import { shipmentSchema, type ShipmentFormData } from '@/lib/validations/shipment';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { compressImage, isValidImageFile, formatFileSize } from '@/lib/utils/image-compression';
import { decodeVIN as decodeVINService, getBestWeightEstimate } from '@/lib/services/vin-decoder';
import { buildCopartLotSummary, fetchCopartLotDataForShipment } from '@/lib/copart/lot-client';
import { hasPermission } from '@/lib/rbac';
interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface ContainerOption {
  id: string;
  containerNumber: string;
  status: string;
  currentCount: number;
  maxCapacity: number;
  destinationPort: string | null;
}

interface TransitWorkflowContext {
  transitId: string;
  transitReference: string | null;
  transitStatus: string | null;
  shipmentStatus: string;
  containerId: string | null;
}

interface DispatchWorkflowContext {
  dispatchId: string;
  dispatchReference: string | null;
  dispatchStatus: string | null;
  shipmentStatus: string;
}

const MANUAL_WORKFLOW_STATUSES = new Set(['ON_HAND', 'IN_TRANSIT', 'RELEASED']);

function normalizeEditableStatus(status: string, containerId: string | null) {
  if (MANUAL_WORKFLOW_STATUSES.has(status)) {
    return status as 'ON_HAND' | 'IN_TRANSIT' | 'RELEASED';
  }

  return containerId ? 'RELEASED' : 'ON_HAND';
}

function formatWorkflowStatus(status: string | null | undefined) {
  if (!status) {
    return 'Unknown';
  }

  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}


export default function EditShipmentPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [loadingData, setLoadingData] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [containers, setContainers] = useState<ContainerOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
  const [arrivalPhotos, setArrivalPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [decodingVin, setDecodingVin] = useState(false);
  const [fetchingLotData, setFetchingLotData] = useState(false);
  const [transitWorkflowContext, setTransitWorkflowContext] = useState<TransitWorkflowContext | null>(null);
  const [dispatchWorkflowContext, setDispatchWorkflowContext] = useState<DispatchWorkflowContext | null>(null);

  const canManageShipments = useMemo(() => hasPermission(session?.user?.role, 'shipments:manage'), [session]);

  // Calculate overall upload progress for vehicle photos
  const vehiclePhotosProgress = useMemo(() => {
    const vehicleProgress = Object.entries(uploadProgress)
      .filter(([fileId]) => !fileId.includes('arrival'))
      .map(([, progress]) => progress);
    if (vehicleProgress.length === 0) return 0;
    const sum = vehicleProgress.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / vehicleProgress.length);
  }, [uploadProgress]);

  // Calculate overall upload progress for arrival photos
  const arrivalPhotosProgress = useMemo(() => {
    const arrivalProgress = Object.entries(uploadProgress)
      .filter(([fileId]) => fileId.includes('arrival'))
      .map(([, progress]) => progress);
    if (arrivalProgress.length === 0) return 0;
    const sum = arrivalProgress.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / arrivalProgress.length);
  }, [uploadProgress]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
    control,
  } = useForm<ShipmentFormData>({
    resolver: zodResolver(shipmentSchema),
    mode: 'onBlur',
    defaultValues: {
      vehiclePhotos: [],
      status: 'ON_HAND',
    },
  });

  const statusValue = watch('status');
  const serviceTypeValue = watch('serviceType');
  const vinValue = watch('vehicleVIN');
  const lotNumberValue = watch('lotNumber');
  const isTransitManaged = Boolean(transitWorkflowContext?.transitId);
  const isDispatchManaged = Boolean(dispatchWorkflowContext?.dispatchId);

  // Fetch initial data
  useEffect(() => {
    if (!canManageShipments || status === 'loading') return;

    const fetchData = async () => {
      try {
        setLoadingData(true);
        
        // Fetch users - fetch all users by using a large pageSize
        const usersResponse = await fetch('/api/users?pageSize=1000');
        if (usersResponse.ok) {
          const data = await usersResponse.json();
          setUsers(data.users || []);
        }
        setLoadingUsers(false);

        // Fetch shipment
        const shipmentResponse = await fetch(`/api/shipments/${params.id}`, { cache: 'no-store' });
        if (shipmentResponse.ok) {
          const data = await shipmentResponse.json();
          const shipment = data.shipment;
          const editableStatus = normalizeEditableStatus(shipment.status, shipment.containerId || null);

          setTransitWorkflowContext(
            shipment.transitId
              ? {
                  transitId: shipment.transitId,
                  transitReference: shipment.transit?.referenceNumber || null,
                  transitStatus: shipment.transit?.status || null,
                  shipmentStatus: shipment.status,
                  containerId: shipment.containerId || null,
                }
              : null
          );
          setDispatchWorkflowContext(
            shipment.dispatchId
              ? {
                  dispatchId: shipment.dispatchId,
                  dispatchReference: shipment.dispatch?.referenceNumber || null,
                  dispatchStatus: shipment.dispatch?.status || null,
                  shipmentStatus: shipment.status,
                }
              : null
          );
          
          // Populate form
          reset({
            userId: shipment.userId,
            serviceType: shipment.serviceType || 'SHIPPING_ONLY',
            vehicleType: shipment.vehicleType,
            vehicleMake: shipment.vehicleMake || '',
            vehicleModel: shipment.vehicleModel || '',
            vehicleYear: shipment.vehicleYear?.toString() || '',
            vehicleVIN: shipment.vehicleVIN || '',
            vehicleColor: shipment.vehicleColor || '',
            lotNumber: shipment.lotNumber || '',
            auctionName: shipment.auctionName || '',
            weight: shipment.weight?.toString() || '',
            dimensions: shipment.dimensions || '',
            purchasePrice: shipment.purchasePrice?.toString() || '',
            hasKey: shipment.hasKey,
            hasTitle: shipment.hasTitle,
            titleStatus: shipment.titleStatus || undefined,
            paymentMode: shipment.paymentMode || undefined,
            status: editableStatus,
            containerId: shipment.containerId || '',
            internalNotes: shipment.internalNotes || '',
            vehiclePhotos: shipment.vehiclePhotos || [],
          });

          setVehiclePhotos(shipment.vehiclePhotos || []);
          setArrivalPhotos(shipment.arrivalPhotos || []);

          // If in transit, fetch containers
          if (shipment.status === 'IN_TRANSIT') {
            fetchContainers();
          }
        } else {
          toast.error('Failed to load shipment details');
          router.push('/dashboard/shipments');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('An error occurred while loading data');
      } finally {
        setLoadingUsers(false);
        setLoadingData(false);
      }
    };

    fetchData();
  }, [params.id, canManageShipments, status, reset, router]);

  const fetchContainers = async () => {
    setLoadingContainers(true);
    try {
      // Fetch all active containers by using a large limit
      const response = await fetch('/api/containers?status=active&limit=1000', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setContainers(data.containers);
      }
    } catch (error) {
      console.error('Error fetching containers:', error);
    } finally {
      setLoadingContainers(false);
    }
  };

  // Watch status changes to fetch containers if needed
  useEffect(() => {
    if (statusValue === 'IN_TRANSIT' && containers.length === 0) {
      fetchContainers();
    }
  }, [statusValue, containers.length]);

  // VIN Decoder with enhanced data extraction
  const decodeVIN = async (vin: string) => {
    if (!vin || vin.length !== 17) return;

    setDecodingVin(true);
    try {
      const decodedData = await decodeVINService(vin);

      // Populate basic vehicle info
      if (decodedData.make) setValue('vehicleMake', decodedData.make);
      if (decodedData.model) setValue('vehicleModel', decodedData.model);
      if (decodedData.year) setValue('vehicleYear', decodedData.year);
      
      // Populate vehicle type if available and not already set
      if (decodedData.bodyClass && !watch('vehicleType')) {
        setValue('vehicleType', decodedData.bodyClass);
      }
      
      // Populate color if available from VIN (rare, but worth trying)
      if (decodedData.color) {
        setValue('vehicleColor', decodedData.color);
      }
      
      // Populate weight with best available estimate
      const weightEstimate = getBestWeightEstimate(decodedData);
      if (weightEstimate) {
        setValue('weight', weightEstimate.toString());
      }

      // Build success message with decoded info
      const decodedFields: string[] = [];
      if (decodedData.make && decodedData.model && decodedData.year) {
        decodedFields.push(`${decodedData.year} ${decodedData.make} ${decodedData.model}`);
      }
      if (weightEstimate) {
        decodedFields.push(`Weight: ~${weightEstimate.toLocaleString()} lbs`);
      }
      if (decodedData.color) {
        decodedFields.push(`Color: ${decodedData.color}`);
      }

      toast.success('VIN decoded successfully!', {
        description: decodedFields.join(' • ')
      });
    } catch (error) {
      console.error('Error decoding VIN:', error);
      toast.error('Failed to decode VIN');
    } finally {
      setDecodingVin(false);
    }
  };

  const fetchCopartLotData = async (lotNumber: string) => {
    if (!lotNumber?.trim()) return;

    setFetchingLotData(true);
    try {
      const lotData = await fetchCopartLotDataForShipment(lotNumber.trim());

      setValue('lotNumber', lotData.lotNumber);
      setValue('auctionName', lotData.auctionName);
      if (lotData.vehicleMake) setValue('vehicleMake', lotData.vehicleMake);
      if (lotData.vehicleModel) setValue('vehicleModel', lotData.vehicleModel);
      if (lotData.vehicleYear) setValue('vehicleYear', lotData.vehicleYear);
      if (lotData.vehicleColor) setValue('vehicleColor', lotData.vehicleColor);
      if (lotData.vehicleType) setValue('vehicleType', lotData.vehicleType);
      if (lotData.vehicleVIN) setValue('vehicleVIN', lotData.vehicleVIN);
      if (typeof lotData.hasKey === 'boolean') setValue('hasKey', lotData.hasKey);
      if (typeof lotData.hasTitle === 'boolean') setValue('hasTitle', lotData.hasTitle);
      if (lotData.purchaseDate && !watch('purchaseDate')) setValue('purchaseDate', lotData.purchaseDate);
      if (lotData.purchaseLocation && !watch('purchaseLocation')) setValue('purchaseLocation', lotData.purchaseLocation);
      if (lotData.internalNotes && !watch('internalNotes')) setValue('internalNotes', lotData.internalNotes);

      toast.success('Copart lot data fetched', {
        description: buildCopartLotSummary(lotData),
      });
    } catch (error) {
      console.error('Error fetching Copart lot data:', error);
      toast.error('Failed to fetch Copart lot data', {
        description: error instanceof Error ? error.message : 'Please verify the lot number and try again',
      });
    } finally {
      setFetchingLotData(false);
    }
  };

  // Photo upload with compression and progress tracking
  const handlePhotoUpload = async (file: File, fileId: string, isArrival: boolean = false) => {
    // Validate file type
    if (!isValidImageFile(file)) {
      toast.error('Invalid file type', {
        description: 'Please upload JPEG, PNG, or WebP images only'
      });
      return null;
    }

    // Validate file size (max 10MB before compression)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File too large', {
        description: `File size must be less than ${formatFileSize(maxSize)}`
      });
      return null;
    }

    setUploadingFiles((prev) => new Set(prev).add(fileId));
    setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

    try {
      // Compress image
      setUploadProgress((prev) => ({ ...prev, [fileId]: 10 }));
      const compressedFile = await compressImage(file, 1920, 1920, 0.8);
      setUploadProgress((prev) => ({ ...prev, [fileId]: 30 }));

      // Upload compressed file
      const formData = new FormData();
      formData.append('file', compressedFile);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = 30 + (e.loaded / e.total) * 60; // 30-90%
          setUploadProgress((prev) => ({ ...prev, [fileId]: percentComplete }));
        }
      });

      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText);
              setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
              resolve(result.url);
            } catch (error) {
              reject(new Error('Failed to parse response'));
            }
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });

      const url = await uploadPromise;

      // Update photos state
      if (isArrival) {
        setArrivalPhotos((prev) => [...prev, url]);
      } else {
        setVehiclePhotos((prev) => {
          const newPhotos = [...prev, url];
          setValue('vehiclePhotos', newPhotos);
          return newPhotos;
        });
      }

      // Clean up progress tracking after a delay
      setTimeout(() => {
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
        setUploadingFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      }, 500);

      return url;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo', {
        description: error instanceof Error ? error.message : 'Please try again'
      });
      
      // Clean up on error
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
      
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isArrival: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    // Process all files in parallel
    const uploadPromises = Array.from(files).map((file, index) => {
      const fileId = `${Date.now()}-${index}-${file.name}-${isArrival ? 'arrival' : 'vehicle'}`;
      return handlePhotoUpload(file, fileId, isArrival);
    });

    await Promise.all(uploadPromises);

    e.target.value = '';
    setUploading(false);
  };

  const removePhoto = (index: number, isArrival: boolean = false) => {
    if (isArrival) {
        const newPhotos = arrivalPhotos.filter((_, i) => i !== index);
        setArrivalPhotos(newPhotos);
    } else {
        const newPhotos = vehiclePhotos.filter((_, i) => i !== index);
        setVehiclePhotos(newPhotos);
        setValue('vehiclePhotos', newPhotos);
    }
  };

  const onSubmit = async (data: ShipmentFormData) => {
    try {
      const payload: Record<string, unknown> = {
        ...data,
        arrivalPhotos,
        replaceArrivalPhotos: true,
      };

      if (isTransitManaged || isDispatchManaged) {
        delete payload.status;
        delete payload.containerId;
      }

      const response = await fetch(`/api/shipments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Shipment updated successfully!');
        router.push(`/dashboard/shipments/${params.id}`);
      } else {
        toast.error(result.message || 'Failed to update shipment');
      }
    } catch (error) {
      console.error('Error updating shipment:', error);
      toast.error('An error occurred while updating');
    }
  };

  if (status === 'loading' || loadingData) {
    return (
        <ProtectedRoute>
            <FormPageSkeleton />
        </ProtectedRoute>
    );
  }

  if (!canManageShipments) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <EmptyState
            icon={<AlertCircle className="w-12 h-12" />}
            title="Access Restricted"
            description="You do not have permission to modify shipment details"
            action={
              <Button href={`/dashboard/shipments/${params.id}`} variant="primary">Back to Shipment</Button>
            }
          />
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

        <PageHeader
          title="Edit Shipment"
          description="Update shipment details, status, and documents"
          actions={
            <Button href={`/dashboard/shipments/${params.id}`} variant="outline" icon={<ArrowLeft className="w-4 h-4" />} size="sm">
              Cancel
            </Button>
          }
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pb: 4 }}>
            
            {/* 1. Vehicle Information */}
            <DashboardPanel title="Vehicle Information" description="Basic vehicle details and identification">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                        <Box sx={{ flex: 1 }}>
                            <FormField
                                id="vehicleVIN"
                                label="VIN (Vehicle Identification Number)"
                              placeholder="VIN or vehicle identifier"
                                error={!!errors.vehicleVIN}
                                helperText={errors.vehicleVIN?.message}
                                {...register('vehicleVIN')}
                            />
                        </Box>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => vinValue && decodeVIN(vinValue)}
                            disabled={!vinValue || vinValue.length !== 17 || decodingVin}
                            loading={decodingVin}
                        >
                            {decodingVin ? 'Decoding...' : 'Decode'}
                        </Button>
                    </Box>
                </Box>

                <Box>
                  <Controller
                    name="serviceType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Service Type"
                        value={field.value}
                        onChange={(value) => field.onChange(String(value))}
                        required
                        error={errors.serviceType?.message}
                        options={[
                          { value: 'SHIPPING_ONLY', label: 'Shipping Only' },
                          { value: 'PURCHASE_AND_SHIPPING', label: 'Purchase + Shipping' },
                        ]}
                      />
                    )}
                  />
                </Box>

                {serviceTypeValue === 'PURCHASE_AND_SHIPPING' && (
                  <FormField
                    id="purchasePrice"
                    label="Purchase Price (USD) *"
                    type="number"
                    step="0.01"
                    error={!!errors.purchasePrice}
                    helperText={errors.purchasePrice?.message}
                    {...register('purchasePrice')}
                  />
                )}

                <Box>
                  <Controller
                    name="vehicleType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Vehicle Type"
                        value={field.value}
                        onChange={(value) => field.onChange(String(value))}
                        required
                        placeholder="Select type"
                        error={errors.vehicleType?.message}
                        options={[
                          { value: 'sedan', label: 'Sedan' },
                          { value: 'suv', label: 'SUV' },
                          { value: 'truck', label: 'Truck' },
                          { value: 'motorcycle', label: 'Motorcycle' },
                          { value: 'van', label: 'Van' },
                          { value: 'coupe', label: 'Coupe' },
                          { value: 'convertible', label: 'Convertible' },
                          { value: 'wagon', label: 'Wagon' },
                          { value: 'other', label: 'Other' },
                        ]}
                      />
                    )}
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                  <FormField id="vehicleMake" label="Make" {...register('vehicleMake')} />
                  <FormField id="vehicleModel" label="Model" {...register('vehicleModel')} />
                  <FormField 
                    id="vehicleYear" 
                    label="Year" 
                    type="number" 
                    error={!!errors.vehicleYear}
                    helperText={errors.vehicleYear?.message}
                    {...register('vehicleYear')} 
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                  <FormField id="vehicleColor" label="Color" {...register('vehicleColor')} />
                  <Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
                      <Box sx={{ flex: 1 }}>
                        <FormField id="lotNumber" label="Lot Number" placeholder="Copart lot #" {...register('lotNumber')} />
                      </Box>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => lotNumberValue && fetchCopartLotData(lotNumberValue)}
                        disabled={!lotNumberValue || fetchingLotData}
                        loading={fetchingLotData}
                      >
                        {fetchingLotData ? 'Fetching...' : 'Fetch Data'}
                      </Button>
                    </Box>
                    <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.75 }}>
                      Enter a Copart lot number and use Fetch Data to auto-fill the vehicle details from the public lot page.
                    </Typography>
                  </Box>
                  <FormField id="auctionName" label="Auction Name" {...register('auctionName')} />
                </Box>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                    <FormField
                        id="weight"
                        label="Weight (lbs)"
                        type="number"
                        error={!!errors.weight}
                        helperText={errors.weight?.message}
                        {...register('weight')}
                    />
                    <FormField
                        id="dimensions"
                        label="Dimensions"
                        placeholder="L x W x H"
                        error={!!errors.dimensions}
                        helperText={errors.dimensions?.message}
                        {...register('dimensions')}
                    />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input
                            id="hasKey"
                            type="checkbox"
                            {...register('hasKey')}
                            style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                            }}
                        />
                        <Typography component="label" htmlFor="hasKey" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
                            Has Key
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input
                            id="hasTitle"
                            type="checkbox"
                            {...register('hasTitle')}
                            style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                            }}
                        />
                        <Typography component="label" htmlFor="hasTitle" sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
                            Has Title
                        </Typography>
                    </Box>
                </Box>

                {watch('hasTitle') && (
                    <Box>
                        <Controller
                            name="titleStatus"
                            control={control}
                            render={({ field }) => (
                                <Select
                                    label="Title Status"
                                    value={field.value}
                                    onChange={(value) => field.onChange(String(value))}
                                    placeholder="Select status"
                                    error={errors.titleStatus?.message}
                                    options={[
                                        { value: 'PENDING', label: 'Pending' },
                                        { value: 'DELIVERED', label: 'Delivered' },
                                    ]}
                                />
                            )}
                        />
                    </Box>
                )}
              </Box>
            </DashboardPanel>

            {/* 2. Status & Assignment */}
            <DashboardPanel title="Status & Assignment" description="Customer assignment and shipment status">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <ShipmentWorkflowStrip
                  shipmentStatus={isTransitManaged ? transitWorkflowContext?.shipmentStatus : isDispatchManaged ? dispatchWorkflowContext?.shipmentStatus : statusValue}
                  dispatchId={dispatchWorkflowContext?.dispatchId || null}
                  dispatchReference={dispatchWorkflowContext?.dispatchReference || null}
                  containerId={transitWorkflowContext?.containerId || watch('containerId') || null}
                  containerLabel={transitWorkflowContext?.containerId || watch('containerId') || null}
                  transitId={transitWorkflowContext?.transitId || null}
                  transitReference={transitWorkflowContext?.transitReference || null}
                />

                {isDispatchManaged && dispatchWorkflowContext && (
                  <Box
                    sx={{
                      borderRadius: '16px',
                      border: '1px solid rgba(var(--status-yellow-rgb), 0.3)',
                      backgroundColor: 'rgba(var(--status-yellow-rgb), 0.08)',
                      p: 2,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', mb: 0.75 }}>
                      Workflow Controlled By Dispatch
                    </Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', mb: 1.5 }}>
                      This shipment is currently assigned to dispatch, so status and container assignment are read-only here until the port handoff is completed.
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                      <Box>
                        <Typography sx={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                          Shipment Status
                        </Typography>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatWorkflowStatus(dispatchWorkflowContext.shipmentStatus)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                          Dispatch Reference
                        </Typography>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {dispatchWorkflowContext.dispatchReference || dispatchWorkflowContext.dispatchId}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                          Dispatch Status
                        </Typography>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatWorkflowStatus(dispatchWorkflowContext.dispatchStatus)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}

                {isTransitManaged && transitWorkflowContext && (
                  <Box
                    sx={{
                      borderRadius: '16px',
                      border: '1px solid rgba(var(--status-violet-rgb), 0.28)',
                      backgroundColor: 'rgba(var(--status-violet-rgb), 0.08)',
                      p: 2,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', mb: 0.75 }}>
                      Workflow Controlled By Transit
                    </Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)', mb: 1.5 }}>
                      This shipment is already assigned to a transit, so status and container assignment are read-only here.
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                      <Box>
                        <Typography sx={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                          Shipment Status
                        </Typography>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatWorkflowStatus(transitWorkflowContext.shipmentStatus)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                          Transit Reference
                        </Typography>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {transitWorkflowContext.transitReference || transitWorkflowContext.transitId}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
                          Transit Status
                        </Typography>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatWorkflowStatus(transitWorkflowContext.transitStatus)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}

                <Box>
                  <Typography component="label" htmlFor="userId" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>
                    Select Customer *
                  </Typography>
                  {loadingUsers ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Loader2 className="animate-spin w-4 h-4" />
                        <Typography variant="body2">Loading customers...</Typography>
                    </Box>
                  ) : (
                    <Autocomplete
                      options={users}
                      getOptionLabel={(option) => option.name || option.email}
                      value={users.find(u => u.id === watch('userId')) || null}
                      onChange={(_, newValue) => {
                        setValue('userId', newValue?.id || '', { shouldValidate: true });
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Select customer"
                          error={!!errors.userId}
                          helperText={errors.userId?.message}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '16px',
                              backgroundColor: 'var(--background)',
                              '& fieldset': {
                                borderColor: errors.userId ? 'var(--error)' : 'rgba(var(--border-rgb), 0.9)',
                              },
                              '&:hover fieldset': {
                                borderColor: errors.userId ? 'var(--error)' : 'var(--accent-gold)',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: errors.userId ? 'var(--error)' : 'var(--accent-gold)',
                              },
                            },
                            '& .MuiInputBase-input': {
                              color: 'var(--text-primary)',
                              fontSize: '0.875rem',
                            },
                            '& .MuiInputLabel-root': {
                              color: 'var(--text-secondary)',
                            },
                          }}
                        />
                      )}
                      sx={{
                        '& .MuiAutocomplete-paper': {
                          backgroundColor: 'var(--panel)',
                          border: '1px solid var(--border)',
                        },
                      }}
                    />
                  )}
                </Box>

                {!isTransitManaged && !isDispatchManaged && (
                  <Box>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select
                          label="Shipment Status"
                          value={field.value}
                          onChange={(value) => field.onChange(String(value))}
                          required
                          error={errors.status?.message}
                          options={[
                            { value: 'ON_HAND', label: 'On Hand' },
                            { value: 'IN_TRANSIT', label: 'In Transit' },
                            { value: 'RELEASED', label: 'Released' },
                          ]}
                        />
                      )}
                    />
                  </Box>
                )}

                {!isTransitManaged && !isDispatchManaged && statusValue === 'IN_TRANSIT' && (
                  <Box>
                    <Typography component="label" htmlFor="containerId" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', mb: 1 }}>
                      Container *
                    </Typography>
                    {loadingContainers ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Loader2 className="animate-spin w-4 h-4" />
                        <Typography variant="body2">Loading containers...</Typography>
                      </Box>
                    ) : (
                      <Autocomplete
                        options={containers}
                        getOptionLabel={(option) => 
                          `${option.containerNumber} - ${option.destinationPort || 'No destination'} (${option.currentCount}/${option.maxCapacity})`
                        }
                        value={containers.find(c => c.id === watch('containerId')) || null}
                        onChange={(_, newValue) => {
                          setValue('containerId', newValue?.id || '', { shouldValidate: true });
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder="Select a container"
                            error={!!errors.containerId}
                            helperText={errors.containerId?.message}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '16px',
                                backgroundColor: 'var(--background)',
                                '& fieldset': {
                                  borderColor: errors.containerId ? 'var(--error)' : 'rgba(var(--border-rgb), 0.9)',
                                },
                                '&:hover fieldset': {
                                  borderColor: errors.containerId ? 'var(--error)' : 'var(--accent-gold)',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: errors.containerId ? 'var(--error)' : 'var(--accent-gold)',
                                },
                              },
                              '& .MuiInputBase-input': {
                                color: 'var(--text-primary)',
                                fontSize: '0.875rem',
                              },
                              '& .MuiInputLabel-root': {
                                color: 'var(--text-secondary)',
                              },
                            }}
                          />
                        )}
                        sx={{
                          '& .MuiAutocomplete-paper': {
                            backgroundColor: 'var(--panel)',
                            border: '1px solid var(--border)',
                          },
                        }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            </DashboardPanel>
            
            {/* 3. Photos */}
            <DashboardPanel title="Photos" description="Vehicle condition photos">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Vehicle Photos */}
                    <Box>
                        <Typography sx={{ fontWeight: 600, mb: 2 }}>Vehicle Photos</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <label
                                htmlFor="vehicle-photos"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    minHeight: '150px',
                                    border: '2px dashed var(--border)',
                                    borderRadius: '16px',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: 'var(--background)',
                                }}
                            >
                                <input
                                    id="vehicle-photos"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => handleFileSelect(e, false)}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                />
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                                    {Array.from(uploadingFiles).some(id => !id.includes('arrival')) ? (
                                        <>
                                            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                                            <Typography variant="body2" color="text.secondary">
                                                Uploading {Array.from(uploadingFiles).filter(id => !id.includes('arrival')).length} photo{Array.from(uploadingFiles).filter(id => !id.includes('arrival')).length !== 1 ? 's' : ''}...
                                            </Typography>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-[var(--text-secondary)]" />
                                            <Typography variant="body2" color="text.secondary">
                                                Click to upload vehicle photos
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                PNG, JPG, WebP up to 10MB (Multiple files supported, auto-compressed)
                                            </Typography>
                                        </>
                                    )}
                                </Box>
                            </label>

                            {/* Upload Progress Indicator */}
                            {Object.keys(uploadProgress).filter(id => !id.includes('arrival')).length > 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            Uploading {Object.keys(uploadProgress).filter(id => !id.includes('arrival')).length} photo{Object.keys(uploadProgress).filter(id => !id.includes('arrival')).length !== 1 ? 's' : ''}...
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-gold)' }}>
                                            {vehiclePhotosProgress}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={vehiclePhotosProgress} 
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: 'rgba(var(--border-rgb), 0.2)',
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: 'var(--accent-gold)',
                                                borderRadius: 4,
                                            },
                                        }}
                                    />
                                </Box>
                            )}

                            {vehiclePhotos.length > 0 && (
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
                                    {vehiclePhotos.map((photo, index) => (
                                        <Box key={index} sx={{ position: 'relative', aspectRatio: '1', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                            <Image src={photo} alt={`Vehicle ${index + 1}`} fill className="object-cover" unoptimized />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index, false)}
                                                className="absolute top-2 right-2 bg-[var(--error)] rounded-full p-1 hover:bg-[var(--error-dark)] transition-colors z-10"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>

                    {/* Arrival Photos */}
                    <Box>
                        <Typography sx={{ fontWeight: 600, mb: 2 }}>Arrival Photos (Optional)</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <label
                                htmlFor="arrival-photos"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    minHeight: '150px',
                                    border: '2px dashed var(--border)',
                                    borderRadius: '16px',
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: 'var(--background)',
                                }}
                            >
                                <input
                                    id="arrival-photos"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(e) => handleFileSelect(e, true)}
                                    style={{ display: 'none' }}
                                    disabled={uploading}
                                />
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                                    {Array.from(uploadingFiles).some(id => id.includes('arrival')) ? (
                                        <>
                                            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
                                            <Typography variant="body2" color="text.secondary">
                                                Uploading {Array.from(uploadingFiles).filter(id => id.includes('arrival')).length} photo{Array.from(uploadingFiles).filter(id => id.includes('arrival')).length !== 1 ? 's' : ''}...
                                            </Typography>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-[var(--text-secondary)]" />
                                            <Typography variant="body2" color="text.secondary">
                                                Click to upload arrival photos
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                PNG, JPG, WebP up to 10MB (Multiple files supported, auto-compressed)
                                            </Typography>
                                        </>
                                    )}
                                </Box>
                            </label>

                            {/* Upload Progress Indicator for Arrival Photos */}
                            {Object.keys(uploadProgress).filter(id => id.includes('arrival')).length > 0 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            Uploading {Object.keys(uploadProgress).filter(id => id.includes('arrival')).length} photo{Object.keys(uploadProgress).filter(id => id.includes('arrival')).length !== 1 ? 's' : ''}...
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-gold)' }}>
                                            {arrivalPhotosProgress}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={arrivalPhotosProgress} 
                                        sx={{
                                            height: 8,
                                            borderRadius: 4,
                                            backgroundColor: 'rgba(var(--border-rgb), 0.2)',
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: 'var(--accent-gold)',
                                                borderRadius: 4,
                                            },
                                        }}
                                    />
                                </Box>
                            )}

                            {arrivalPhotos.length > 0 && (
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(5, 1fr)' }, gap: 2 }}>
                                    {arrivalPhotos.map((photo, index) => (
                                        <Box key={index} sx={{ position: 'relative', aspectRatio: '1', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
                                            <Image src={photo} alt={`Arrival ${index + 1}`} fill className="object-cover" unoptimized />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index, true)}
                                                className="absolute top-2 right-2 bg-[var(--error)] rounded-full p-1 hover:bg-[var(--error-dark)] transition-colors z-10"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            </DashboardPanel>



            {/* 5. Internal Notes */}
            <DashboardPanel title="Internal Notes" description="Private notes for staff">
                <FormField
                    id="internalNotes"
                    label="Internal Notes"
                    placeholder="Add any internal notes..."
                    multiline
                    rows={4}
                    error={!!errors.internalNotes}
                    helperText={errors.internalNotes?.message}
                    {...register('internalNotes')}
                />
            </DashboardPanel>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2 }}>
                <Button href={`/dashboard/shipments/${params.id}`} variant="ghost" type="button">Cancel</Button>
                <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={isSubmitting}
                    icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                >
                    {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </Button>
            </Box>
          </Box>
        </form>
      </DashboardSurface>
    </ProtectedRoute>
  );
}