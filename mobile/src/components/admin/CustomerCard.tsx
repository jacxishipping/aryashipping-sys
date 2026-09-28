import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Customer } from '../../types/user';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';

interface CustomerCardProps {
  customer: Customer;
  onPress: () => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onPress }) => {
  const { colors } = useAppTheme();

  return (
    <Card pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Avatar name={customer.name} size={48} />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{customer.name}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{customer.email}</Text>
        </View>
      </View>
      <View style={styles.stats}>
        <View style={[styles.stat, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Shipments</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {customer.totalShipments}
          </Text>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Balance</Text>
          <Text style={[styles.statValue, { color: customer.balance > 0 ? colors.error : colors.success }]}>
            ${Math.abs(customer.balance).toLocaleString()}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
  },
  info: {
    marginLeft: Spacing.md,
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.fontSize.sm,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
  },
  statValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
});
