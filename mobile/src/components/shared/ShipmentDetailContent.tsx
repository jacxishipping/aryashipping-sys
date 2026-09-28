import React, { useMemo, useState } from 'react';
import { Alert, Image, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { Shipment } from '../../types/shipment';
import { AppTopBar } from './AppTopBar';
import { AppIcon } from './AppIcon';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatusBadge } from './StatusBadge';
import { Divider } from '../ui/Divider';
import { TrackingTimeline } from '../customer/TrackingTimeline';
import { ShipmentDocumentsCard } from './ShipmentDocumentsCard';
import { EmptyState } from './EmptyState';
import { DetailTabs, DetailTabOption } from './DetailTabs';
import { AssignToTransitModal } from '../admin/AssignToTransitModal';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useAuth } from '../../hooks/useAuth';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface ShipmentDetailContentProps {
  shipment: Shipment;
  showCustomer: boolean;
}

type ShipmentDetailTabKey = 'overview' | 'activity' | 'documents' | 'photos' | 'billing' | 'customer';

const formatValue = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') {
    return 'Not set';
  }

  return String(value);
};

const formatCurrency = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Not set';
  }

  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const formatDateValue = (value?: string | null) => {
  if (!value) {
    return 'Not set';
  }

  return format(new Date(value), 'MMM d, yyyy');
};

