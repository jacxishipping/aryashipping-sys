import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBadge } from '../shared/StatusBadge';
import { Shipment } from '../../types/shipment';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { format } from 'date-fns';
import { useAppTheme } from '../../hooks/useAppTheme';

interface ShipmentRowProps {
  shipment: Shipment;
  onPress: () => void;
}

export const ShipmentRow: React.FC<ShipmentRowProps> = ({ shipment, onPress }) => {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <View style={styles.left}>
        <Text style={[styles.vin, { color: colors.textPrimary }]}>{shipment.vehicle.vin}</Text>
        <Text style={[styles.customer, { color: colors.textSecondary }]}>
          {shipment.customerName}
        </Text>
      </View>
      <View style={styles.right}>
        <StatusBadge status={shipment.status} type="shipment" />
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {format(new Date(shipment.updatedAt), 'MMM d')}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  left: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
  },
  vin: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  customer: {
    fontSize: Typography.fontSize.sm,
  },
  date: {
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.xs,
  },
});
