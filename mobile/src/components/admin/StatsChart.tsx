import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { useAppTheme } from '../../hooks/useAppTheme';

interface StatsChartProps {
  title: string;
  data: { label: string; value: number; color: string }[];
}

export const StatsChart: React.FC<StatsChartProps> = ({ title, data }) => {
  const { colors } = useAppTheme();

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <View style={styles.chart}>
        {data.map((item, index) => (
          <View key={index} style={[styles.item, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <View style={styles.itemHeader}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>{item.label}</Text>
              <Text style={[styles.value, { color: colors.textPrimary }]}>{item.value}</Text>
            </View>
            <View style={[styles.barContainer, { backgroundColor: colors.borderLight }]}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: item.color,
                    width: `${total > 0 ? (item.value / total) * 100 : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.4,
    marginBottom: Spacing.base,
  },
  chart: {
    gap: Spacing.sm,
  },
  item: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  barContainer: {
    height: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
});
