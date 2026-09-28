import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

export type DetailTabOption = {
  key: string;
  label: string;
};

interface DetailTabsProps {
  tabs: DetailTabOption[];
  activeTab: string;
  onChange: (key: string) => void;
}

export const DetailTabs: React.FC<DetailTabsProps> = ({ tabs, activeTab, onChange }) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.panel, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {tabs.map((tab) => {
          const selected = tab.key === activeTab;

          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.85}
              onPress={() => onChange(tab.key)}
              style={[
                styles.tab,
                {
                  backgroundColor: selected ? colors.accentSoft : colors.surfaceMuted,
                  borderColor: selected ? `${colors.accent}45` : colors.border,
                },
              ]}
            >
              <Text style={[styles.label, { color: selected ? colors.accent : colors.textPrimary }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export const DetailTabStrip = DetailTabs;

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: BorderRadius['2xl'],
    paddingVertical: Spacing.sm,
    marginTop: Spacing.base,
    marginBottom: Spacing.base,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  },
  row: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  tab: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.2,
  },
});