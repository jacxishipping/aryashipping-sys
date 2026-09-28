/**
 * Design System Tokens - Central Export
 * 
 * Import all design tokens from this single file:
 * import { colors, typography, spacing, shadows, animations } from '@/lib/design-tokens';
 * 
 * @version 2.0.0 - Phase 4 Enhancements
 */

// Export all token modules
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';
export * from './animations';
export * from './borders';
export * from './dark-mode';

// Re-export for convenience
export { colors, cssVariables, rgbVariables } from './colors';
export { typography, typographyPresets, responsiveTypography } from './typography';
export { spacing, semanticSpacing, muiSpacing } from './spacing';
export { shadows, designSystemShadows } from './shadows';
export { animations, motionVariants, muiFadeTiming, keyframes } from './animations';
export { borders, semanticBorders, muiBorderRadius } from './borders';
export { darkModeColors, generateDarkModeCss } from './dark-mode';

// Design token summary for documentation
export const designTokens = {
  colors: {
    description: 'Complete color system with semantic colors and proper scales',
    scales: ['primary', 'neutral', 'success', 'warning', 'error', 'info'],
    applicationSpecific: ['status', 'payment'],
  },
  
  typography: {
    description: 'Fixed typography scale with line-heights and letter-spacing',
    sizes: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'],
    weights: ['normal', 'medium', 'semibold', 'bold', 'extrabold'],
    presets: ['pageTitle', 'sectionTitle', 'cardTitle', 'body', 'small', 'label', 'caption', 'stat', 'button'],
  },
  
  spacing: {
    description: 'Consistent spacing scale based on 4px base unit',
    scale: 'from 0 (0px) to 96 (384px)',
    semantic: ['componentPadding', 'cardPadding', 'sectionSpacing', 'gap', 'gridGap', 'pagePadding'],
  },
  
  shadows: {
    description: 'Elevation system using shadows',
    levels: ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'],
    designSystem: ['card', 'panel', 'elevated', 'floating', 'dropdown', 'modal', 'sidebar'],
  },
  
  animations: {
    description: 'Animation durations, easing functions, and transitions',
    durations: ['instant', 'fast', 'normal', 'slow', 'slower', 'slowest'],
    easings: ['linear', 'ease', 'easeIn', 'easeOut', 'easeInOut', 'smooth', 'bounce', 'sharp'],
    motionVariants: ['fade', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'scale', 'scaleUp'],
  },
  
  borders: {
    description: 'Border widths, radius, and styles',
    widths: ['none', 'thin', 'medium', 'thick'],
    radius: ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'],
    styles: ['solid', 'dashed', 'dotted', 'none'],
  },
} as const;

// Version
export const DESIGN_SYSTEM_VERSION = '2.0.0'; // Phase 4 Enhancements

// Usage examples in comments for developers
/**
 * @example
 * // Colors
 * import { colors } from '@/lib/design-tokens';
 * const primaryColor = colors.primary[500];
 * 
 * @example
 * // Typography
 * import { typography, typographyPresets } from '@/lib/design-tokens';
 * sx={{ ...typographyPresets.pageTitle }}
 * 
 * @example
 * // Spacing
 * import { spacing, semanticSpacing } from '@/lib/design-tokens';
 * sx={{ padding: spacing[4], gap: semanticSpacing.gap.md }}
 * 
 * @example
 * // Shadows
 * import { designSystemShadows } from '@/lib/design-tokens';
 * sx={{ boxShadow: designSystemShadows.card }}
 * 
 * @example
 * // Animations
 * import { animations, motionVariants } from '@/lib/design-tokens';
 * <motion.div variants={motionVariants.fade} />
 */
