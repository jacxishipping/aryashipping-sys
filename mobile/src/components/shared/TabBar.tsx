import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, getTabIconName } from './AppIcon';
import { triggerImpact } from '../../utils/haptics';

export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={[styles.container, { backgroundColor: colors.panel, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <LinearGradient
        colors={['transparent', `${colors.accent}45`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topAccent}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            void triggerImpact('light');
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tab}
          >
            <View
              style={[
                styles.tabContent,
                isFocused && [
                  styles.tabContentActive,
                  { backgroundColor: colors.accentSoft, borderColor: `${colors.accent}60` },
                ],
              ]}
            >
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: isFocused ? colors.accent : colors.surfaceMuted,
                    borderColor: isFocused ? `${colors.accentDark}75` : colors.border,
                  },
                ]}
              > 
                <AppIcon
                  name={getTabIconName(route.name)}
                  size={18}
                  color={isFocused ? colors.accentContrast : colors.textSecondary}
                />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.label, { color: isFocused ? colors.accent : colors.textSecondary }, state.routes.length > 4 && styles.labelCondensed]}
              >
                {typeof label === 'string' ? label : ''}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  container: {
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BorderRadius['3xl'],
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 6,
  },
  topAccent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 48,
    width: '100%',
  },
  tabContentActive: {
    borderRadius: BorderRadius.xl,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    borderWidth: 1,
  },
  labelCondensed: {
    fontSize: 10,
    letterSpacing: 0,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.2,
  },
});