export const ShipmentDetailContent: React.FC<ShipmentDetailContentProps> = ({ shipment, showCustomer }) => {
  const { colors } = useAppTheme();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const vehicleLabel = [shipment.vehicle.year, shipment.vehicle.make, shipment.vehicle.model].filter(Boolean).join(' ');
  const routeOrigin = [shipment.origin.city, shipment.origin.state].filter(Boolean).join(', ');
  const routeDestination = [shipment.destination.city, shipment.destination.country].filter(Boolean).join(', ');
  const activityCount = shipment.tracking.length;
  const totalPhotos = shipment.photos.length;
  const totalDocuments = shipment.documents.length;

  const canAssignToTransit =
    isAdmin &&
    Boolean(shipment.releaseToken) &&
    !shipment.transitId &&
    (shipment.status === 'RELEASED' || shipment.containerStatus === 'RELEASED');

  const tabs = useMemo<DetailTabOption[]>(() => {
    const baseTabs: DetailTabOption[] = [
      { key: 'overview', label: 'Overview' },
      { key: 'activity', label: `Timeline (${activityCount})` },
      { key: 'documents', label: `Documents (${totalDocuments})` },
      { key: 'photos', label: `Photos (${totalPhotos})` },
      { key: 'billing', label: 'Financials' },
    ];

    if (showCustomer) {
      baseTabs.splice(4, 0, { key: 'customer', label: 'Customer' });
    }

    return baseTabs;
  }, [activityCount, showCustomer, totalDocuments, totalPhotos]);

  const [activeTab, setActiveTab] = useState<ShipmentDetailTabKey>('overview');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [assignToTransitVisible, setAssignToTransitVisible] = useState(false);
  const selectedPhoto = selectedPhotoIndex !== null ? shipment.photos[selectedPhotoIndex] : null;

  const openPhotoExternal = async (url?: string) => {
    if (!url) {
      Alert.alert('Photo unavailable', 'This photo does not have a valid source URL yet.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Cannot open photo', 'Your device could not open this image URL.');
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open photo URL:', error);
      Alert.alert('Unable to open photo', 'Try again in a moment.');
    }
  };

  const handleDownloadPhoto = async (url?: string) => {
    await openPhotoExternal(url);
  };

  const overviewContent = (
    <View style={styles.sectionStack}>
      <Card style={styles.sectionCard} accentBorder>
        <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>Overview</Text>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Route and workflow snapshot</Text>
        <Text style={[styles.sectionText, { color: colors.textSecondary }]}>This mirrors the web shipment summary: route context first, then delivery timing and workflow linkage.</Text>

        <View style={styles.detailGrid}>
          <View style={[styles.detailCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Text style={[styles.detailCardLabel, { color: colors.textSecondary }]}>Tracking</Text>
            <Text style={[styles.detailCardValue, { color: colors.textPrimary }]}>{formatValue(shipment.trackingNumber)}</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Text style={[styles.detailCardLabel, { color: colors.textSecondary }]}>Container</Text>
            <Text style={[styles.detailCardValue, { color: colors.textPrimary }]}>{formatValue(shipment.containerNumber)}</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Text style={[styles.detailCardLabel, { color: colors.textSecondary }]}>ETA</Text>
            <Text style={[styles.detailCardValue, { color: colors.textPrimary }]}>{formatDateValue(shipment.estimatedDelivery)}</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Text style={[styles.detailCardLabel, { color: colors.textSecondary }]}>Last Updated</Text>
            <Text style={[styles.detailCardValue, { color: colors.textPrimary }]}>{formatDateValue(shipment.updatedAt)}</Text>
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>From</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(routeOrigin)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>To</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(routeDestination)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.status.replace(/_/g, ' '))}</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>Vehicle</Text>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Vehicle profile</Text>
        <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Keep the same hierarchy as the web details page: core vehicle identity first, then supporting attributes.</Text>

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Vehicle</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(vehicleLabel)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>VIN</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.vehicle.vin)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.vehicle.type)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Color</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.vehicle.color)}</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>Financials</Text>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick financial summary</Text>
        <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Surface the same billing context early so operators do not need to jump tabs for the basic numbers.</Text>

        <View style={styles.detailGrid}>
          <View style={[styles.detailCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Text style={[styles.detailCardLabel, { color: colors.textSecondary }]}>Total</Text>
            <Text style={[styles.detailCardValue, { color: colors.textPrimary }]}>{formatCurrency(shipment.pricing?.total)}</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Text style={[styles.detailCardLabel, { color: colors.textSecondary }]}>Shipping</Text>
            <Text style={[styles.detailCardValue, { color: colors.textPrimary }]}>{formatCurrency(shipment.pricing?.shippingCost)}</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Text style={[styles.detailCardLabel, { color: colors.textSecondary }]}>Ocean Freight</Text>
            <Text style={[styles.detailCardValue, { color: colors.textPrimary }]}>{formatCurrency(shipment.pricing?.oceanFreight)}</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Text style={[styles.detailCardLabel, { color: colors.textSecondary }]}>Insurance</Text>
            <Text style={[styles.detailCardValue, { color: colors.textPrimary }]}>{formatCurrency(shipment.pricing?.insurance)}</Text>
          </View>
        </View>

        {shipment.notes ? <Text style={[styles.notes, { color: colors.textSecondary }]}>Notes: {shipment.notes}</Text> : null}
      </Card>
    </View>
  );

  const activityContent = (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Activity & Tracking</Text>
      <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Track progression, checkpoints, and the current shipment status.</Text>
      <TrackingTimeline tracking={shipment.tracking} currentStatus={shipment.status} />
    </Card>
  );

  const documentsContent = <ShipmentDocumentsCard shipmentId={shipment.id} />;

  const photosContent = (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Photos</Text>
      <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Arrival, condition, and shipment-related image records. Tap a photo to preview it, then use the viewer actions to open or download the original.</Text>
      {shipment.photos.length === 0 ? (
        <EmptyState icon="documents" title="No Photos" description="No shipment photos are available yet." />
      ) : (
        <View style={styles.photoGrid}>
          {shipment.photos.map((photo, index) => (
            <View key={photo.id} style={styles.photoCell}>
              <TouchableOpacity activeOpacity={0.88} onPress={() => setSelectedPhotoIndex(index)}>
                <Image source={{ uri: photo.url }} style={[styles.photo, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} resizeMode="cover" />
              </TouchableOpacity>
              <Text style={[styles.photoCaption, { color: colors.textSecondary }]} numberOfLines={2}>
                {photo.caption || format(new Date(photo.uploadedAt), 'MMM d, yyyy')}
              </Text>
              <TouchableOpacity activeOpacity={0.85} onPress={() => void handleDownloadPhoto(photo.url)}>
                <Text style={[styles.photoActionLink, { color: colors.accent }]}>Open / Download</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </Card>
  );

  const billingContent = (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Billing & Financials</Text>
      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatCurrency(shipment.pricing?.total)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Shipping Cost</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatCurrency(shipment.pricing?.shippingCost)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Ocean Freight</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatCurrency(shipment.pricing?.oceanFreight)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Insurance</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatCurrency(shipment.pricing?.insurance)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Invoice ID</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.invoiceId)}</Text>
        </View>
      </View>
      {shipment.notes ? <Text style={[styles.notes, { color: colors.textSecondary }]}>Notes: {shipment.notes}</Text> : null}
    </Card>
  );

  const customerContent = showCustomer ? (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Customer</Text>
      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.customerName)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.customerEmail)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Customer ID</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.customerId)}</Text>
        </View>
      </View>
    </Card>
  ) : null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'activity':
        return activityContent;
      case 'documents':
        return documentsContent;
      case 'photos':
        return photosContent;
      case 'billing':
        return billingContent;
      case 'customer':
        return customerContent;
      case 'overview':
      default:
        return overviewContent;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <>
        <ScrollView contentContainerStyle={styles.content}>
          <AppTopBar section="Shipment Details" detail={shipment.trackingNumber} showBack />

          <Card style={styles.heroCard} accentBorder elevation="elevated">
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={[styles.heroEyebrow, { color: colors.accent }]}>Shipment Workspace</Text>
                <Text style={[styles.vin, { color: colors.textPrimary }]}>{shipment.vehicle.vin || shipment.trackingNumber}</Text>
                <Text style={[styles.vehicle, { color: colors.textSecondary }]}> 
                  {formatValue(vehicleLabel)}
                </Text>
                <Text style={[styles.routeText, { color: colors.textSecondary }]}> 
                  {formatValue(routeOrigin)} {'->'} {formatValue(routeDestination)}
                </Text>
                {showCustomer && shipment.customerName ? (
                  <Text style={[styles.customer, { color: colors.textSecondary }]}>Customer: {shipment.customerName}</Text>
                ) : null}
              </View>
              <StatusBadge status={shipment.status} type="shipment" />
            </View>

          </Card>

          {canAssignToTransit ? (
            <Card style={styles.assignCard} accentBorder>
              <View style={styles.assignRow}>
                <View style={styles.assignCopy}>
                  <Text style={[styles.assignEyebrow, { color: colors.accent }]}>Released Shipment</Text>
                  <Text style={[styles.assignText, { color: colors.textSecondary }]}>
                    This shipment is released and ready for its inland road leg. Assign it to an open transit to keep it moving.
                  </Text>
                </View>
                <Button title="Assign to Transit" size="sm" onPress={() => setAssignToTransitVisible(true)} />
              </View>
            </Card>
          ) : null}

          <DetailTabs tabs={tabs} activeTab={activeTab} onChange={(key) => setActiveTab(key as ShipmentDetailTabKey)} />

          {renderTabContent()}
        </ScrollView>

        <Modal visible={selectedPhotoIndex !== null} transparent animationType="fade" onRequestClose={() => setSelectedPhotoIndex(null)}>
          <View style={[styles.viewerOverlay, { backgroundColor: 'rgba(10, 14, 20, 0.94)' }]}>
            {selectedPhoto ? (
              <>
                <View style={[styles.viewerTopBar, { backgroundColor: colors.panel, borderColor: colors.border }]}>
                  <View style={styles.viewerTopBarCopy}>
                    <Text style={[styles.viewerTitle, { color: colors.textPrimary }]}>Photo Viewer</Text>
                    <Text style={[styles.viewerMeta, { color: colors.textSecondary }]}>Tap Open / Download to access the original file outside the viewer.</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setSelectedPhotoIndex(null)}
                    style={[styles.viewerCloseButtonInline, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
                  >
                    <AppIcon name="close" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.viewerHeader}>
                  <Text style={[styles.viewerCounter, { color: colors.accentContrast || colors.textPrimary }]}>
                    {selectedPhotoIndex! + 1} / {shipment.photos.length}
                  </Text>
                </View>
                <Image source={{ uri: selectedPhoto.url }} style={styles.viewerImage} resizeMode="contain" />
                <View style={styles.viewerFooter}>
                  <Text style={[styles.viewerCaption, { color: '#FFFFFF' }]}>
                    {selectedPhoto.caption || format(new Date(selectedPhoto.uploadedAt), 'MMM d, yyyy')}
                  </Text>
                  <View style={styles.viewerUtilityRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => void openPhotoExternal(selectedPhoto.url)}
                      style={[styles.viewerUtilityAction, { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.2)' }]}
                    >
                      <Text style={styles.viewerUtilityActionText}>Open Image</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => void handleDownloadPhoto(selectedPhoto.url)}
                      style={[styles.viewerUtilityAction, { backgroundColor: 'rgba(212,175,55,0.2)', borderColor: 'rgba(212,175,55,0.4)' }]}
                    >
                      <Text style={styles.viewerUtilityActionText}>Download</Text>
                    </TouchableOpacity>
                  </View>
                  {shipment.photos.length > 1 ? (
                    <View style={styles.viewerActionRow}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={selectedPhotoIndex === 0}
                        onPress={() => setSelectedPhotoIndex((current) => (current === null ? current : Math.max(current - 1, 0)))}
                        style={StyleSheet.flatten([
                          styles.viewerAction,
                          {
                            backgroundColor: selectedPhotoIndex === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)',
                            borderColor: 'rgba(255,255,255,0.18)',
                          },
                        ])}
                      >
                        <Text style={styles.viewerActionText}>Previous</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={selectedPhotoIndex === shipment.photos.length - 1}
                        onPress={() => setSelectedPhotoIndex((current) => (current === null ? current : Math.min(current + 1, shipment.photos.length - 1)))}
                        style={StyleSheet.flatten([
                          styles.viewerAction,
                          {
                            backgroundColor: selectedPhotoIndex === shipment.photos.length - 1 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)',
                            borderColor: 'rgba(255,255,255,0.18)',
                          },
                        ])}
                      >
                        <Text style={styles.viewerActionText}>Next</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        </Modal>

        <AssignToTransitModal
          visible={assignToTransitVisible}
          shipmentId={shipment.id}
          shipmentLabel={vehicleLabel || shipment.trackingNumber}
          releaseToken={shipment.releaseToken || ''}
          onClose={() => setAssignToTransitVisible(false)}
          onAssigned={() => {
            setAssignToTransitVisible(false);
            void queryClient.invalidateQueries({ queryKey: ['shipment', shipment.id] });
          }}
        />
      </>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'], gap: Spacing.base },
  heroCard: {
    gap: Spacing.base,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1, marginRight: Spacing.sm },
  heroEyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  vin: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  vehicle: { fontSize: Typography.fontSize.base, marginBottom: Spacing.xs },
  routeText: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.xs },
  customer: { fontSize: Typography.fontSize.sm },
  summaryMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.base },
  metricChip: {
    minWidth: 92,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  metricValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionStack: {
    gap: Spacing.base,
  },
  sectionCard: {
    gap: Spacing.sm,
  },
  sectionEyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  sectionText: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing.base },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  detailCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  detailCardLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailCardValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: 20,
  },
  info: { gap: Spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.base },
  label: { fontSize: Typography.fontSize.sm, flex: 1 },
  value: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, flex: 1, textAlign: 'right' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photoCell: { width: '47%' },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  photoCaption: { fontSize: Typography.fontSize.xs, lineHeight: 18 },
  photoActionLink: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing.xs,
  },
  notes: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginTop: Spacing.base },
  assignCard: {
    gap: Spacing.sm,
  },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  assignCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  assignEyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  assignText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  viewerOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.base,
  },
  viewerTopBar: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  viewerTopBarCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  viewerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  viewerMeta: {
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
  },
  viewerCloseButtonInline: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    padding: Spacing.sm,
  },
  viewerHeader: {
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  viewerCounter: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.8,
  },
  viewerImage: {
    width: '100%',
    height: '62%',
  },
  viewerFooter: {
    marginTop: Spacing.base,
    gap: Spacing.base,
  },
  viewerCaption: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  viewerUtilityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  viewerUtilityAction: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  viewerUtilityActionText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  viewerActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  viewerAction: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  viewerActionText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});