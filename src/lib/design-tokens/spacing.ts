/**
 * Design System - Spacing Tokens
 * 
 * Consistent spacing scale based on 4px base unit.
 * Use these instead of arbitrary values.
 */

export const spacing = {
  // Base unit: 4px
  0: '0',
  0.5: '0.125rem',  // 2px  - Micro spacing
  1: '0.25rem',     // 4px  - Minimal spacing
  1.5: '0.375rem',  // 6px  - Very small
  2: '0.5rem',      // 8px  - Small
  2.5: '0.625rem',  // 10px - Small-medium
  3: '0.75rem',     // 12px - Medium-small
  3.5: '0.875rem',  // 14px - Medium
  4: '1rem',        // 16px - Base spacing
  5: '1.25rem',     // 20px - Medium-large
  6: '1.5rem',      // 24px - Large
  7: '1.75rem',     // 28px - Large-extra
  8: '2rem',        // 32px - Extra large
  9: '2.25rem',     // 36px - XXL
  10: '2.5rem',     // 40px - XXL
  11: '2.75rem',    // 44px - XXXL
  12: '3rem',       // 48px - XXXL
  14: '3.5rem',     // 56px - Huge
  16: '4rem',       // 64px - Huge
  20: '5rem',       // 80px - Massive
  24: '6rem',       // 96px - Massive
  28: '7rem',       // 112px - Super massive
  32: '8rem',       // 128px - Ultra
  36: '9rem',       // 144px - Ultra
  40: '10rem',      // 160px - Ultra
  44: '11rem',      // 176px - Ultra
  48: '12rem',      // 192px - Ultra
  52: '13rem',      // 208px - Ultra
  56: '14rem',      // 224px - Ultra
  60: '15rem',      // 240px - Ultra
  64: '16rem',      // 256px - Ultra
  72: '18rem',      // 288px - Ultra
  80: '20rem',      // 320px - Ultra
  96: '24rem',      // 384px - Ultra
} as const;

// Semantic spacing for common use cases
export const semanticSpacing = {
  // Component Padding
  componentPadding: {
    sm: spacing[3],   // 12px - Compact components
    md: spacing[4],   // 16px - Default components
    lg: spacing[6],   // 24px - Spacious components
  },

  // Card Padding
  cardPadding: {
    sm: spacing[4],   // 16px - Compact cards
    md: spacing[6],   // 24px - Default cards
    lg: spacing[8],   // 32px - Spacious cards
  },

  // Section Spacing
  sectionSpacing: {
    sm: spacing[8],   // 32px - Compact sections
    md: spacing[12],  // 48px - Default sections
    lg: spacing[16],  // 64px - Spacious sections
  },

  // Gap between elements
  gap: {
    xs: spacing[1],   // 4px  - Micro gap
    sm: spacing[2],   // 8px  - Small gap
    md: spacing[3],   // 12px - Default gap
    lg: spacing[4],   // 16px - Large gap
    xl: spacing[6],   // 24px - Extra large gap
  },

  // Grid gaps
  gridGap: {
    xs: spacing[2],   // 8px
    sm: spacing[3],   // 12px
    md: spacing[4],   // 16px
    lg: spacing[6],   // 24px
  },

  // Page padding
  pagePadding: {
    mobile: spacing[4],    // 16px
    tablet: spacing[6],    // 24px
    desktop: spacing[8],   // 32px
  },
} as const;

// MUI spacing multiplier (1 = 8px in MUI)
// These map to MUI's spacing scale
export const muiSpacing = {
  0: 0,      // 0px
  0.5: 0.5,  // 4px
  1: 1,      // 8px
  1.5: 1.5,  // 12px
  2: 2,      // 16px
  2.5: 2.5,  // 20px
  3: 3,      // 24px
  3.5: 3.5,  // 28px
  4: 4,      // 32px
  5: 5,      // 40px
  6: 6,      // 48px
  7: 7,      // 56px
  8: 8,      // 64px
  10: 10,    // 80px
  12: 12,    // 96px
  16: 16,    // 128px
  20: 20,    // 160px
  24: 24,    // 192px
} as const;

// Type exports
export type Spacing = keyof typeof spacing;
export type MuiSpacing = keyof typeof muiSpacing;
export type SemanticSpacing = keyof typeof semanticSpacing;
