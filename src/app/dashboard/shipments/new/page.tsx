'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Upload, X, Loader2, Package, User, FileText, CheckCircle, ArrowRight, Camera } from 'lucide-react';
function sxToStyle(sx?: any): React.CSSProperties {
  if (!sx) return {};
  const style: any = {};
  for (const [key, val] of Object.entries(sx)) {
    if (key.startsWith('&') || key.startsWith('@')) continue;
    if (typeof val === 'object' && val !== null) {
      const resolved = (val as any).xs ?? (val as any).md ?? (val as any).lg;
      if (resolved !== undefined) style[key] = resolved;
      continue;
    }
    if (key === 'bgcolor') style.backgroundColor = val;
    else if (key === 'p') style.padding = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'px') { style.paddingLeft = typeof val === 'number' ? `${val * 8}px` : val; style.paddingRight = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'py') { style.paddingTop = typeof val === 'number' ? `${val * 8}px` : val; style.paddingBottom = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'pt') style.paddingTop = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pb') style.paddingBottom = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pl') style.paddingLeft = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'pr') style.paddingRight = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'm') style.margin = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mx') { style.marginLeft = typeof val === 'number' ? `${val * 8}px` : val; style.marginRight = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'my') { style.marginTop = typeof val === 'number' ? `${val * 8}px` : val; style.marginBottom = typeof val === 'number' ? `${val * 8}px` : val; }
    else if (key === 'mt') style.marginTop = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mb') style.marginBottom = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'ml') style.marginLeft = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'mr') style.marginRight = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'gap') style.gap = typeof val === 'number' ? `${val * 8}px` : val;
    else if (key === 'borderRadius') style.borderRadius = typeof val === 'number' ? `${val * 8}px` : val;
    else style[key] = val;
  }
  return style;
}

function Box({ children, className = '', component: Component = 'div', sx, style, ...props }: any) {
  return (
    <Component className={className} style={{ ...sxToStyle(sx), ...style }} {...props}>
      {children}
    </Component>
  );
}

function Typography({ children, className = '', component: Component = 'div', variant, color, noWrap, sx, style, ...props }: any) {
  const variantClass = variant === 'caption' ? 'text-xs text-[var(--text-secondary)]' : variant === 'subtitle2' ? 'text-sm font-semibold' : variant === 'body2' ? 'text-sm' : '';
  return (
    <Component className={`${variantClass} ${noWrap ? 'truncate' : ''} ${className}`} style={{ ...sxToStyle(sx), ...style }} {...props}>
      {children}
    </Component>
  );
}

function LinearProgress({ value = 0, sx, className = '' }: any) {
  return (
    <div className={`w-full bg-[var(--border)] rounded-full h-2 overflow-hidden ${className}`} style={sxToStyle(sx)}>
      <div className="bg-[var(--accent-gold)] h-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function Stepper({ activeStep = 0, children, className = '' }: any) {
  return (
    <div className={`w-full mb-6 flex items-center justify-between relative max-w-3xl mx-auto px-4 ${className}`}>
      {React.Children.map(children, (child, idx) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as any, {
          active: activeStep === idx,
          completed: activeStep > idx,
          stepIndex: idx + 1,
        });
      })}
    </div>
  );
}

function Step({ children, active, completed, stepIndex }: any) {
  return (
    <div className="flex flex-col items-center relative z-10">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
        active 
          ? 'bg-[var(--accent-gold)] text-black shadow-md ring-2 ring-[var(--accent-gold)] ring-offset-2 ring-offset-[var(--background)]' 
          : completed 
          ? 'bg-[var(--accent-gold)] text-black' 
          : 'bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]'
      }`}>
        {stepIndex}
      </div>
      {children}
    </div>
  );
}

function StepLabel({ children, className = '' }: any) {
  return (
    <span className={`text-xs mt-1.5 font-medium text-[var(--text-secondary)] ${className}`}>
      {children}
    </span>
  );
}

function TextField({ label, value, onChange, disabled, type = 'text', size, placeholder, helperText, multiline, rows = 3, className = '', InputProps, ...props }: any) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-semibold text-[var(--text-secondary)]">{label}</label>}
      <div className="relative flex items-center">
        {InputProps?.startAdornment && (
          <div className="absolute left-3 text-[var(--text-secondary)]">{InputProps.startAdornment}</div>
        )}
        <input
          type={type}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full ${InputProps?.startAdornment ? 'pl-9' : 'pl-3'} ${InputProps?.endAdornment ? 'pr-9' : 'pr-3'} ${size === 'small' ? 'py-1.5 text-xs' : 'py-2 text-sm'} rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors disabled:opacity-50`}
          {...props}
        />
        {InputProps?.endAdornment && (
          <div className="absolute right-3 text-[var(--text-secondary)]">{InputProps.endAdornment}</div>
        )}
      </div>
      {helperText && <span className="text-[0.75rem] text-[var(--text-secondary)]">{helperText}</span>}
    </div>
  );
}

