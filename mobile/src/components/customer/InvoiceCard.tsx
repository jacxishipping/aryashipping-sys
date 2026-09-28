import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { StatusBadge } from '../shared/StatusBadge';
import { Invoice } from '../../types/invoice';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { format } from 'date-fns';

interface InvoiceCardProps {
  invoice: Invoice;
  onPress?: () => void;
  footer?: React.ReactNode;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, onPress, footer }) => {
  const { colors } = useAppTheme();

  return (
    <Card pressable={Boolean(onPress)} onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.invoiceNumber, { color: colors.textPrimary }]}>
            {invoice.invoiceNumber}
          </Text>
          {invoice.trackingNumber && (
            <Text style={[styles.tracking, { color: colors.textSecondary }]}>
              {invoice.trackingNumber}
            </Text>
          )}
        </View>
        <StatusBadge status={invoice.status} type="invoice" />
      </View>

      <View style={styles.amounts}>
        <View style={styles.amount}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.amountValue, { color: colors.textPrimary }]}>
            ${invoice.total.toLocaleString()}
          </Text>
        </View>
        {invoice.amountDue > 0 && (
          <View style={styles.amount}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Due</Text>
            <Text style={[styles.amountValue, { color: colors.error }]}>
              ${invoice.amountDue.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.dates}>
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          Issued: {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
        </Text>
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
        </Text>
      </View>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
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
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  tracking: {
    fontSize: Typography.fontSize.sm,
  },
  amounts: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  amount: {
    flex: 1,
  },
  amountLabel: {
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.xs,
  },
  amountValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  dates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footer: {
    marginTop: Spacing.md,
  },
  date: {
    fontSize: Typography.fontSize.xs,
  },
});
