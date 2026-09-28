import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';

const impactStyleMap: Record<ImpactStyle, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
  rigid: Haptics.ImpactFeedbackStyle.Rigid,
  soft: Haptics.ImpactFeedbackStyle.Soft,
};

export async function triggerImpact(style: ImpactStyle) {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.impactAsync(impactStyleMap[style]);
  } catch {
    // Ignore unsupported haptic environments.
  }
}