import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useNotifications } from '../../hooks/useNotifications';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { ThemePreference, useThemePreference } from '../../contexts/ThemePreferenceContext';
import { AppIcon } from './AppIcon';

interface AppTopBarProps {
  section: string;
  detail?: string;
  showBack?: boolean;
  hideNotifications?: boolean;
  hideWorkspace?: boolean;
}

type QuickShortcut = {
  title: string;
  description: string;
  onPress: () => void;
};

const themeOptions: Array<{ label: string; value: ThemePreference }> = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export const AppTopBar: React.FC<AppTopBarProps> = ({
  section,
  detail,
  showBack = false,
  hideNotifications = false,
  hideWorkspace = false,
}) => {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const { user, isAdmin, isAuthenticated, logout } = useAuth();
  const { preference, setPreference } = useThemePreference();
  const [menuVisible, setMenuVisible] = useState(false);
  const notificationsQuery = useNotifications({ enabled: !hideNotifications && isAuthenticated });

  const unreadCount = (notificationsQuery.data?.data || []).filter((notification) => !notification.read).length;

  const openDashboard = () => {
    if (isAuthenticated) {
      navigation.navigate('Home', { screen: 'Dashboard' });
      return;
    }

    navigation.navigate('Login');
  };

  const openNotifications = () => {
    navigation.navigate('Notifications');
  };

  const openWorkspace = () => {
    navigation.navigate('Home', { screen: 'Workspace' });
  };

  const quickShortcuts = useMemo<QuickShortcut[]>(() => {
    if (!isAuthenticated) {
      return [
        {
          title: 'Email Sign In',
          description: 'Go to the standard sign in form.',
          onPress: () => navigation.navigate('Login'),
        },
        {
          title: 'Login Code',
          description: 'Use the 8-character access code flow.',
          onPress: () => navigation.navigate('LoginCode'),
        },
        {
          title: 'Reset Password',
          description: 'Open the password recovery flow.',
          onPress: () => navigation.navigate('ForgotPassword'),
        },
      ];
    }

    if (isAdmin) {
      return [
        {
          title: 'Search',
          description: 'Find shipments across the workspace.',
          onPress: () => navigation.navigate('Search'),
        },
        {
          title: 'Dashboard',
          description: 'Overview, KPIs, and operations health.',
          onPress: () => navigation.navigate('Home', { screen: 'Dashboard' }),
        },
        {
          title: 'Shipments',
          description: 'Review shipment records and activity.',
          onPress: () => navigation.navigate('Home', { screen: 'Shipments' }),
        },
        {
          title: 'Customers',
          description: 'Open customer accounts and details.',
          onPress: () => navigation.navigate('Home', { screen: 'Customers' }),
        },
        {
          title: 'Workspace',
          description: 'Jump to tools, settings, and alerts.',
          onPress: () => navigation.navigate('Home', { screen: 'Workspace' }),
        },
      ];
    }

    return [
      {
        title: 'Search',
        description: 'Find your shipments quickly.',
        onPress: () => navigation.navigate('Search'),
      },
      {
        title: 'Dashboard',
        description: 'Current shipments, alerts, and next steps.',
        onPress: () => navigation.navigate('Home', { screen: 'Dashboard' }),
      },
      {
        title: 'Shipments',
        description: 'Open the shipment list.',
        onPress: () => navigation.navigate('Home', { screen: 'Shipments' }),
      },
      {
        title: 'Tracking',
        description: 'Track shipments and containers.',
        onPress: () => navigation.navigate('Home', { screen: 'Tracking' }),
      },
      {
        title: 'Workspace',
        description: 'Open account tools and documents.',
        onPress: () => navigation.navigate('Home', { screen: 'Workspace' }),
      },
    ];
  }, [isAdmin, isAuthenticated, navigation]);

  const handleShortcutPress = (onPress: () => void) => {
    setMenuVisible(false);
    onPress();
  };

  const handleLogout = () => {
    setMenuVisible(false);
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.panel,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', `${colors.accent}2A`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerAccent}
        />
        <View style={styles.leading}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={showBack ? () => navigation.goBack() : openDashboard}
            style={[
              styles.brandButton,
              {
                backgroundColor: showBack ? colors.surfaceMuted : colors.accentSoft,
                borderColor: showBack ? colors.border : `${colors.accent}36`,
              },
            ]}
          >
            <AppIcon name={showBack ? 'back' : 'brand'} size={showBack ? 22 : 18} color={showBack ? colors.textPrimary : colors.accent} />
          </TouchableOpacity>

          <View style={styles.textWrap}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>JACXI SHIPPING</Text>
            <Text style={[styles.section, { color: colors.textPrimary }]} numberOfLines={1}>
              {section}
            </Text>
            {detail ? (
              <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={1}>
                {detail}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          {!hideNotifications && isAuthenticated ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={openNotifications}
              style={[styles.actionButton, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
            >
              <AppIcon name="notifications" size={20} color={colors.textPrimary} />
              {unreadCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.accent }]}> 
                  <Text style={[styles.badgeText, { color: colors.accentContrast }]}>
                    {unreadCount > 99 ? '99+' : String(unreadCount)}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}

          {!hideWorkspace && isAuthenticated ? (
            <TouchableOpacity activeOpacity={0.9} onPress={openWorkspace} style={styles.avatarButton}>
              <Avatar name={user?.name} imageUrl={user?.avatar} size={36} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setMenuVisible(true)}
            style={[styles.actionButton, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
          >
            <AppIcon name="menu" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={menuVisible} onClose={() => setMenuVisible(false)} title="Quick Menu">
        <ScrollView contentContainerStyle={styles.menuContent}>
          <View style={[styles.menuIdentity, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
            <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>
              {isAuthenticated ? user?.name || 'Jacxi user' : 'Jacxi mobile'}
            </Text>
            <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
              {isAuthenticated ? user?.email || 'Authenticated session' : 'Choose a sign in path or change the app theme.'}
            </Text>
          </View>

          <View style={styles.menuSection}>
            <Text style={[styles.menuSectionTitle, { color: colors.textPrimary }]}>Theme</Text>
            <View style={styles.themeRow}>
              {themeOptions.map((option) => {
                const selected = option.value === preference;
                return (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.85}
                    style={[
                      styles.themeChip,
                      {
                        backgroundColor: selected ? colors.accentSoft : colors.surfaceMuted,
                        borderColor: selected ? `${colors.accent}40` : colors.border,
                      },
                    ]}
                    onPress={() => void setPreference(option.value)}
                  >
                    <View style={styles.themeChipContent}>
                      <AppIcon name="theme" size={14} color={selected ? colors.accent : colors.textSecondary} />
                      <Text style={[styles.themeChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.menuSection}>
            <Text style={[styles.menuSectionTitle, { color: colors.textPrimary }]}>Shortcuts</Text>
            <View style={styles.shortcutList}>
              {quickShortcuts.map((shortcut) => (
                <TouchableOpacity
                  key={shortcut.title}
                  activeOpacity={0.88}
                  style={[styles.shortcutCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
                  onPress={() => handleShortcutPress(shortcut.onPress)}
                >
                  <Text style={[styles.shortcutTitle, { color: colors.textPrimary }]}>{shortcut.title}</Text>
                  <Text style={[styles.shortcutDescription, { color: colors.textSecondary }]}>{shortcut.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {isAuthenticated ? <Button title="Logout" variant="danger" onPress={handleLogout} fullWidth /> : null}
        </ScrollView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.base,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  headerAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  textWrap: {
    flex: 1,
  },
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1,
    marginBottom: 2,
  },
  section: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  detail: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
  },
  avatarButton: {
    borderRadius: BorderRadius.full,
  },
  menuContent: {
    gap: Spacing.base,
    paddingBottom: Spacing.lg,
  },
  menuIdentity: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  menuTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  menuSubtitle: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  menuSection: {
    gap: Spacing.sm,
  },
  menuSectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  themeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  themeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
  },
  themeChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  themeChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.3,
  },
  shortcutList: {
    gap: Spacing.sm,
  },
  shortcutCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  shortcutTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  shortcutDescription: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
});