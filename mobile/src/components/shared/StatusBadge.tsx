import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShipmentStatus } from '../../types/shipment';
import { InvoiceStatus } from '../../types/invoice';
import { ShipmentStatusColors, InvoiceStatusColors } from '../../constants/colors';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';

interface StatusBadgeProps {
  status: ShipmentStatus | InvoiceStatus | string;
  type?: 'shipment' | 'invoice' | 'generic';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'generic' }) => {
  const { colors } = useAppTheme();

  const getStatusLabel = () => {
    return status.replace(/_/g, ' ');
  };

  const getStatusColor = (): string => {
    if (type === 'shipment' && status in ShipmentStatusColors) {
      return ShipmentStatusColors[status as ShipmentStatus];
    }
    if (type === 'invoice' && status in InvoiceStatusColors) {
      return InvoiceStatusColors[status as InvoiceStatus];
    }
    // Fallback for generic statuses
    const lower = status.toLowerCase();
    if (lower.includes('delivered') || lower.includes('paid') || lower.includes('on_hand') || lower.includes('released') || lower.includes('success')) {
      return colors.success;
    }
    if (lower.includes('transit') || lower.includes('dispatching') || lower.includes('info')) {
      return colors.info;
    }
    if (lower.includes('port') || lower.includes('pending') || lower.includes('warning') || lower.includes('customs')) {
      return colors.warning;
    }
    if (lower.includes('cancel') || lower.includes('error') || lower.includes('delayed') || lower.includes('overdue')) {
      return colors.error;
    }
    return colors.textSecondary;
  };

  const color = getStatusColor();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}18`,
          borderColor: `${color}45`,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.label,
          { color },
        ]}
      >
        {getStatusLabel()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
