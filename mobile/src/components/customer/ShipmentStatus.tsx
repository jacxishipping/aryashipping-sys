import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBadge } from '../shared/StatusBadge';
import type { ShipmentStatus as ShipmentStatusValue } from '../../types/shipment';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { useAppTheme } from '../../hooks/useAppTheme';

interface ShipmentStatusProps {
  status: ShipmentStatusValue;
  estimatedDelivery?: string;
}

export const ShipmentStatus: React.FC<ShipmentStatusProps> = ({ status, estimatedDelivery }) => {
  const { colors } = useAppTheme();

  const getStatusMessage = () => {
    switch (status) {
      case 'ON_HAND':
        return 'Your vehicle has been received and is being prepared for shipment.';
      case 'DISPATCHING':
        return 'Your vehicle is being loaded onto transport.';
      case 'IN_TRANSIT':
        return 'Your vehicle is on its way to the port.';
      case 'AT_PORT':
        return 'Your vehicle has arrived at the port and is awaiting loading.';
      case 'IN_TRANSIT_TO_DESTINATION':
        return 'Your vehicle is on the ocean vessel en route to destination.';
      case 'CUSTOMS_CLEARANCE':
        return 'Your vehicle is going through customs clearance.';
      case 'RELEASED':
        return 'Your vehicle has been released from customs.';
      case 'DELIVERED':
        return 'Your vehicle has been delivered!';
      default:
        return 'Status update pending.';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.panel, borderColor: colors.border }]}>
      <StatusBadge status={status} type="shipment" />
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {getStatusMessage()}
      </Text>
      {estimatedDelivery && (
        <Text style={[styles.eta, { color: colors.textTertiary }]}>
          Estimated delivery: {estimatedDelivery}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.base,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  message: {
    fontSize: Typography.fontSize.base,
    marginTop: Spacing.md,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
  },
  eta: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.sm,
  },
});
