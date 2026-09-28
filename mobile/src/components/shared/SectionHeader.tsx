/**
 * SectionHeader
 *
 * Mirrors the web PageHeader component:
 *   – Title + optional description
 *   – Optional meta stat chips (label / value pairs)
 *   – Optional action slot
 *   – Gold-accent top border strip (glass-gold effect)
 *
 * Usage:
 *   <SectionHeader
 *     title="Shipments"
 *     description="Search, create, and manage shipment records"
 *     meta={[{ label: 'Active', value: '12' }, { label: 'Pending', value: '3' }]}
 *     action={<Button title="+ New" onPress={…} size="sm" />}
 *   />
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';

type MetaStat = {
  label: string;
  value: string | number;
  /** Optional intent colour hint */
  intent?: 'default' | 'positive' | 'warning' | 'critical';
};

interface SectionHeaderProps {
  title: string;
  description?: string;
  meta?: MetaStat[];
  action?: React.ReactNode;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  meta,
  action,
  style,
}) => {
  const { colors } = useAppTheme();

  const getMetaValueColor = (intent?: MetaStat['intent']) => {
    switch (intent) {
      case 'positive': return colors.success;
      case 'warning':  return colors.warning;
      case 'critical': return colors.error;
      default:         return colors.textPrimary;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.panel,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      {/* Gold accent strip — mirrors web glass-gold top border */}
      <View style={[styles.accentStrip, { backgroundColor: colors.accent }]} />

      <View style={styles.body}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            {description ? (
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {description}
              </Text>
            ) : null}
          </View>
          {action ? <View style={styles.actionSlot}>{action}</View> : null}
        </View>

        {/* Meta stat chips */}
        {meta && meta.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.metaRow}
          >
            {meta.map((item) => (
              <View
                key={item.label}
                style={[
                  styles.metaChip,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.metaValue,
                    { color: getMetaValueColor(item.intent) },
                  ]}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius['2xl'],  // 24px – matches web rounded-2xl
    overflow: 'hidden',
    marginBottom: Spacing.base,
    // Shadow – matches web PageHeader box-shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  accentStrip: {
    height: 3,
    opacity: 0.7,
  },
  body: {
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titleWrap: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: 24,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
  },
  actionSlot: {
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  metaChip: {
    minWidth: 90,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  metaLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  metaValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});
