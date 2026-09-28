'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { ArrowLeft, Download, Loader2, Ship, Anchor, Calendar, MapPin, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Stepper, Step, StepLabel, Box } from '@mui/material';
import { PageHeader, Button, toast, EmptyState, SkeletonCard, SkeletonTable, Tooltip, StatusBadge, FormField } from '@/components/design-system';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';

const steps = ['Basic Info', 'Shipping Details', 'Ports', 'Dates', 'Additional Info'];

interface CompanyOption {
  id: string;
  name: string;
  code?: string | null;
}

export default function NewContainerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [formData, setFormData] = useState({
    containerNumber: '',
    companyId: '',
    trackingNumber: '',
    vesselName: '',
    voyageNumber: '',
    shippingLine: '',
    bookingNumber: '',
    loadingPort: '',
    destinationPort: '',
    transshipmentPorts: [''],
    loadingDate: '',
    departureDate: '',
    estimatedArrival: '',
    maxCapacity: 4,
    notes: '',
    autoTrackingEnabled: true,
    trackingEvents: [] as any[],
    progress: 0,
    currentLocation: '',
  });

  const fetchContainerData = async () => {
    if (!formData.containerNumber.trim()) {
      setFetchError('Please enter a container number first');
      return;
    }

    setFetching(true);
    setFetchError(null);
    setFetchSuccess(null);

    try {
      const response = await fetch(`/api/containers/tracking?containerNumber=${encodeURIComponent(formData.containerNumber)}`);
      const data = await response.json();

      if (response.ok && data.trackingData) {
        const trackingData = data.trackingData;
        
        setFormData(prev => ({
          ...prev,
          trackingNumber: trackingData.trackingNumber || prev.trackingNumber,
          bookingNumber: trackingData.bookingNumber || prev.bookingNumber,
          vesselName: trackingData.vesselName || prev.vesselName,
          voyageNumber: trackingData.voyageNumber || prev.voyageNumber,
          shippingLine: trackingData.shippingLine || prev.shippingLine,
          loadingPort: trackingData.loadingPort || prev.loadingPort,
          destinationPort: trackingData.destinationPort || prev.destinationPort,
          estimatedArrival: trackingData.estimatedArrival ? new Date(trackingData.estimatedArrival).toISOString().split('T')[0] : prev.estimatedArrival,
          departureDate: trackingData.departureDate ? new Date(trackingData.departureDate).toISOString().split('T')[0] : prev.departureDate,
          loadingDate: trackingData.loadingDate ? new Date(trackingData.loadingDate).toISOString().split('T')[0] : prev.loadingDate,
          trackingEvents: trackingData.trackingEvents || [],
          progress: trackingData.progress || 0,
          currentLocation: trackingData.currentLocation || prev.currentLocation,
        }));
        
        const eventCount = trackingData.trackingEvents?.length || 0;
        setFetchSuccess(`Container data fetched successfully! Retrieved ${eventCount} tracking event${eventCount !== 1 ? 's' : ''}. Please review and adjust as needed.`);
      } else {
        setFetchError(data.message || 'Could not fetch container data. Please enter details manually.');
      }
    } catch (error) {
      console.error('Error fetching container data:', error);
      setFetchError('Failed to fetch container data. Please enter details manually.');
    } finally {
      setFetching(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        transshipmentPorts: formData.transshipmentPorts.filter(p => p.trim()),
      };

      const response = await fetch('/api/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Container created successfully!', {
          description: 'Redirecting to container details...'
        });
        router.push(`/dashboard/containers/${data.container.id}`);
      } else {
        toast.error('Failed to create container', {
          description: data.error || 'An error occurred'
        });
      }
    } catch (error) {
      console.error('Error creating container:', error);
      toast.error('Failed to create container', {
        description: 'Please try again later'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch('/api/finance/companies?active=true&companyType=SHIPPING');
        const data = await response.json();
        if (response.ok) {
          setCompanies(data.companies || []);
        }
      } catch (error) {
        console.error('Failed to load companies:', error);
      }
    };

    void fetchCompanies();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: parseInt(e.target.value) || 0,
    }));
  };

  const addTransshipmentPort = () => {
    setFormData(prev => ({
      ...prev,
      transshipmentPorts: [...prev.transshipmentPorts, ''],
    }));
  };

  const removeTransshipmentPort = (index: number) => {
    setFormData(prev => ({
      ...prev,
      transshipmentPorts: prev.transshipmentPorts.filter((_, i) => i !== index),
    }));
  };

  const updateTransshipmentPort = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      transshipmentPorts: prev.transshipmentPorts.map((port, i) => i === index ? value : port),
    }));
  };

  return (
    <AdminRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Create New Container"
          description="Add a new container with tracking and shipping information"
          actions={
            <Button href="/dashboard/containers" variant="outline" size="sm" className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          }
        />

        {/* Stepper */}
        <Box sx={{ width: '100%', mb: 2 }}>
          <Stepper 
            activeStep={activeStep} 
            alternativeLabel
            sx={{
              '& .MuiStepLabel-root .Mui-completed': {
                color: 'var(--accent-gold)',
              },
              '& .MuiStepLabel-root .Mui-active': {
                color: 'var(--accent-gold)',
              },
              '& .MuiStepLabel-label': {
                color: 'var(--text-secondary)',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
              },
              '& .MuiStepLabel-label.Mui-active': {
                color: 'var(--accent-gold)',
                fontWeight: 600,
              },
              '& .MuiStepLabel-label.Mui-completed': {
                color: 'var(--text-primary)',
              },
              '& .MuiStepIcon-root': {
                color: 'var(--border)',
              },
              '& .MuiStepIcon-root.Mui-active': {
                color: 'var(--accent-gold)',
              },
              '& .MuiStepIcon-root.Mui-completed': {
                color: 'var(--accent-gold)',
              },
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fetch Data Success/Error Messages */}
          {fetchSuccess && (
            <div className="rounded-xl border border-[rgba(var(--success-rgb),0.3)] bg-[rgba(var(--success-rgb),0.08)] px-4 py-3 text-sm text-[var(--success)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{fetchSuccess}</p>
              </div>
            </div>
          )}
          {fetchError && (
            <div className="rounded-xl border border-[rgba(var(--warning-rgb),0.3)] bg-[rgba(var(--warning-rgb),0.08)] px-4 py-3 text-sm text-[var(--warning)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{fetchError}</p>
              </div>
            </div>
          )}

          {/* Step 0: Basic Information */}
          {activeStep === 0 && (
            <DashboardPanel
              title={
                <div className="flex items-center gap-2">
                  <Ship className="h-5 w-5 text-[var(--accent-gold)]" />
                  <span>Basic Information</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="md:col-span-2">
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <Box sx={{ flex: 1 }}>
                      <FormField
                        label="Container Number *"
                        id="containerNumber"
                        name="containerNumber"
                        value={formData.containerNumber}
                        onChange={handleChange}
                        required
                        placeholder="e.g., ABCU1234567"
                        helperText="Enter container number and click 'Fetch Data' to automatically retrieve shipping information"
                      />
                    </Box>
                    <Button
                      type="button"
                      onClick={fetchContainerData}
                      disabled={fetching || !formData.containerNumber.trim()}
                      variant="outline"
                      className="sm:w-auto w-full border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)] whitespace-nowrap mb-6"
                    >
                      {fetching ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Fetch Data
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      Container Company *
                    </label>
                    <select
                      id="companyId"
                      name="companyId"
                      value={formData.companyId}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)]"
                    >
                      <option value="">Select a company...</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}{company.code ? ` (${company.code})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      All container and shipment expenses will post to this company ledger.
                    </p>
                  </div>

                  <FormField
                    label="Tracking Number"
                    id="trackingNumber"
                    name="trackingNumber"
                    value={formData.trackingNumber}
                    onChange={handleChange}
                    placeholder="Tracking identifier"
                  />

                  <FormField
                    label="Booking Number"
                    id="bookingNumber"
                    name="bookingNumber"
                    value={formData.bookingNumber}
                    onChange={handleChange}
                    placeholder="Booking reference"
                  />

                  <FormField
                    label="Max Capacity (vehicles)"
                    type="number"
                    id="maxCapacity"
                    name="maxCapacity"
                    value={formData.maxCapacity}
                    onChange={handleNumberChange}
                    placeholder="e.g., 4"
                    inputProps={{ min: 1, max: 20 }}
                  />
                </div>
              </div>
            </DashboardPanel>
          )}

          {/* Step 1: Shipping Details */}
          {activeStep === 1 && (
            <DashboardPanel
              title={
                <div className="flex items-center gap-2">
                  <Anchor className="h-5 w-5 text-[var(--accent-gold)]" />
                  <span>Shipping Details</span>
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Vessel Name"
                  id="vesselName"
                  name="vesselName"
                  value={formData.vesselName}
                  onChange={handleChange}
                  placeholder="e.g., MSC GULSUN"
                />

                <FormField
                  label="Voyage Number"
                  id="voyageNumber"
                  name="voyageNumber"
                  value={formData.voyageNumber}
                  onChange={handleChange}
                  placeholder="e.g., V123"
                />

                <div className="md:col-span-2">
                  <FormField
                    label="Shipping Line"
                    id="shippingLine"
                    name="shippingLine"
                    value={formData.shippingLine}
                    onChange={handleChange}
                    placeholder="e.g., Maersk Line, MSC, CMA CGM, COSCO"
                  />
                </div>
              </div>
            </DashboardPanel>
          )}

          {/* Step 2: Ports */}
          {activeStep === 2 && (
            <DashboardPanel
              title={
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[var(--accent-gold)]" />
                  <span>Ports</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Loading Port"
                    id="loadingPort"
                    name="loadingPort"
                    value={formData.loadingPort}
                    onChange={handleChange}
                    placeholder="e.g., Shanghai, China"
                  />

                  <FormField
                    label="Destination Port"
                    id="destinationPort"
                    name="destinationPort"
                    value={formData.destinationPort}
                    onChange={handleChange}
                    placeholder="e.g., Los Angeles, USA"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Transshipment Ports (Optional)
                  </label>
                  <div className="space-y-2">
                    {formData.transshipmentPorts.map((port, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <Box sx={{ flex: 1 }}>
                          <FormField
                            label={`Port ${index + 1}`}
                            value={port}
                            onChange={(e) => updateTransshipmentPort(index, e.target.value)}
                            placeholder={`Transshipment port ${index + 1}`}
                          />
                        </Box>
                        <Button
                          type="button"
                          onClick={() => removeTransshipmentPort(index)}
                          variant="outline"
                          className="border-[rgba(var(--error-rgb),0.4)] text-[var(--error)] hover:bg-[rgba(var(--error-rgb),0.08)] mb-1"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    onClick={addTransshipmentPort}
                    variant="outline"
                    className="mt-3 border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
                  >
                    + Add Transshipment Port
                  </Button>
                </div>
              </div>
            </DashboardPanel>
          )}

          {/* Step 3: Dates */}
          {activeStep === 3 && (
            <DashboardPanel
              title={
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[var(--accent-gold)]" />
                  <span>Important Dates</span>
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  label="Loading Date"
                  type="date"
                  id="loadingDate"
                  name="loadingDate"
                  value={formData.loadingDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />

                <FormField
                  label="Departure Date"
                  type="date"
                  id="departureDate"
                  name="departureDate"
                  value={formData.departureDate}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />

                <FormField
                  label="Estimated Arrival"
                  type="date"
                  id="estimatedArrival"
                  name="estimatedArrival"
                  value={formData.estimatedArrival}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </div>
            </DashboardPanel>
          )}

          {/* Step 4: Notes and Settings */}
          {activeStep === 4 && (
            <DashboardPanel title="Additional Information">
              <div className="space-y-4">
                <FormField
                  label="Notes"
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes or special instructions..."
                  multiline
                  rows={4}
                />

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoTrackingEnabled"
                    name="autoTrackingEnabled"
                    checked={formData.autoTrackingEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, autoTrackingEnabled: e.target.checked }))}
                    className="w-4 h-4 text-[var(--accent-gold)] border-[var(--border)] rounded focus:ring-[rgba(var(--accent-gold-rgb),0.3)]"
                  />
                  <label htmlFor="autoTrackingEnabled" className="text-sm font-medium text-[var(--text-primary)]">
                    Enable automatic tracking updates
                  </label>
                </div>
              </div>
            </DashboardPanel>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-3 pt-4">
            <div className="flex gap-3">
              <Button
                href="/dashboard/containers"
                variant="outline"
                disabled={loading}
                className="border-[rgba(var(--error-rgb),0.4)] text-[var(--error)] hover:bg-[rgba(var(--error-rgb),0.08)]"
              >
                Cancel
              </Button>
              {activeStep > 0 && (
                <Button
                  type="button"
                  onClick={handleBack}
                  variant="outline"
                  disabled={loading}
                  className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
            </div>
            
            <div className="flex gap-3">
              {activeStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={loading || (activeStep === 0 && (!formData.containerNumber || !formData.companyId))}
                  className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)] text-black font-semibold shadow-sm"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading || !formData.containerNumber || !formData.companyId}
                  className="bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)] text-black font-semibold shadow-sm"
                >
                  {loading ? 'Creating...' : 'Create Container'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DashboardSurface>
    </AdminRoute>
  );
}