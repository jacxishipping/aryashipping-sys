/**
 * Design System - Typography Tokens
 * 
 * Fixed typography scale with line-heights and letter-spacing.
 * No more ranges - each size has a specific purpose.
 */

export const typography = {
  // Font Families
  fontFamily: {
    sans: ['var(--font-inter)', 'var(--font-urbanist)', 'system-ui', '-apple-system', 'sans-serif'],
    inter: ['var(--font-inter)', 'sans-serif'],
    urbanist: ['var(--font-urbanist)', 'sans-serif'],
    mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  },

  // Font Sizes with Line Heights
  // Format: [fontSize, { lineHeight, letterSpacing? }]
  fontSize: {
    // Small text
    xs: ['0.75rem', { lineHeight: '1rem' }],          // 12px - Labels, captions
    sm: ['0.875rem', { lineHeight: '1.25rem' }],      // 14px - Small body text, helper text
    
    // Body text
    base: ['1rem', { lineHeight: '1.5rem' }],         // 16px - Default body text
    
    // Large text
    lg: ['1.125rem', { lineHeight: '1.75rem' }],      // 18px - Large body text
    xl: ['1.25rem', { lineHeight: '1.75rem' }],       // 20px - Large text, subheadings
    
    // Headings
    '2xl': ['1.5rem', { lineHeight: '2rem' }],        // 24px - h4, card titles
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],   // 30px - h3, section titles
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],     // 36px - h2, page titles
    '5xl': ['3rem', { lineHeight: '1.2' }],           // 48px - h1, hero titles
    '6xl': ['3.75rem', { lineHeight: '1' }],          // 60px - Display titles
  },

  // Font Weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.15em',   // For uppercase labels
  },

  // Line Heights (standalone)
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
} as const;

// Typography Presets
// These are complete typography styles for common use cases
export const typographyPresets = {
  // Page Titles
  pageTitle: {
    fontSize: '2.25rem',        // 36px
    lineHeight: '2.5rem',
    fontWeight: 600,
    letterSpacing: '-0.025em',
  },

  // Section Titles
  sectionTitle: {
    fontSize: '1.5rem',         // 24px
    lineHeight: '2rem',
    fontWeight: 600,
    letterSpacing: 'normal',
  },

  // Card Titles
  cardTitle: {
    fontSize: '0.95rem',        // ~15px
    lineHeight: '1.25rem',
    fontWeight: 600,
    letterSpacing: 'normal',
  },

  // Body Text
  body: {
    fontSize: '0.95rem',        // ~15px
    lineHeight: '1.5rem',
    fontWeight: 400,
    letterSpacing: 'normal',
  },

  // Small Text
  small: {
    fontSize: '0.875rem',       // 14px
    lineHeight: '1.25rem',
    fontWeight: 400,
    letterSpacing: 'normal',
  },

  // Labels (uppercase)
  label: {
    fontSize: '0.75rem',        // 12px
    lineHeight: '1rem',
    fontWeight: 600,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
  },

  // Caption
  caption: {
    fontSize: '0.75rem',        // 12px
    lineHeight: '1rem',
    fontWeight: 400,
    letterSpacing: 'normal',
  },

  // Stats/Metrics (large numbers)
  stat: {
    fontSize: '1.5rem',         // 24px
    lineHeight: '2rem',
    fontWeight: 700,
    letterSpacing: '-0.025em',
  },

  // Button Text
  button: {
    fontSize: '0.875rem',       // 14px
    lineHeight: '1.25rem',
    fontWeight: 600,
    letterSpacing: 'normal',
  },
} as const;

// Responsive Typography Utilities
// Helper for responsive font sizes in MUI sx prop
export const responsiveTypography = {
  pageTitle: {
    fontSize: { xs: '1.5rem', sm: '1.875rem', md: '2.25rem' },
    lineHeight: { xs: '2rem', sm: '2.25rem', md: '2.5rem' },
    fontWeight: 600,
  },

  sectionTitle: {
    fontSize: { xs: '1.125rem', sm: '1.25rem', md: '1.5rem' },
    lineHeight: { xs: '1.75rem', sm: '1.75rem', md: '2rem' },
    fontWeight: 600,
  },

  body: {
    fontSize: { xs: '0.875rem', sm: '0.9rem', md: '0.95rem' },
    lineHeight: { xs: '1.25rem', sm: '1.4rem', md: '1.5rem' },
  },

  small: {
    fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.85rem' },
    lineHeight: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
  },
} as const;

// Type exports
export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type LetterSpacing = keyof typeof typography.letterSpacing;
export type TypographyPreset = keyof typeof typographyPresets;
