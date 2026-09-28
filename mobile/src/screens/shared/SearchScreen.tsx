import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { Card } from '../../components/ui/Card';
import { DateField } from '../../components/ui/DateField';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { ShipmentCard } from '../../components/shared/ShipmentCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useAppTheme } from '../../hooks/useAppTheme';
import { MobileShipmentSearchFilters, searchApi } from '../../api/search';
import { Shipment } from '../../types/shipment';

const SHIPMENT_STATUSES = [
  { value: 'ON_HAND', label: 'On Hand' },
  { value: 'DISPATCHING', label: 'Dispatching' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'IN_TRANSIT_TO_DESTINATION', label: 'Destination Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
];

const WORKFLOW_STAGES = [
  { value: 'DISPATCHING', label: 'Dispatching' },
  { value: 'SHIPPING', label: 'Shipping' },
  { value: 'TRANSIT_DELIVERY', label: 'Transit / Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
];

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MobileShipmentSearchFilters>({});
  const [results, setResults] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFiltersCount = useMemo(() => {
    return [
      filters.status,
      filters.workflowStage,
      filters.yardReceived,
      filters.dateFrom,
      filters.dateTo,
      filters.minPrice,
      filters.maxPrice,
    ].filter(Boolean).length;
  }, [filters]);

  const hasSearchInput = Boolean(query.trim()) || activeFiltersCount > 0;

  const performSearch = async (nextFilters: MobileShipmentSearchFilters) => {
    if (!nextFilters.query?.trim() && !nextFilters.status && !nextFilters.workflowStage && !nextFilters.yardReceived && !nextFilters.dateFrom && !nextFilters.dateTo && !nextFilters.minPrice && !nextFilters.maxPrice) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await searchApi.searchShipments(nextFilters, 20);
      setResults(response.shipments);
      setHasSearched(true);
    } catch (searchError: any) {
      setError(searchError?.message || 'Unable to search right now.');
      setResults([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void performSearch({
        ...filters,
        query: query.trim(),
      });
    }, 300);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [filters, query]);

  const retry = () => {
    void performSearch({
      ...filters,
      query: query.trim(),
    });
  };

  const updateFilter = (key: keyof MobileShipmentSearchFilters, value: MobileShipmentSearchFilters[keyof MobileShipmentSearchFilters]) => {
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setQuery('');
    setShowFilters(false);
  };

  const renderChip = (
    label: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={label}
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? `${colors.accent}1A` : colors.panel,
          borderColor: selected ? `${colors.accent}60` : colors.border,
        },
      ]}
    >
      <Text style={[styles.filterChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.content}>
        <AppTopBar section="Search" detail="Find shipments by VIN, vehicle, lot, auction, or container terms" showBack />

        <SectionHeader
          title="Smart Global Search"
          description="Search shipment records across the mobile workspace using the same backend search service and advanced filters as web."
          meta={[
            { label: 'Results', value: results.length },
            { label: 'Filters', value: activeFiltersCount, intent: activeFiltersCount > 0 ? 'warning' : 'default' },
          ]}
          action={
            <View style={styles.headerActions}>
              <Button title={showFilters ? 'Hide' : 'Filters'} size="sm" variant="secondary" onPress={() => setShowFilters((current) => !current)} />
              {hasSearchInput ? <Button title="Clear" size="sm" variant="ghost" onPress={clearFilters} /> : null}
            </View>
          }
        />

        <Input
          placeholder="Search by VIN, make, model, lot number, or container..."
          value={query}
          onChangeText={setQuery}
          containerStyle={styles.search}
        />

        {showFilters ? (
          <Card style={styles.filtersCard}>
            <Text style={[styles.filtersTitle, { color: colors.textPrimary }]}>Smart Filters</Text>
            <Text style={[styles.filtersCaption, { color: colors.textSecondary }]}>Narrow results by shipment status, workflow stage, yard receipt, date range, and price band.</Text>

            <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {renderChip('All', !filters.status, () => updateFilter('status', undefined))}
              {SHIPMENT_STATUSES.map((option) =>
                renderChip(option.label, filters.status === option.value, () => updateFilter('status', filters.status === option.value ? undefined : option.value))
              )}
            </ScrollView>

            <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Workflow Stage</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {renderChip('All', !filters.workflowStage, () => updateFilter('workflowStage', undefined))}
              {WORKFLOW_STAGES.map((option) =>
                renderChip(option.label, filters.workflowStage === option.value, () => updateFilter('workflowStage', filters.workflowStage === option.value ? undefined : option.value))
              )}
            </ScrollView>

            <Text style={[styles.filterGroupLabel, { color: colors.textSecondary }]}>Yard Received</Text>
            <View style={styles.filterRowWrap}>
              {renderChip('Any', !filters.yardReceived, () => updateFilter('yardReceived', undefined))}
              {renderChip('Received', filters.yardReceived === 'true', () => updateFilter('yardReceived', filters.yardReceived === 'true' ? undefined : 'true'))}
            </View>

            <View style={styles.dateGrid}>
              <DateField label="Date From" value={filters.dateFrom || ''} onChange={(value) => updateFilter('dateFrom', value)} containerStyle={styles.dateField} />
              <DateField label="Date To" value={filters.dateTo || ''} onChange={(value) => updateFilter('dateTo', value)} containerStyle={styles.dateField} />
            </View>

            <View style={styles.priceRow}>
              <Input
                label="Min Price"
                placeholder="0"
                value={filters.minPrice || ''}
                onChangeText={(value) => updateFilter('minPrice', value.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                containerStyle={styles.priceInput}
              />
              <Input
                label="Max Price"
                placeholder="10000"
                value={filters.maxPrice || ''}
                onChangeText={(value) => updateFilter('maxPrice', value.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                containerStyle={styles.priceInput}
              />
            </View>
          </Card>
        ) : null}

        {!hasSearchInput ? (
          <View style={[styles.helperCard, { backgroundColor: colors.panel, borderColor: colors.border }]}>
            <Text style={[styles.helperTitle, { color: colors.textPrimary }]}>Start typing to search</Text>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>Results are role-aware. Customers only see their own shipments, while admins can search across the workspace. Use filters to narrow by workflow stage, date, yard receipt, or price range.</Text>
          </View>
        ) : null}

        {loading ? <LoadingSpinner /> : null}

        {error ? <ErrorState message={error} onRetry={retry} /> : null}

        {!loading && !error ? (
          <FlatList
            data={results}
            renderItem={({ item }) => (
              <ShipmentCard shipment={item} onPress={() => navigation.navigate('ShipmentDetail', { id: item.id })} showCustomer />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              hasSearched ? (
                <EmptyState
                  icon="shipments"
                  title="No Matches Found"
                  description="Try a VIN, vehicle make/model, auction name, or container search term."
                />
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: Spacing.base },
  search: { marginBottom: Spacing.base },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  filtersCard: {
    marginBottom: Spacing.base,
  },
  filtersTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  filtersCaption: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.base,
  },
  filterGroupLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  filterRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.base,
    marginBottom: Spacing.base,
  },
  filterRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  filterChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  dateGrid: {
    marginBottom: Spacing.sm,
  },
  dateField: {
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priceInput: {
    flex: 1,
  },
  helperCard: {
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    borderRadius: 16,
    marginBottom: Spacing.base,
  },
  helperTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  helperText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  list: {
    paddingBottom: Spacing['2xl'],
  },
});

export default SearchScreen;