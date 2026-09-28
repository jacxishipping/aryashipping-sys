import { Colors } from '../constants/colors';
import { useThemePreference } from '../contexts/ThemePreferenceContext';

export function useAppTheme() {
  const { colorScheme } = useThemePreference();

  return {
    colorScheme,
    colors: colorScheme === 'dark' ? Colors.dark : Colors.light,
    isDark: colorScheme === 'dark',
  };
}