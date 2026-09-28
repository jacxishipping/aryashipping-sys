import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../ui/Card';
import { AppTopBar } from './AppTopBar';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { AppIcon, AppIconName } from './AppIcon';

type ModuleAction = {
  title: string;
  description: string;
  icon: AppIconName;
  onPress?: () => void;
};

interface ModuleLandingProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  heroIcon: AppIconName;
  heroTitle: string;
  heroDescription: string;
  actions: ModuleAction[];
  footerTitle?: string;
  footerDescription?: string;
}

export const ModuleLanding: React.FC<ModuleLandingProps> = ({
  eyebrow,
  title,
  subtitle,
  heroIcon,
  heroTitle,
  heroDescription,
  actions,
  footerTitle = 'Phase 1 parity',
  footerDescription = 'This screen now gives mobile users the same module entry point and information architecture the web dashboard already exposes.',
}) => {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppTopBar section={title} detail={eyebrow} />

        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>

        <Card style={[styles.heroCard, { borderColor: `${colors.accent}35` }]}> 
          <LinearGradient
            colors={[`${colors.accent}2E`, `${colors.accent}10`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.heroGlow}
          />
          <View style={[styles.heroBadge, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}35` }]}> 
            <AppIcon name={heroIcon} size={28} color={colors.accent} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>{heroTitle}</Text>
          <Text style={[styles.heroDescription, { color: colors.textSecondary }]}>{heroDescription}</Text>
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Links</Text>
          <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Use these entry points to move across related admin workflows.</Text>
        </View>

        <View style={styles.grid}>
          {actions.map((action) => (
            <Card
              key={action.title}
              style={styles.actionCard}
              pressable={Boolean(action.onPress)}
              onPress={action.onPress}
            >
              <View style={[styles.actionBadge, { backgroundColor: `${colors.accent}14`, borderColor: `${colors.accent}30` }]}>
                <AppIcon name={action.icon} size={18} color={colors.accent} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>{action.title}</Text>
              <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>{action.description}</Text>
            </Card>
          ))}
        </View>

        <Card style={[styles.footerCard, { backgroundColor: colors.panel }]}>
          <Text style={[styles.footerTitle, { color: colors.textPrimary }]}>{footerTitle}</Text>
          <Text style={[styles.footerDescription, { color: colors.textSecondary }]}>{footerDescription}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  header: {
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  heroCard: {
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  heroGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 88,
  },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: Spacing.base,
  },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  heroDescription: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  sectionCaption: {
    fontSize: Typography.fontSize.sm,
  },
  grid: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  actionCard: {
    minHeight: 110,
    justifyContent: 'space-between',
  },
  actionBadge: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  actionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  actionDescription: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  footerCard: {
    borderStyle: 'dashed',
  },
  footerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  footerDescription: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
});