import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useCreateShipment } from '../../hooks/useShipments';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { AppIcon } from '../../components/shared/AppIcon';
import { Toast } from '../../components/ui/Toast';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { useNavigation } from '@react-navigation/native';
import { usersApi } from '../../api/users';
import { containersApi } from '../../api/containers';
import type { AdminUserSummary } from '../../types/admin';
import type { Container } from '../../types/container';

type ServiceType = 'SHIPPING_ONLY' | 'PURCHASE_AND_SHIPPING';
type ShipmentLifecycleStatus = 'ON_HAND' | 'IN_TRANSIT' | 'RELEASED';

interface ShipmentCreateFormValues {
  serviceType: ServiceType;
  vehicleType: string;
  vehicleVIN: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  auctionName: string;
  lotNumber: string;
  status: ShipmentLifecycleStatus;
  containerId: string;
  userId: string;
  purchasePrice: string;
  purchaseLocation: string;
  dealerName: string;
  internalNotes: string;
}

const serviceTypeOptions: Array<{ value: ServiceType; label: string; description: string }> = [
  {
    value: 'SHIPPING_ONLY',
    label: 'Shipping Only',
    description: 'Customer already owns the vehicle. We only manage movement and delivery.',
  },
  {
    value: 'PURCHASE_AND_SHIPPING',
    label: 'Purchase + Shipping',
    description: 'We source the vehicle, record purchase details, and handle shipping.',
  },
];

const vehicleTypeOptions = ['Sedan', 'SUV', 'Truck', 'Motorcycle', 'Van', 'Coupe', 'Convertible', 'Wagon', 'Other'];

const statusOptions: Array<{ value: ShipmentLifecycleStatus; label: string; description: string }> = [
  {
    value: 'ON_HAND',
    label: 'On Hand',
    description: 'Vehicle is not linked to a container yet.',
  },
  {
    value: 'IN_TRANSIT',
    label: 'In Transit',
    description: 'Vehicle should be assigned to an active container.',
  },
  {
    value: 'RELEASED',
    label: 'Released',
    description: 'Vehicle is tied to a released container and ready for the next step.',
  },
];

const sectionSteps = [
  { key: 'vehicle', label: 'Vehicle Info', icon: 'shipments' as const },
  { key: 'photos', label: 'Photos', icon: 'documents' as const },
  { key: 'status', label: 'Status', icon: 'containers' as const },
  { key: 'customer', label: 'Customer', icon: 'customers' as const },
  { key: 'review', label: 'Review', icon: 'delivered' as const },
];

function getUserLabel(user: AdminUserSummary) {
  return user.name || user.email;
}

function getContainerLabel(container: Container) {
  const destination = container.destinationPort || 'Destination pending';
  return `${container.containerNumber} • ${container.currentCount}/${container.maxCapacity} • ${destination}`;
}

const ShipmentCreateScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const createShipment = useCreateShipment();
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ShipmentCreateFormValues>({
    defaultValues: {
      serviceType: 'SHIPPING_ONLY',
      vehicleType: '',
      vehicleVIN: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleYear: '',
      vehicleColor: '',
      auctionName: '',
      lotNumber: '',
      status: 'ON_HAND',
      containerId: '',
      userId: '',
      purchasePrice: '',
      purchaseLocation: '',
      dealerName: '',
      internalNotes: '',
    },
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [toastState, setToastState] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const values = watch();
  const serviceType = values.serviceType;
  const shipmentStatus = values.status;

  const usersQuery = useQuery({
    queryKey: ['shipment-create-users'],
    queryFn: () => usersApi.getUsers({ roleType: 'users' }, { pageSize: 40 }),
  });

  const containersQuery = useQuery({
    queryKey: ['shipment-create-containers'],
    queryFn: () => containersApi.getContainers({}, { pageSize: 40 }),
  });

  const availableUsers = usersQuery.data?.users || [];
  const filteredUsers = useMemo(() => {
    const normalizedSearch = customerSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return availableUsers.slice(0, 12);
    }

    return availableUsers
      .filter((user) => {
        const haystack = `${user.name || ''} ${user.email}`.toLowerCase();
        return haystack.includes(normalizedSearch);
      })
      .slice(0, 12);
  }, [availableUsers, customerSearch]);

  const availableContainers = useMemo(() => {
    return (containersQuery.data?.containers || []).filter((container) => container.currentCount < container.maxCapacity);
  }, [containersQuery.data?.containers]);

  const selectedUser = availableUsers.find((user) => user.id === values.userId) || null;
  const selectedContainer = availableContainers.find((container) => container.id === values.containerId) || null;

  const sectionCompletion = useMemo(() => {
    const vehicleComplete = Boolean(values.vehicleType && values.vehicleMake && values.vehicleModel && values.vehicleYear);
    const statusComplete = values.status === 'ON_HAND' ? true : Boolean(values.containerId);
    const customerComplete = Boolean(values.userId);
    const photosComplete = false;
    const reviewComplete = vehicleComplete && statusComplete && customerComplete && (serviceType === 'SHIPPING_ONLY' || Boolean(values.purchasePrice));

    return {
      vehicle: vehicleComplete,
      photos: photosComplete,
      status: statusComplete,
      customer: customerComplete,
      review: reviewComplete,
    };
  }, [serviceType, values.containerId, values.purchasePrice, values.status, values.userId, values.vehicleMake, values.vehicleModel, values.vehicleType, values.vehicleYear]);

  const completedCount = Object.values(sectionCompletion).filter(Boolean).length;

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastState({ visible: true, message, type });
  };

  const onSubmit = async (data: ShipmentCreateFormValues) => {
    if (!data.userId) {
      showToast('Select a customer before creating the shipment.', 'error');
      return;
    }

    if (!data.vehicleType) {
      showToast('Select a vehicle type to match the web shipment flow.', 'error');
      return;
    }

    if ((data.status === 'IN_TRANSIT' || data.status === 'RELEASED') && !data.containerId) {
      showToast('Select a container when the shipment starts in transit or released.', 'error');
      return;
    }

    if (data.serviceType === 'PURCHASE_AND_SHIPPING' && !data.purchasePrice.trim()) {
      showToast('Purchase price is required for Purchase + Shipping shipments.', 'error');
      return;
    }

    try {
      await createShipment.mutateAsync({
        userId: data.userId,
        serviceType: data.serviceType,
        vehicleType: data.vehicleType,
        vehicleVIN: data.vehicleVIN.trim() || undefined,
        vehicleMake: data.vehicleMake.trim() || undefined,
        vehicleModel: data.vehicleModel.trim() || undefined,
        vehicleYear: data.vehicleYear.trim() || undefined,
        vehicleColor: data.vehicleColor.trim() || undefined,
        auctionName: data.auctionName.trim() || undefined,
        lotNumber: data.lotNumber.trim() || undefined,
        status: data.status,
        containerId: data.status === 'ON_HAND' ? undefined : data.containerId || undefined,
        purchasePrice: data.serviceType === 'PURCHASE_AND_SHIPPING' ? data.purchasePrice.trim() || undefined : undefined,
        purchaseLocation: data.serviceType === 'PURCHASE_AND_SHIPPING' ? data.purchaseLocation.trim() || undefined : undefined,
        dealerName: data.serviceType === 'PURCHASE_AND_SHIPPING' ? data.dealerName.trim() || undefined : undefined,
        internalNotes: data.internalNotes.trim() || undefined,
      });
      showToast('Shipment created successfully!', 'success');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error: any) {
      console.error(error);
      showToast(error?.response?.data?.message || 'The shipment could not be created.', 'error');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Create Shipment" detail="Vehicle, route, and customer setup" showBack />

        <Card style={StyleSheet.flatten([styles.heroCard, { backgroundColor: colors.panel, borderColor: colors.border }])} elevation="elevated" accentBorder>
          <Text style={[styles.heroEyebrow, { color: colors.accent }]}>Shipment Workspace</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Create New Shipment</Text>
          <Text style={[styles.heroCopy, { color: colors.textSecondary }]}>Use the same guided structure as the web dashboard: set the vehicle, confirm status, assign the customer, then review before submit.</Text>

          <View style={styles.heroMetricsRow}>
            <View style={[styles.metricChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{completedCount}/5</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Steps ready</Text>
            </View>
            <View style={[styles.metricChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{serviceType === 'PURCHASE_AND_SHIPPING' ? 'P+S' : 'Ship'}</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Service mode</Text>
            </View>
          </View>
        </Card>

        <View style={styles.stepRail}>
          {sectionSteps.map((step) => {
            const selected = sectionCompletion[step.key as keyof typeof sectionCompletion];
            const isPhotos = step.key === 'photos';

            return (
              <View
                key={step.key}
                style={StyleSheet.flatten([
                  styles.stepCard,
                  {
                    backgroundColor: selected ? colors.accentSoft : colors.panel,
                    borderColor: selected ? `${colors.accent}45` : colors.border,
                  },
                ])}
              >
                <View style={[styles.stepIconBadge, { backgroundColor: selected ? colors.accent : colors.surfaceMuted }]}>
                  <AppIcon name={step.icon} size={16} color={selected ? colors.accentContrast : colors.textSecondary} />
                </View>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{step.label}</Text>
                <Text style={[styles.stepStatus, { color: selected ? colors.accent : colors.textSecondary }]}>
                  {selected ? 'Ready' : isPhotos ? 'Later on mobile' : 'Pending'}
                </Text>
              </View>
            );
          })}
        </View>

        <Card style={styles.sectionCard} accentBorder>
          <Text style={[styles.sectionLabel, { color: colors.accent }]}>Vehicle Information</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Start with the shipment type and core vehicle details</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>This mirrors the web vehicle step so operators can move between desktop and mobile without relearning the form.</Text>

          <Text style={[styles.fieldGroupLabel, { color: colors.textPrimary }]}>Service Type</Text>
          <View style={styles.choiceGrid}>
            {serviceTypeOptions.map((option) => {
              const selected = values.serviceType === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.88}
                  style={StyleSheet.flatten([
                    styles.choiceCard,
                    {
                      backgroundColor: selected ? colors.accentSoft : colors.surfaceMuted,
                      borderColor: selected ? `${colors.accent}45` : colors.border,
                    },
                  ])}
                  onPress={() => setValue('serviceType', option.value, { shouldDirty: true, shouldValidate: true })}
                >
                  <Text style={[styles.choiceTitle, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
                  <Text style={[styles.choiceDescription, { color: colors.textSecondary }]}>{option.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldGroupLabel, { color: colors.textPrimary }]}>Vehicle Type</Text>
          <View style={styles.chipRow}>
            {vehicleTypeOptions.map((option) => {
              const selected = values.vehicleType === option;

              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.85}
                  style={StyleSheet.flatten([
                    styles.filterChip,
                    {
                      backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                      borderColor: selected ? `${colors.accent}35` : colors.border,
                    },
                  ])}
                  onPress={() => setValue('vehicleType', option, { shouldDirty: true, shouldValidate: true })}
                >
                  <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Controller
            control={control}
            name="vehicleVIN"
            render={({ field }) => (
              <Input
                label="VIN"
                placeholder="VIN or vehicle identifier"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="characters"
                error={errors.vehicleVIN?.message}
              />
            )}
          />

          <View style={styles.twoColumnRow}>
            <View style={styles.columnItem}>
              <Controller
                control={control}
                name="vehicleYear"
                rules={{
                  validate: (value) => {
                    if (!value) return true;
                    const parsedYear = Number(value);
                    return (parsedYear >= 1900 && parsedYear <= new Date().getFullYear() + 1) || 'Enter a valid year';
                  },
                }}
                render={({ field }) => (
                  <Input
                    label="Year"
                    placeholder="2023"
                    keyboardType="numeric"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.vehicleYear?.message}
                  />
                )}
              />
            </View>
            <View style={styles.columnItem}>
              <Controller
                control={control}
                name="vehicleColor"
                render={({ field }) => (
                  <Input
                    label="Color"
                    placeholder="Blue"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </View>
          </View>

          <View style={styles.twoColumnRow}>
            <View style={styles.columnItem}>
              <Controller
                control={control}
                name="vehicleMake"
                render={({ field }) => (
                  <Input
                    label="Make"
                    placeholder="Toyota"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </View>
            <View style={styles.columnItem}>
              <Controller
                control={control}
                name="vehicleModel"
                render={({ field }) => (
                  <Input
                    label="Model"
                    placeholder="Camry"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </View>
          </View>

          <View style={styles.twoColumnRow}>
            <View style={styles.columnItem}>
              <Controller
                control={control}
                name="auctionName"
                render={({ field }) => (
                  <Input
                    label="Auction"
                    placeholder="Copart or IAAI"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </View>
            <View style={styles.columnItem}>
              <Controller
                control={control}
                name="lotNumber"
                render={({ field }) => (
                  <Input
                    label="Lot Number"
                    placeholder="Auction lot #"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </View>
          </View>

          {serviceType === 'PURCHASE_AND_SHIPPING' ? (
            <View style={[styles.calloutCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
              <Text style={[styles.calloutTitle, { color: colors.textPrimary }]}>Purchase details</Text>
              <Text style={[styles.calloutCopy, { color: colors.textSecondary }]}>The web flow requires purchase details for this service mode, so mobile now follows the same rule.</Text>

              <Controller
                control={control}
                name="purchasePrice"
                rules={{
                  validate: (value) => {
                    if (values.serviceType !== 'PURCHASE_AND_SHIPPING') return true;
                    return Boolean(value?.trim()) || 'Purchase price is required';
                  },
                }}
                render={({ field }) => (
                  <Input
                    label="Purchase Price"
                    placeholder="15000"
                    keyboardType="numeric"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.purchasePrice?.message}
                  />
                )}
              />

              <Controller control={control} name="purchaseLocation" render={({ field }) => (
                <Input
                  label="Purchase Location"
                  placeholder="Dealer, city, or auction location"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )} />

              <Controller control={control} name="dealerName" render={({ field }) => (
                <Input
                  label="Dealer / Seller"
                  placeholder="Dealer or seller name"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )} />
            </View>
          ) : null}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionLabel, { color: colors.accent }]}>Status & Assignment</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Match the shipment state to the correct container flow</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>This follows the same status-first model as the web form. In-transit and released shipments must be linked to a container.</Text>

          <View style={styles.choiceGrid}>
            {statusOptions.map((option) => {
              const selected = values.status === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.88}
                  style={StyleSheet.flatten([
                    styles.choiceCard,
                    {
                      backgroundColor: selected ? colors.accentSoft : colors.surfaceMuted,
                      borderColor: selected ? `${colors.accent}45` : colors.border,
                    },
                  ])}
                  onPress={() => {
                    setValue('status', option.value, { shouldDirty: true, shouldValidate: true });
                    if (option.value === 'ON_HAND') {
                      setValue('containerId', '', { shouldDirty: true, shouldValidate: true });
                    }
                  }}
                >
                  <Text style={[styles.choiceTitle, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
                  <Text style={[styles.choiceDescription, { color: colors.textSecondary }]}>{option.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {shipmentStatus !== 'ON_HAND' ? (
            <>
              <Text style={[styles.fieldGroupLabel, { color: colors.textPrimary }]}>Assign Container</Text>

              {containersQuery.isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading containers...</Text>
                </View>
              ) : availableContainers.length > 0 ? (
                <View style={styles.chipRow}>
                  {availableContainers.slice(0, 10).map((container) => {
                    const selected = values.containerId === container.id;

                    return (
                      <TouchableOpacity
                        key={container.id}
                        activeOpacity={0.85}
                        style={StyleSheet.flatten([
                          styles.filterChip,
                          styles.fullWidthChip,
                          {
                            backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                            borderColor: selected ? `${colors.accent}35` : colors.border,
                          },
                        ])}
                        onPress={() => setValue('containerId', container.id, { shouldDirty: true, shouldValidate: true })}
                      >
                        <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{getContainerLabel(container)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={[styles.calloutCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                  <Text style={[styles.calloutCopy, { color: colors.textSecondary }]}>No containers with open capacity are available right now. Set the shipment to On Hand or create space in a container first.</Text>
                </View>
              )}

              {selectedContainer ? (
                <View style={[styles.selectionSummary, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                  <Text style={[styles.selectionSummaryLabel, { color: colors.textSecondary }]}>Selected container</Text>
                  <Text style={[styles.selectionSummaryValue, { color: colors.textPrimary }]}>{getContainerLabel(selectedContainer)}</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionLabel, { color: colors.accent }]}>Customer</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Assign the shipment owner the same way you do on web</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>Search users, then tap to assign. This replaces the old raw ID field and matches the web user step.</Text>

          <Input
            label="Search Customers"
            placeholder="Search by name or email"
            value={customerSearch}
            onChangeText={setCustomerSearch}
          />

          {usersQuery.isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading customers...</Text>
            </View>
          ) : (
            <View style={styles.chipRow}>
              {filteredUsers.map((user) => {
                const selected = values.userId === user.id;

                return (
                  <TouchableOpacity
                    key={user.id}
                    activeOpacity={0.85}
                    style={StyleSheet.flatten([
                      styles.filterChip,
                      styles.fullWidthChip,
                      {
                        backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                        borderColor: selected ? `${colors.accent}35` : colors.border,
                      },
                    ])}
                    onPress={() => setValue('userId', user.id, { shouldDirty: true, shouldValidate: true })}
                  >
                    <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{getUserLabel(user)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {selectedUser ? (
            <View style={[styles.selectionSummary, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <Text style={[styles.selectionSummaryLabel, { color: colors.textSecondary }]}>Assigned customer</Text>
              <Text style={[styles.selectionSummaryValue, { color: colors.textPrimary }]}>{getUserLabel(selectedUser)}</Text>
            </View>
          ) : (
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>Pick one customer before submitting.</Text>
          )}
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionLabel, { color: colors.accent }]}>Review</Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Add internal context before you submit</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>Photos can still be added later from shipment details. Use notes here for anything the operations team should see immediately.</Text>

          <Controller control={control} name="internalNotes" render={({ field }) => (
            <Input
              label="Internal Notes"
              placeholder="Important handling, title, or follow-up notes"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              multiline
              numberOfLines={5}
              containerStyle={styles.notesInput}
            />
          )} />

          <View style={styles.reviewGrid}>
            <View style={[styles.reviewItem, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Vehicle</Text>
              <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>
                {values.vehicleYear || 'Year'} {values.vehicleMake || 'Make'} {values.vehicleModel || 'Model'}
              </Text>
            </View>
            <View style={[styles.reviewItem, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
              <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Assignment</Text>
              <Text style={[styles.reviewValue, { color: colors.textPrimary }]}>{selectedUser ? getUserLabel(selectedUser) : 'Select a customer'}</Text>
            </View>
          </View>

          <Button title="Create Shipment" onPress={handleSubmit(onSubmit)} loading={createShipment.isPending} fullWidth />
        </Card>
      </ScrollView>

      <Toast visible={toastState.visible} message={toastState.message} type={toastState.type} onHide={() => setToastState((prev) => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'], gap: Spacing.base },
  heroCard: {
    gap: Spacing.sm,
  },
  heroEyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
  },
  heroCopy: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  heroMetricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  metricChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: 4,
  },
  metricValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
  },
  stepRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stepCard: {
    flexGrow: 1,
    minWidth: '30%',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  stepIconBadge: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  stepStatus: {
    fontSize: Typography.fontSize.xs,
  },
  sectionCard: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionDescription: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  fieldGroupLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing.xs,
  },
  choiceGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  choiceCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  choiceTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  choiceDescription: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  fullWidthChip: {
    width: '100%',
    borderRadius: BorderRadius.lg,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  columnItem: {
    flex: 1,
  },
  calloutCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  calloutTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  calloutCopy: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
  },
  selectionSummary: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  selectionSummaryLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  selectionSummaryValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  helperText: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  notesInput: {
    marginBottom: Spacing.sm,
  },
  reviewGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  reviewItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: 4,
  },
  reviewLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  reviewValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default ShipmentCreateScreen;
