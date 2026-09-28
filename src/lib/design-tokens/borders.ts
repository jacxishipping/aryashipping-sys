/**
 * Design System - Border Tokens
 * 
 * Border widths, radius, and styles.
 */

export const borders = {
  // Border widths
  width: {
    none: '0',
    thin: '1px',
    medium: '2px',
    thick: '4px',
  },

  // Border radius
  radius: {
    none: '0',
    sm: '0.25rem',    // 4px
    md: '0.5rem',     // 8px  (2 in MUI = 16px, we use 0.5rem = 8px)
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px (MUI 2)
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
    full: '9999px',   // Pill shape
  },

  // Border styles
  style: {
    solid: 'solid',
    dashed: 'dashed',
    dotted: 'dotted',
    none: 'none',
  },
} as const;

// MUI border radius (MUI uses multiplier, 1 = 8px)
// Our components use borderRadius: 2 which = 16px in MUI
export const muiBorderRadius = {
  0: 0,      // No radius
  0.5: 0.5,  // 4px
  1: 1,      // 8px
  1.5: 1.5,  // 12px
  2: 2,      // 16px (our standard)
  2.5: 2.5,  // 20px
  3: 3,      // 24px
  4: 4,      // 32px
} as const;

// Semantic border styles
export const semanticBorders = {
  // Standard border
  default: `1px solid var(--border)`,
  
  // Subtle border (lighter)
  subtle: `1px solid rgba(var(--border-rgb), 0.5)`,
  
  // Strong border (darker)
  strong: `2px solid var(--border)`,
  
  // Interactive states
  hover: `1px solid var(--accent-gold)`,
  focus: `2px solid var(--accent-gold)`,
  error: `1px solid var(--error)`,
  success: `1px solid var(--success)`,
  warning: `1px solid var(--warning)`,
  info: `1px solid var(--info)`,

  // Dividers
  divider: `1px solid rgba(var(--border-rgb), 0.7)`,
} as const;

// Type exports
export type BorderWidth = keyof typeof borders.width;
export type BorderRadius = keyof typeof borders.radius;
export type BorderStyle = keyof typeof borders.style;
export type SemanticBorder = keyof typeof semanticBorders;
