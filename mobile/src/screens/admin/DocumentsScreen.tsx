import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { documentsApi } from '../../api/documents';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { ListPaginationFooter } from '../../components/shared/ListPaginationFooter';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DocumentUploadModal } from '../../components/shared/DocumentUploadModal';
import { useAuth } from '../../hooks/useAuth';
import { useShipments } from '../../hooks/useShipments';
import { useAppTheme } from '../../hooks/useAppTheme';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { MOBILE_LIST_PAGE_SIZE } from '../../constants/pagination';
import { Typography } from '../../constants/typography';
import { DocumentRecord } from '../../types/document';

const categoryOptions = [
  { label: 'All', value: 'all' },
  { label: 'Invoices', value: 'INVOICE' },
  { label: 'BOL', value: 'BILL_OF_LADING' },
  { label: 'Customs', value: 'CUSTOMS' },
  { label: 'Insurance', value: 'INSURANCE' },
  { label: 'Other', value: 'OTHER' },
] as const;

const formatFileSize = (bytes: number) => {
  if (bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const DocumentsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<(typeof categoryOptions)[number]['value']>('all');
  const [shipmentId, setShipmentId] = useState<string | null>(null);
  const [isUploadModalVisible, setUploadModalVisible] = useState(false);

  const shipmentsQuery = useShipments({}, { pageSize: 12 });
  const shipments = shipmentsQuery.data?.data || [];

  const documentsQuery = useInfiniteQuery({
    queryKey: ['documents', user?.role, search, category, shipmentId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      documentsApi.getDocuments({
        search: search || undefined,
        category: category === 'all' ? undefined : category,
        shipmentId: shipmentId || undefined,
        page: pageParam,
        limit: MOBILE_LIST_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.currentPage < lastPage.pagination.pages
        ? lastPage.pagination.currentPage + 1
        : undefined,
  });

  const documents = documentsQuery.data?.pages.flatMap((page) => page.documents) || [];
  const totalDocuments = documentsQuery.data?.pages[0]?.pagination.total || 0;
  const summary = useMemo(
    () => ({
      total: totalDocuments,
      publicCount: documents.filter((document) => document.isPublic).length,
      invoiceCount: documents.filter((document) => document.category === 'INVOICE').length,
    }),
    [documents, totalDocuments],
  );

  const loadMore = () => {
    if (documentsQuery.hasNextPage && !documentsQuery.isFetchingNextPage) {
      void documentsQuery.fetchNextPage();
    }
  };

  const renderDocumentCard = (document: DocumentRecord) => (
    <Card key={document.id} style={styles.documentCard}>
      <View style={styles.documentHeader}>
        <View style={styles.documentHeaderText}>
          <Text style={[styles.documentName, { color: colors.textPrimary }]}>{document.name}</Text>
          <Text style={[styles.documentMeta, { color: colors.textSecondary }]}>
            {titleCase(document.category)} • {formatFileSize(document.fileSize)} • {new Date(document.createdAt).toLocaleDateString()}
          </Text>
        </View>
        {document.isPublic ? (
          <View style={StyleSheet.flatten([styles.publicBadge, { backgroundColor: `${colors.info}12`, borderColor: `${colors.info}30` }])}>
            <Text style={[styles.publicBadgeText, { color: colors.info }]}>Public</Text>
          </View>
        ) : null}
      </View>
      {document.description ? (
        <Text style={[styles.documentDescription, { color: colors.textSecondary }]}>{document.description}</Text>
      ) : null}
      <View style={styles.contextRow}>
        <View style={[styles.contextChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
          <Text style={[styles.contextLabel, { color: colors.textSecondary }]}>Uploaded By</Text>
          <Text style={[styles.contextValue, { color: colors.textPrimary }]}>{document.user?.name || document.user?.email || document.uploadedBy}</Text>
        </View>
        <View style={[styles.contextChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
          <Text style={[styles.contextLabel, { color: colors.textSecondary }]}>Shipment</Text>
          <Text style={[styles.contextValue, { color: colors.textPrimary }]}>{document.shipment?.id ? document.shipment.id.slice(0, 8) : 'Unlinked'}</Text>
        </View>
      </View>
      <TouchableOpacity activeOpacity={0.85} onPress={() => void Linking.openURL(document.fileUrl)}>
        <Text style={[styles.openLink, { color: colors.accent }]}>Open / Download</Text>
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderDocumentCard(item)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <AppTopBar section="Documents" showBack />

            <Input value={search} onChangeText={setSearch} placeholder="Search documents by name or description" />

            {shipments.length > 0 ? (
              <View style={styles.shipmentSection}>
                <View style={styles.filterRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={StyleSheet.flatten([
                      styles.filterChip,
                      {
                        backgroundColor: shipmentId === null ? `${colors.info}18` : colors.panel,
                        borderColor: shipmentId === null ? `${colors.info}35` : colors.border,
                      },
                    ])}
                    onPress={() => setShipmentId(null)}
                  >
                    <Text style={[styles.filterChipText, { color: shipmentId === null ? colors.info : colors.textPrimary }]}>All Shipments</Text>
                  </TouchableOpacity>
                  {shipments.slice(0, 8).map((shipment) => {
                    const selected = shipment.id === shipmentId;
                    const label = [shipment.vehicle.make, shipment.vehicle.model].filter(Boolean).join(' ') || shipment.vehicle.vin || shipment.id.slice(0, 8);

                    return (
                      <TouchableOpacity
                        key={shipment.id}
                        activeOpacity={0.85}
                        style={StyleSheet.flatten([
                          styles.filterChip,
                          {
                            backgroundColor: selected ? `${colors.info}18` : colors.panel,
                            borderColor: selected ? `${colors.info}35` : colors.border,
                          },
                        ])}
                        onPress={() => setShipmentId(shipment.id)}
                      >
                        <Text style={[styles.filterChipText, { color: selected ? colors.info : colors.textPrimary }]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.filterRow}>
              {categoryOptions.map((option) => {
                const selected = option.value === category;

                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.85}
                    style={StyleSheet.flatten([
                      styles.filterChip,
                      {
                        backgroundColor: selected ? `${colors.accent}18` : colors.panel,
                        borderColor: selected ? `${colors.accent}35` : colors.border,
                      },
                    ])}
                    onPress={() => setCategory(option.value)}
                  >
                    <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.metricRow}>
              <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.total}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total</Text>
              </Card>
              <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.invoiceCount}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Invoices</Text>
              </Card>
              <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{summary.publicCount}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Public</Text>
              </Card>
            </View>

            {isAdmin ? (
              <Card style={styles.uploadCard}>
                <Text style={[styles.uploadTitle, { color: colors.textPrimary }]}>Upload Document</Text>
                <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Attach to the selected shipment if needed.</Text>
                <Button title="Upload Document" onPress={() => setUploadModalVisible(true)} />
              </Card>
            ) : null}

            <DocumentUploadModal
              visible={isUploadModalVisible}
              onClose={() => setUploadModalVisible(false)}
              shipmentId={shipmentId !== 'all' && shipmentId !== null ? shipmentId : undefined}
              onSuccess={documentsQuery.refetch}
            />
          </>
        }
        ListEmptyComponent={<EmptyState icon="documents" title="No Documents" />}
        ListFooterComponent={
          documents.length > 0 ? (
            <ListPaginationFooter
              loadedCount={documents.length}
              totalCount={totalDocuments}
              hasNextPage={documentsQuery.hasNextPage}
              isFetchingNextPage={documentsQuery.isFetchingNextPage}
              onLoadMore={loadMore}
            />
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={documentsQuery.refetch}
        refreshing={documentsQuery.isRefetching && !documentsQuery.isFetchingNextPage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  shipmentSection: { marginBottom: Spacing.base },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.base },
  filterChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  filterChipText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  uploadCard: { marginBottom: Spacing.base },
  uploadTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  uploadText: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.sm },
  uploadMeta: { fontSize: Typography.fontSize.xs, marginBottom: Spacing.sm },
  uploadActions: { flexDirection: 'row', gap: Spacing.sm },
  uploadButton: { flex: 1 },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  metricCard: { flex: 1, paddingVertical: Spacing.base, borderWidth: 1 },
  metricValue: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.semibold, textAlign: 'center' },
  metricLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  documentCard: { marginBottom: Spacing.sm },
  documentHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  documentHeaderText: { flex: 1 },
  documentName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  documentMeta: { fontSize: Typography.fontSize.xs },
  publicBadge: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, alignSelf: 'flex-start' },
  publicBadgeText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  documentDescription: { fontSize: Typography.fontSize.sm, marginTop: Spacing.sm, lineHeight: 20 },
  contextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  contextChip: { width: '48%', borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.sm },
  contextLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: Spacing.xs },
  contextValue: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  openLink: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.sm },
});
export default DocumentsScreen;