function Autocomplete({
  options = [],
  value,
  onChange,
  onInputChange,
  getOptionLabel = (opt: any) => opt?.name || opt?.label || String(opt || ''),
  renderInput,
  loading = false,
  multiple = false,
}: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const selectedOption = value;

  const filteredOptions = useMemo(() => {
    if (!inputValue.trim()) return options;
    return options.filter((opt: any) =>
      getOptionLabel(opt).toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, inputValue, getOptionLabel]);

  const handleSelect = (option: any) => {
    onChange(null, option);
    setIsOpen(false);
  };

  const inputParams = {
    value: value ? getOptionLabel(value) : inputValue,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      if (onInputChange) onInputChange(e, e.target.value);
      if (!isOpen) setIsOpen(true);
    },
    onFocus: () => setIsOpen(true),
    InputProps: {
      endAdornment: null,
    },
  };

  return (
    <div className="relative w-full">
      {renderInput(inputParams)}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-xl p-1 text-sm">
          {loading ? (
            <div className="p-3 text-center text-xs text-[var(--text-secondary)]">Loading...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-xs text-[var(--text-secondary)]">No options</div>
          ) : (
            filteredOptions.map((option: any, idx: number) => {
              const isSelected = (selectedOption?.id || selectedOption) === (option.id || option);
              return (
                <div
                  key={option.id || idx}
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-[rgba(var(--accent-gold-rgb),0.15)] text-[var(--accent-gold)] font-medium' : 'hover:bg-[var(--panel-hover)] text-[var(--text-primary)]'
                  }`}
                  onClick={() => handleSelect(option)}
                >
                  {getOptionLabel(option)}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, FormField, Breadcrumbs, Select, toast } from '@/components/design-system';
import { shipmentSchema, type ShipmentFormData } from '@/lib/validations/shipment';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { BarcodeScannerModal } from '@/components/ui/BarcodeScannerModal';
import { AiDocumentAutoFillDropzone, type ExtractedShipmentData } from '@/components/shipments/AiDocumentAutoFillDropzone';
import { compressImage, isValidImageFile, formatFileSize } from '@/lib/utils/image-compression';
import { decodeVIN as decodeVINService, getBestWeightEstimate } from '@/lib/services/vin-decoder';
import { buildCopartLotSummary, fetchCopartLotDataForShipment } from '@/lib/copart/lot-client';
import { buildIaaiLotSummary, fetchIaaiLotDataForShipment } from '@/lib/iaai/lot-client';
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

interface CompanyOption {
	id: string;
	name: string;
	isActive: boolean;
}

const steps = [
	{ label: 'Vehicle Info', icon: Package },
	{ label: 'Photos', icon: Upload },
	{ label: 'Status', icon: CheckCircle },
	{ label: 'Customer', icon: User },
	{ label: 'Review', icon: FileText },
];

export default function NewShipmentPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const [activeStep, setActiveStep] = useState(0);
	const [users, setUsers] = useState<UserOption[]>([]);
	const [containers, setContainers] = useState<ContainerOption[]>([]);
	const [loadingUsers, setLoadingUsers] = useState(true);
	const [loadingContainers, setLoadingContainers] = useState(false);
	const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([]);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
	const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
	const [decodingVin, setDecodingVin] = useState(false);
	const [fetchingLotData, setFetchingLotData] = useState(false);
	const [scannerOpen, setScannerOpen] = useState(false);

	const handleBarcodeScan = (scannedVin: string) => {
		setValue('vehicleVIN', scannedVin, { shouldValidate: true });
		toast.success(`VIN captured: ${scannedVin}`);
		if (scannedVin.length === 17) {
			void decodeVIN(scannedVin);
		}
	};

	const handleAiDocumentExtracted = (data: ExtractedShipmentData) => {
		if (data.vin) {
			setValue('vehicleVIN', data.vin, { shouldValidate: true });
			if (data.vin.length === 17) {
				void decodeVIN(data.vin);
			}
		}
		if (data.year) setValue('vehicleYear', String(data.year), { shouldValidate: true });
		if (data.make) setValue('vehicleMake', data.make, { shouldValidate: true });
		if (data.model) setValue('vehicleModel', data.model, { shouldValidate: true });
		if (data.color) setValue('vehicleColor', data.color, { shouldValidate: true });
		if (data.lotNumber) setValue('lotNumber', data.lotNumber, { shouldValidate: true });
		if (data.auctionName) setValue('auctionName', data.auctionName, { shouldValidate: true });
		if (data.hasKeys !== undefined) setValue('hasKey', data.hasKeys, { shouldValidate: true });
		if (data.hasTitle !== undefined) setValue('hasTitle', data.hasTitle, { shouldValidate: true });
		if (data.purchasePrice && data.purchasePrice > 0) {
			setValue('purchasePrice', String(data.purchasePrice), { shouldValidate: true });
		}
	};

	// Calculate overall upload progress
	const overallProgress = useMemo(() => {
		const progressValues = Object.values(uploadProgress);
		if (progressValues.length === 0) return 0;
		const sum = progressValues.reduce((acc, val) => acc + val, 0);
		return Math.round(sum / progressValues.length);
	}, [uploadProgress]);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		setValue,
		watch,
		trigger,
		control,
	} = useForm<ShipmentFormData>({
		resolver: zodResolver(shipmentSchema),
		mode: 'onBlur',
		defaultValues: {
			vehiclePhotos: [],
			status: 'ON_HAND',
			serviceType: 'SHIPPING_ONLY',
		},
	});

	const statusValue = watch('status');
	const vinValue = watch('vehicleVIN');
	const lotNumberValue = watch('lotNumber');
	const auctionNameValue = watch('auctionName');
	const dealerNameValue = watch('dealerName');
	const serviceTypeValue = watch('serviceType');
	const formValues = watch();

	useEffect(() => {
		if (serviceTypeValue !== 'PURCHASE_AND_SHIPPING') return;

		if (auctionNameValue && auctionNameValue !== 'Other') {
			setValue('dealerName', auctionNameValue, { shouldValidate: true });
			return;
		}

		if (auctionNameValue === 'Other' && (dealerNameValue === 'Copart' || dealerNameValue === 'IAAI')) {
			setValue('dealerName', '', { shouldValidate: true });
		}
	}, [auctionNameValue, dealerNameValue, serviceTypeValue, setValue]);

	// Fetch users
	useEffect(() => {
		const fetchUsers = async () => {
			try {
				// Fetch all users by using a large pageSize
				const response = await fetch('/api/users?pageSize=1000');
				if (response.ok) {
					const data = await response.json();
					setUsers(data.users);
				}
			} catch (error) {
				console.error('Error fetching users:', error);
			} finally {
				setLoadingUsers(false);
			}
		};

		void fetchUsers();
	}, []);

	// Fetch containers when status changes to IN_TRANSIT
	useEffect(() => {
		if (statusValue === 'IN_TRANSIT') {
			const fetchContainers = async () => {
				setLoadingContainers(true);
				try {
					// Fetch all active containers by using a large limit
					const response = await fetch('/api/containers?status=active&limit=1000');
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

			void fetchContainers();
		}
	}, [statusValue]);

	// VIN Decoder with enhanced data extraction
	const decodeVIN = async (vin: string) => {
		if (vin.length !== 17) return;

		setDecodingVin(true);
		try {
			const decodedData = await decodeVINService(vin);

			// Populate basic vehicle info
			if (decodedData.make) setValue('vehicleMake', decodedData.make);
			if (decodedData.model) setValue('vehicleModel', decodedData.model);
			if (decodedData.year) setValue('vehicleYear', decodedData.year);
			
			// Populate vehicle type if available
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
			toast.error('Failed to decode VIN', {
				description: 'Please check the VIN and try again'
			});
		} finally {
			setDecodingVin(false);
		}
	};

	const fetchAuctionLotData = async (lotNumber: string) => {
		if (!lotNumber?.trim()) return;

		if (serviceTypeValue !== 'PURCHASE_AND_SHIPPING') {
			toast.error('Lot data fetch is only available for Purchase + Shipping shipments');
			return;
		}

		if (!auctionNameValue) {
			toast.error('Select an auction before fetching lot data');
			return;
		}

		if (auctionNameValue !== 'Copart' && auctionNameValue !== 'IAAI') {
			toast.error('Automatic lot data fetch currently supports Copart and IAAI only');
			return;
		}

		setFetchingLotData(true);
		try {
			const trimmedLotNumber = lotNumber.trim();
			const { lotData, lotSummary } = await (auctionNameValue === 'IAAI'
				? fetchIaaiLotDataForShipment(trimmedLotNumber).then((data) => ({
					lotData: data,
					lotSummary: buildIaaiLotSummary(data),
				}))
				: fetchCopartLotDataForShipment(trimmedLotNumber).then((data) => ({
					lotData: data,
					lotSummary: buildCopartLotSummary(data),
				})));

			const setFetchedValue = (field: Parameters<typeof setValue>[0], value: Parameters<typeof setValue>[1]) => {
				setValue(field, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
			};

			setFetchedValue('lotNumber', lotData.lotNumber);
			setFetchedValue('auctionName', lotData.auctionName);
			if (lotData.vehicleMake) setFetchedValue('vehicleMake', lotData.vehicleMake);
			if (lotData.vehicleModel) setFetchedValue('vehicleModel', lotData.vehicleModel);
			if (lotData.vehicleYear) setFetchedValue('vehicleYear', lotData.vehicleYear);
			if (lotData.vehicleColor) setFetchedValue('vehicleColor', lotData.vehicleColor);
			if (lotData.vehicleType) setFetchedValue('vehicleType', lotData.vehicleType);
			if (lotData.vehicleVIN) setFetchedValue('vehicleVIN', lotData.vehicleVIN);
			if (typeof lotData.hasKey === 'boolean') setFetchedValue('hasKey', lotData.hasKey);
			if (typeof lotData.hasTitle === 'boolean') setFetchedValue('hasTitle', lotData.hasTitle);
			if (lotData.purchaseDate && !formValues.purchaseDate) setFetchedValue('purchaseDate', lotData.purchaseDate);
			if (lotData.purchaseLocation && !formValues.purchaseLocation) setFetchedValue('purchaseLocation', lotData.purchaseLocation);
			if (lotData.internalNotes && !formValues.internalNotes) setFetchedValue('internalNotes', lotData.internalNotes);

			toast.success(`${auctionNameValue} lot data fetched`, {
				description: lotSummary,
			});
		} catch (error) {
			console.error(`Error fetching ${auctionNameValue} lot data:`, error);
			toast.error(`Failed to fetch ${auctionNameValue || 'auction'} lot data`, {
				description: error instanceof Error ? error.message : 'Please verify the lot number and try again',
			});
		} finally {
			setFetchingLotData(false);
		}
	};

	// Photo upload with compression and progress tracking
	const handlePhotoUpload = async (file: File, fileId: string) => {
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
			setVehiclePhotos((prev) => {
				const newPhotos = [...prev, url];
				setValue('vehiclePhotos', newPhotos);
				return newPhotos;
			});

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

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;

		setUploading(true);

		// Process all files in parallel
		const uploadPromises = Array.from(files).map((file, index) => {
			const fileId = `${Date.now()}-${index}-${file.name}`;
			return handlePhotoUpload(file, fileId);
		});

		await Promise.all(uploadPromises);

		e.target.value = '';
		setUploading(false);
	};

	const removePhoto = (index: number) => {
		const newPhotos = vehiclePhotos.filter((_, i) => i !== index);
		setVehiclePhotos(newPhotos);
		setValue('vehiclePhotos', newPhotos);
	};

	// Form submission
	const onSubmit = async (data: ShipmentFormData) => {
		try {
			const response = await fetch('/api/shipments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			const result = await response.json();

			if (response.ok) {
				toast.success('Shipment created successfully!');
				setTimeout(() => {
					router.push('/dashboard/shipments');
				}, 1500);
			} else {
				toast.error(result.message || 'Failed to create shipment', {
					description: 'Please check your inputs and try again'
				});
			}
		} catch (error) {
			console.error('Error creating shipment:', error);
			toast.error('An error occurred', {
				description: 'Please try again later'
			});
		}
	};

	const handleNext = async () => {
		let fieldsToValidate: (keyof ShipmentFormData)[] = [];

		switch (activeStep) {
			case 0: // Vehicle Info
				fieldsToValidate = ['vehicleType', 'vehicleVIN', 'vehicleMake', 'vehicleModel', 'vehicleYear'];
				break;
			case 1: // Photos - optional, can skip
				break;
			case 2: // Status
				fieldsToValidate = ['status'];
				if (statusValue === 'IN_TRANSIT') {
					fieldsToValidate.push('containerId');
				}
				break;
			case 3: // Customer
				fieldsToValidate = ['userId'];
				break;
		}

		if (fieldsToValidate.length > 0) {
			const isValid = await trigger(fieldsToValidate);
			if (!isValid) return;
		}

		setActiveStep((prev) => prev + 1);
	};

	const handleBack = () => {
		setActiveStep((prev) => prev - 1);
	};

	if (!hasPermission(session?.user?.role, 'shipments:manage')) {
		return (
			<ProtectedRoute>
				<DashboardSurface>
					<Box sx={{ textAlign: 'center', py: 12 }}>
						<Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
							Access Denied
						</Typography>
						<Typography sx={{ color: 'var(--text-secondary)', mt: 2 }}>
							You do not have permission to create shipments.
						</Typography>
					</Box>
				</DashboardSurface>
			</ProtectedRoute>
		);
	}

	return (
		<ProtectedRoute>
			<DashboardSurface>
				{/* Breadcrumbs */}
				<Box sx={{ px: 2, pt: 2 }}>
					<Breadcrumbs />
				</Box>
				
				<PageHeader
					title="Create New Shipment"
					description="Add vehicle information with guided steps"
					actions={
						<Button href="/dashboard/shipments" variant="outline" icon={<ArrowLeft className="w-4 h-4" />} iconPosition="start" size="sm">
							Back
						</Button>
					}
				/>

				{/* Stepper */}
				<DashboardPanel>
					<Stepper
						activeStep={activeStep}
						alternativeLabel
						sx={{
							'& .MuiStepLabel-root .Mui-completed': {
								color: 'var(--accent-gold)',
							},
							'& .MuiStepLabel-label.Mui-completed': {
								color: 'var(--text-primary)',
								fontWeight: 600,
							},
							'& .MuiStepLabel-root .Mui-active': {
								color: 'var(--accent-gold)',
							},
							'& .MuiStepLabel-label.Mui-active': {
								color: 'var(--text-primary)',
								fontWeight: 600,
							},
							'& .MuiStepLabel-label': {
								color: 'var(--text-secondary)',
								fontSize: '0.85rem',
							},
							'& .MuiStepConnector-line': {
								borderColor: 'var(--border)',
							},
							'& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
								borderColor: 'var(--accent-gold)',
							},
							'& .MuiStepIcon-root': {
								color: 'var(--border)',
								fontSize: '2rem',
							},
							'& .MuiStepIcon-root.Mui-active': {
								color: 'var(--accent-gold)',
							},
							'& .MuiStepIcon-root.Mui-completed': {
								color: 'var(--accent-gold)',
							},
						}}
					>
						{steps.map((step, index) => (
							<Step key={step.label}>
								<StepLabel>{step.label}</StepLabel>
							</Step>
						))}
					</Stepper>
				</DashboardPanel>

				{/* Form Content */}
				<form onSubmit={handleSubmit(onSubmit)}>
					{/* Step 0: Vehicle Information */}
					{activeStep === 0 && (
						<DashboardPanel title="Vehicle Information" description="Enter basic vehicle details">
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
								{/* Smart AI Document Ingest Dropzone */}
								<AiDocumentAutoFillDropzone onExtracted={handleAiDocumentExtracted} />

								{/* Service Type - NEW */}
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
													{ value: 'SHIPPING_ONLY', label: 'Shipping Only (Customer owns vehicle)' },
													{ value: 'PURCHASE_AND_SHIPPING', label: 'Purchase + Shipping (We buy for customer)' },
												]}
											/>
										)}
									/>
									<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
										{serviceTypeValue === 'PURCHASE_AND_SHIPPING' 
											? '📦 Purchase + Shipping: We buy the vehicle from auction/dealer and ship it'
											: '🚚 Shipping Only: Customer already owns the vehicle, we just handle shipping'}
									</Typography>
								</Box>

								{/* VIN */}
								<Box>
									<Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
										<Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 0 } }}>
											<FormField
												id="vehicleVIN"
												label="VIN (Vehicle Identification Number)"
												placeholder="VIN or vehicle identifier"
												error={!!errors.vehicleVIN}
												helperText={errors.vehicleVIN?.message}
												{...register('vehicleVIN')}
											/>
										</Box>
										<Box sx={{ display: 'flex', gap: 1 }}>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => setScannerOpen(true)}
												className="shrink-0 text-xs"
											>
												<Camera className="w-3.5 h-3.5 mr-1 text-[var(--accent-gold)]" />
												Scan
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => vinValue && decodeVIN(vinValue)}
												disabled={!vinValue || vinValue.length !== 17 || decodingVin}
												loading={decodingVin}
												className="shrink-0 text-xs"
											>
												{decodingVin ? 'Decoding...' : 'Decode'}
											</Button>
										</Box>
									</Box>
								</Box>

								{/* Vehicle Type */}
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

								{/* Make, Model, Year */}
								<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
									<FormField
										id="vehicleMake"
										label="Make"
										placeholder="e.g., Toyota"
										{...register('vehicleMake')}
									/>
									<FormField
										id="vehicleModel"
										label="Model"
										placeholder="e.g., Camry"
										{...register('vehicleModel')}
									/>
									<FormField
										id="vehicleYear"
										label="Year"
										type="number"
										placeholder="e.g., 2022"
										error={!!errors.vehicleYear}
										helperText={errors.vehicleYear?.message}
										{...register('vehicleYear')}
									/>
								</Box>

								{/* Color, Auction, Lot Number */}
								<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
									<FormField
										id="vehicleColor"
										label="Color"
										placeholder="e.g., Blue"
										{...register('vehicleColor')}
									/>
									<Box>
										<Controller
											name="auctionName"
											control={control}
											render={({ field }) => (
												<Select
													label="Auction"
													value={field.value}
													onChange={(value) => field.onChange(String(value))}
													placeholder="Select auction"
													error={errors.auctionName?.message}
													options={[
														{ value: 'Copart', label: 'Copart' },
														{ value: 'IAAI', label: 'IAAI' },
														{ value: 'Other', label: 'Other' },
													]}
												/>
											)}
										/>
									</Box>
									<Box>
										<Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end' }}>
											<Box sx={{ flex: 1 }}>
												<FormField
													id="lotNumber"
													label="Lot Number"
													placeholder="Auction lot #"
													{...register('lotNumber')}
												/>
											</Box>
											{serviceTypeValue === 'PURCHASE_AND_SHIPPING' && (
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => lotNumberValue && fetchAuctionLotData(lotNumberValue)}
													disabled={!lotNumberValue || !auctionNameValue || auctionNameValue === 'Other' || fetchingLotData}
													loading={fetchingLotData}
												>
													{fetchingLotData ? 'Fetching...' : 'Fetch Data'}
												</Button>
											)}
										</Box>
										<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.75 }}>
											{serviceTypeValue === 'PURCHASE_AND_SHIPPING'
												? auctionNameValue === 'Copart'
													? 'Enter a Copart lot number and use Fetch Data to auto-fill vehicle details.'
													: auctionNameValue
														? auctionNameValue === 'IAAI'
															? 'Enter an IAAI stock number and use Fetch Data to auto-fill vehicle details.'
															: 'Save the auction and lot number manually. Automatic fetch supports Copart and IAAI only.'
														: 'Select an auction before fetching lot data.'
												: 'Lot data fetch is available only for Purchase + Shipping shipments.'}
										</Typography>
									</Box>
								</Box>

								{/* Weight, Dimensions */}
								<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
									<FormField
										id="weight"
										label="Weight (lbs)"
										type="number"
										placeholder="Vehicle weight"
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

								{/* Has Key, Has Title */}
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

								{/* Title Status */}
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

								{/* Purchase Information - Only shown for PURCHASE_AND_SHIPPING */}
								{serviceTypeValue === 'PURCHASE_AND_SHIPPING' && (
									<>
										<Box sx={{ 
											mt: 3, 
											p: 3, 
											borderRadius: '12px', 
											backgroundColor: 'rgba(var(--accent-gold-rgb), 0.05)',
											border: '1px solid rgba(var(--accent-gold-rgb), 0.2)'
										}}>
											<Typography sx={{ 
												fontSize: '1rem', 
												fontWeight: 600, 
												color: 'var(--text-primary)', 
												mb: 2,
												display: 'flex',
												alignItems: 'center',
												gap: 1
											}}>
												💰 Purchase Information
											</Typography>

											{/* Purchase Price and Date */}
											<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
												<FormField
													id="purchasePrice"
													label="Purchase Price *"
													type="number"
													placeholder="Amount paid for vehicle"
													error={!!errors.purchasePrice}
													helperText={errors.purchasePrice?.message || 'Price company paid for the vehicle'}
													{...register('purchasePrice')}
													required
												/>
												<FormField
													id="purchaseDate"
													label="Purchase Date"
													type="date"
													error={!!errors.purchaseDate}
													helperText={errors.purchaseDate?.message}
													{...register('purchaseDate')}
												/>
											</Box>

											{/* Dealer/Auction Information */}
											<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
												{auctionNameValue === 'Other' ? (
													<FormField
														id="dealerName"
														label="Auction / Dealer Name"
														placeholder="Enter auction or dealer name"
														error={!!errors.dealerName}
														helperText={errors.dealerName?.message}
														{...register('dealerName')}
													/>
												) : (
													<Box>
														<input type="hidden" {...register('dealerName')} />
														<Typography
															component="label"
															sx={{
																display: 'block',
																fontSize: '0.875rem',
																fontWeight: 500,
																color: 'var(--text-primary)',
																mb: 1,
															}}
														>
															Selected Auction
														</Typography>
														<Box
															sx={{
																minHeight: 42,
																display: 'flex',
																alignItems: 'center',
																px: 1.5,
																borderRadius: '16px',
																border: '1px solid rgba(var(--border-rgb), 0.9)',
																backgroundColor: 'var(--background)',
																color: auctionNameValue ? 'var(--text-primary)' : 'var(--text-secondary)',
																fontSize: '0.875rem',
															}}
														>
															{auctionNameValue || 'Select auction above'}
														</Box>
													</Box>
												)}
												<FormField
													id="purchaseLocation"
													label="Purchase Location"
													placeholder="City, State"
													error={!!errors.purchaseLocation}
													helperText={errors.purchaseLocation?.message}
													{...register('purchaseLocation')}
												/>
											</Box>

											{/* Purchase Notes */}
											<FormField
												id="purchaseNotes"
												label="Purchase Notes"
												placeholder="Additional details about the purchase..."
												error={!!errors.purchaseNotes}
												helperText={errors.purchaseNotes?.message}
												{...register('purchaseNotes')}
												multiline
												rows={3}
											/>
										</Box>
									</>
								)}
							</Box>
						</DashboardPanel>
					)}

					{/* Step 1: Photos */}
					{activeStep === 1 && (
						<DashboardPanel title="Vehicle Photos" description="Upload images of the vehicle">
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
								<label
									htmlFor="photos"
									style={{
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
										justifyContent: 'center',
										width: '100%',
										minHeight: '200px',
										border: '2px dashed var(--border)',
										borderRadius: '16px',
										cursor: uploading ? 'not-allowed' : 'pointer',
										transition: 'all 0.2s ease',
										backgroundColor: 'var(--background)',
									}}
									onMouseEnter={(e) => {
										if (!uploading) {
											e.currentTarget.style.borderColor = 'var(--accent-gold)';
											e.currentTarget.style.backgroundColor = 'rgba(var(--accent-gold-rgb), 0.05)';
										}
									}}
									onMouseLeave={(e) => {
										e.currentTarget.style.borderColor = 'var(--border)';
										e.currentTarget.style.backgroundColor = 'var(--background)';
									}}
								>
									<input
										id="photos"
										type="file"
										multiple
										accept="image/*"
										onChange={handleFileSelect}
										style={{ display: 'none' }}
										disabled={uploading}
									/>
									<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
										{uploadingFiles.size > 0 ? (
											<>
												<Loader2 style={{ fontSize: 40, color: 'var(--accent-gold)' }} className="animate-spin" />
												<Typography sx={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
													Uploading {uploadingFiles.size} photo{uploadingFiles.size !== 1 ? 's' : ''}...
												</Typography>
											</>
										) : (
											<>
												<Upload style={{ fontSize: 40, color: 'var(--accent-gold)' }} />
												<Typography sx={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
													Click to upload vehicle photos
												</Typography>
												<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
													PNG, JPG, WebP up to 10MB (Multiple files supported, auto-compressed)
												</Typography>
											</>
										)}
									</Box>
								</label>

								{/* Upload Progress Indicator */}
								{Object.keys(uploadProgress).length > 0 && (
									<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
										<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
											<Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
												Uploading {Object.keys(uploadProgress).length} photo{Object.keys(uploadProgress).length !== 1 ? 's' : ''}...
											</Typography>
											<Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-gold)' }}>
												{overallProgress}%
											</Typography>
										</Box>
										<LinearProgress 
											variant="determinate" 
											value={overallProgress} 
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
									<Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
										{vehiclePhotos.map((photo, index) => (
											<Box
												key={index}
												sx={{
													position: 'relative',
													aspectRatio: '1',
													borderRadius: 2,
													overflow: 'hidden',
													border: '1px solid var(--border)',
													'&:hover .remove-button': {
														opacity: 1,
													},
												}}
											>
												<Image
													src={photo}
													alt={`Vehicle photo ${index + 1}`}
													fill
													className="object-cover"
													unoptimized
												/>
												<Box
													className="remove-button"
													component="button"
													type="button"
													onClick={() => removePhoto(index)}
													sx={{
														position: 'absolute',
														top: 8,
														right: 8,
														bgcolor: 'rgba(var(--error-rgb), 0.9)',
														borderRadius: '50%',
														p: 0.5,
														opacity: 0,
														transition: 'opacity 0.2s ease',
														cursor: 'pointer',
														border: 'none',
														zIndex: 1,
														'&:hover': {
															bgcolor: 'var(--error)',
														},
													}}
												>
													<X style={{ fontSize: 16, color: 'white' }} />
												</Box>
											</Box>
										))}
									</Box>
								)}
							</Box>
						</DashboardPanel>
					)}

					{/* Step 2: Status & Container */}
					{activeStep === 2 && (
						<DashboardPanel title="Status & Container" description="Set shipment status and assign to container">
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
								{/* Status */}
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
									<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
										{statusValue === 'ON_HAND'
											? 'Vehicle is currently on hand, not yet assigned to a container'
											: statusValue === 'IN_TRANSIT'
											? 'Vehicle is in transit - must be assigned to a container'
											: 'Vehicle is released and ready for transit assignment'}
									</Typography>
								</Box>

								{/* Container Selection - Only shown when IN_TRANSIT */}
								{statusValue === 'IN_TRANSIT' && (
									<Box>
										<Typography
											component="label"
											htmlFor="containerId"
											sx={{
												display: 'block',
												fontSize: '0.875rem',
												fontWeight: 500,
												color: 'var(--text-primary)',
												mb: 1,
											}}
										>
											Container *
										</Typography>
										{loadingContainers ? (
											<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'var(--text-secondary)' }}>
												<Loader2 style={{ fontSize: 18 }} className="animate-spin" />
												<Typography sx={{ fontSize: '0.85rem' }}>Loading containers...</Typography>
											</Box>
										) : (
											<>
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
												<Box sx={{ mt: 2 }}>
													<Button href="/dashboard/containers/new" target="_blank" variant="outline" size="sm">
														Create New Container
													</Button>
												</Box>
											</>
										)}
									</Box>
								)}
							</Box>
						</DashboardPanel>
					)}

					{/* Step 3: Customer & Financial */}
					{activeStep === 3 && (
						<DashboardPanel title="Customer & Financial" description="Select customer and enter pricing">
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
								{/* Customer Selection */}
								<Box>
									<Typography
										component="label"
										htmlFor="userId"
										sx={{
											display: 'block',
											fontSize: '0.875rem',
											fontWeight: 500,
											color: 'var(--text-primary)',
											mb: 1,
										}}
									>
										Select Customer *
									</Typography>
									{loadingUsers ? (
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'var(--text-secondary)' }}>
											<Loader2 style={{ fontSize: 18 }} className="animate-spin" />
											<Typography sx={{ fontSize: '0.85rem' }}>Loading customers...</Typography>
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
								{/* Payment Mode */}
								<Box>
									<Typography
										sx={{
											display: 'block',
											fontSize: '0.875rem',
											fontWeight: 500,
											color: 'var(--text-primary)',
											mb: 1.5,
										}}
									>
										Payment Mode
									</Typography>
									<Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
										<Box
											component="label"
											sx={{
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												gap: 1.5,
												p: 2,
												border: watch('paymentMode') === 'CASH' ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
												borderRadius: 2,
												bgcolor: watch('paymentMode') === 'CASH' ? 'rgba(var(--accent-gold-rgb), 0.08)' : 'var(--panel)',
												cursor: 'pointer',
												transition: 'all 0.2s ease',
												'&:hover': {
													borderColor: 'var(--accent-gold)',
												},
											}}
										>
											<input
												type="radio"
												value="CASH"
												{...register('paymentMode')}
												style={{ display: 'none' }}
											/>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
												Cash
											</Typography>
										</Box>
										<Box
											component="label"
											sx={{
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'center',
												gap: 1.5,
												p: 2,
												border: watch('paymentMode') === 'DUE' ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
												borderRadius: 2,
												bgcolor: watch('paymentMode') === 'DUE' ? 'rgba(var(--accent-gold-rgb), 0.08)' : 'var(--panel)',
												cursor: 'pointer',
												transition: 'all 0.2s ease',
												'&:hover': {
													borderColor: 'var(--accent-gold)',
												},
											}}
										>
											<input
												type="radio"
												value="DUE"
												{...register('paymentMode')}
												style={{ display: 'none' }}
											/>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
												Due
											</Typography>
										</Box>
									</Box>
								</Box>
							</Box>
						</DashboardPanel>
					)}

					{/* Step 4: Review & Submit */}
					{activeStep === 4 && (
						<DashboardPanel title="Review & Submit" description="Verify all details before creating">
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
								{/* Summary */}
								<Box
									sx={{
										p: 3,
										borderRadius: 2,
										border: '1px solid var(--border)',
										bgcolor: 'var(--background)',
									}}
								>
									<Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', mb: 2 }}>
										Shipment Summary
									</Typography>
									<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
										<Box>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
												Service Type
											</Typography>
											<Box
												sx={{
													display: 'inline-block',
													px: 1.5,
													py: 0.5,
													borderRadius: 1,
													bgcolor: formValues.serviceType === 'PURCHASE_AND_SHIPPING' ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'rgba(var(--status-violet-rgb), 0.15)',
													color: formValues.serviceType === 'PURCHASE_AND_SHIPPING' ? 'var(--accent-gold)' : 'var(--status-violet)',
													fontSize: '0.75rem',
													fontWeight: 600,
												}}
											>
												{formValues.serviceType === 'PURCHASE_AND_SHIPPING' ? '📦 Purchase + Shipping' : '🚚 Shipping Only'}
											</Box>
										</Box>
										<Box>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
												Vehicle
											</Typography>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
												{formValues.vehicleYear} {formValues.vehicleMake} {formValues.vehicleModel}
											</Typography>
										</Box>
										<Box>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
												VIN
											</Typography>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
												{formValues.vehicleVIN || 'N/A'}
											</Typography>
										</Box>
										<Box>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
												Type
											</Typography>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
												{formValues.vehicleType}
											</Typography>
										</Box>
										<Box>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
												Status
											</Typography>
											<Box
												sx={{
													display: 'inline-block',
													px: 1.5,
													py: 0.5,
													borderRadius: 1,
													bgcolor: formValues.status === 'IN_TRANSIT' ? 'rgba(var(--status-violet-rgb), 0.15)' : 'rgba(var(--text-secondary-rgb), 0.15)',
													color: formValues.status === 'IN_TRANSIT' ? 'var(--status-violet)' : 'var(--text-secondary)',
													fontSize: '0.75rem',
													fontWeight: 600,
												}}
											>
												{formValues.status === 'IN_TRANSIT' ? 'In Transit' : 'On Hand'}
											</Box>
										</Box>
										{formValues.serviceType === 'PURCHASE_AND_SHIPPING' && formValues.purchasePrice && (
											<Box>
												<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
													Purchase Price
												</Typography>
												<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
													${parseFloat(formValues.purchasePrice).toLocaleString()}
												</Typography>
											</Box>
										)}
									</Box>

									{/* Purchase Information Summary */}
									{formValues.serviceType === 'PURCHASE_AND_SHIPPING' && (formValues.dealerName || formValues.purchaseLocation || formValues.purchaseDate) && (
										<Box sx={{ mt: 3, pt: 3, borderTop: '1px solid var(--border)' }}>
											<Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', mb: 2 }}>
												💰 Purchase Details
											</Typography>
											<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
												{formValues.dealerName && (
													<Box>
														<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
															Dealer/Auction
														</Typography>
														<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
															{formValues.dealerName}
														</Typography>
													</Box>
												)}
												{formValues.purchaseLocation && (
													<Box>
														<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
															Location
														</Typography>
														<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
															{formValues.purchaseLocation}
														</Typography>
													</Box>
												)}
												{formValues.purchaseDate && (
													<Box>
														<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
															Purchase Date
														</Typography>
														<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
															{new Date(formValues.purchaseDate).toLocaleDateString()}
														</Typography>
													</Box>
												)}
											</Box>
											{formValues.purchaseNotes && (
												<Box sx={{ mt: 2 }}>
													<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 0.5 }}>
														Purchase Notes
													</Typography>
													<Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
														{formValues.purchaseNotes}
													</Typography>
												</Box>
											)}
										</Box>
									)}

									{vehiclePhotos.length > 0 && (
										<Box sx={{ mt: 2, pt: 2, borderTop: '1px solid var(--border)' }}>
											<Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', mb: 1 }}>
												Photos Uploaded
											</Typography>
											<Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
												{vehiclePhotos.length} photo{vehiclePhotos.length !== 1 ? 's' : ''}
											</Typography>
										</Box>
									)}
								</Box>

								{/* Internal Notes */}
								<Box>
									<FormField
										id="internalNotes"
										label="Internal Notes (Optional)"
										placeholder="Add any internal notes about this shipment..."
										multiline
										rows={4}
										error={!!errors.internalNotes}
										helperText={errors.internalNotes?.message}
										{...register('internalNotes')}
									/>
								</Box>
							</Box>
						</DashboardPanel>
					)}

					{/* Navigation Buttons */}
					<Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
						<Button
							type="button"
							variant="outline"
							onClick={handleBack}
							disabled={activeStep === 0}
							icon={<ArrowLeft className="w-4 h-4" />}
						>
							Back
						</Button>

						<Box sx={{ display: 'flex', gap: 2 }}>
							<Button href="/dashboard/shipments" variant="ghost">
								Cancel
							</Button>
							
							{activeStep === steps.length - 1 ? (
								<Button
									type="submit"
									variant="primary"
									disabled={isSubmitting}
									icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
								>
									{isSubmitting ? 'Creating...' : 'Create Shipment'}
								</Button>
							) : (
								<Button
									type="button"
									variant="primary"
									onClick={handleNext}
									icon={<ArrowRight className="w-4 h-4" />}
									iconPosition="end"
								>
									Next
								</Button>
							)}
						</Box>
					</Box>
				</form>

				<BarcodeScannerModal
					open={scannerOpen}
					onClose={() => setScannerOpen(false)}
					onScan={handleBarcodeScan}
					title="Scan Vehicle VIN Barcode"
					description="Point your camera at the VIN barcode on the door jamb, title, or windshield"
				/>
			</DashboardSurface>
		</ProtectedRoute>
	);
}
