import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { StatusBadge } from './StatusBadge';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Shipment } from '../../types/shipment';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { format } from 'date-fns';
import { AppIcon } from './AppIcon';

interface ShipmentCardProps {
  shipment: Shipment;
  onPress: () => void;
  showCustomer?: boolean;
}

export const ShipmentCard: React.FC<ShipmentCardProps> = ({
  shipment,
  onPress,
  showCustomer = false,
}) => {
  const { colors } = useAppTheme();
  const vehicleTitle = [shipment.vehicle.year, shipment.vehicle.make, shipment.vehicle.model].filter(Boolean).join(' ');

  return (
    <Card pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.textPrimary }]}> 
            {vehicleTitle || shipment.vehicle.vin}
          </Text>
          <View style={[styles.vinPill, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Text style={[styles.vinLabel, { color: colors.textSecondary }]}>VIN</Text>
            <Text style={[styles.vinValue, { color: colors.textPrimary }]}>{shipment.vehicle.vin}</Text>
          </View>
        </View>
        <StatusBadge status={shipment.status} type="shipment" />
      </View>

      {showCustomer && shipment.customerName && (
        <Text style={[styles.customer, { color: colors.textSecondary }]}>
          {shipment.customerName}
        </Text>
      )}

      <View style={[styles.route, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
        <View style={styles.location}>
          <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>From</Text>
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>
            {shipment.origin.city}, {shipment.origin.state}
          </Text>
        </View>
        <AppIcon name="forward" size={22} color={colors.accent} />
        <View style={styles.location}>
          <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>To</Text>
          <Text style={[styles.locationText, { color: colors.textPrimary }]} numberOfLines={1}>
            {shipment.destination.city}, {shipment.destination.country}
          </Text>
        </View>
      </View>

      <Text style={[styles.updated, { color: colors.textTertiary }]}>
        Updated {format(new Date(shipment.updatedAt), 'MMM d, yyyy')}
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  vinPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    gap: Spacing.xs,
  },
  vinLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  vinValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  customer: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    padding: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  location: {
    flex: 1,
  },
  locationLabel: {
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  locationText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  updated: {
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.xs,
  },
});
