/**
 * Design System - Shadow Tokens
 * 
 * Consistent elevation system using shadows.
 * Follows Material Design elevation principles.
 */

export const shadows = {
  // No shadow
  none: 'none',

  // Subtle shadows (cards, panels at rest)
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',

  // Medium shadows (raised elements, dropdowns)
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // Large shadows (modals, overlays)
  '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',

  // Inner shadows
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

// Design System specific shadows using CSS variables
// Resting states stay calm per team rule 5; hover may lift slightly.
export const designSystemShadows = {
  // Cards & Panels
  card: 'var(--shadow-card)',
  cardHover: '0 4px 12px rgba(var(--text-primary-rgb), 0.10), 0 2px 6px rgba(var(--text-primary-rgb), 0.08)',
  
  // Panels (slightly stronger than cards)
  panel: 'var(--shadow-panel)',
  panelHover: '0 6px 16px rgba(var(--text-primary-rgb), 0.10), 0 2px 6px rgba(var(--text-primary-rgb), 0.08)',

  // Elevated elements
  elevated: '0 20px 40px rgba(var(--text-primary-rgb), 0.1)',
  elevatedHover: '0 28px 50px rgba(var(--text-primary-rgb), 0.15)',

  // Floating elements (FAB, tooltips)
  floating: '0 16px 48px rgba(var(--text-primary-rgb), 0.12)',
  floatingHover: '0 20px 56px rgba(var(--text-primary-rgb), 0.16)',

  // Dropdowns & Popovers
  dropdown: '0 12px 28px rgba(var(--text-primary-rgb), 0.12), 0 4px 8px rgba(var(--text-primary-rgb), 0.08)',

  // Modals & Dialogs
  modal: '0 24px 60px rgba(var(--text-primary-rgb), 0.15), 0 8px 16px rgba(var(--text-primary-rgb), 0.1)',

  // Sidebar
  sidebar: '4px 0 12px rgba(var(--text-primary-rgb), 0.08)',

  // Focus state
  focus: '0 0 0 3px rgba(var(--accent-gold-rgb), 0.2)',

  // Colored shadows for semantic actions
  primary: '0 8px 24px rgba(var(--accent-gold-rgb), 0.25)',
  success: '0 8px 24px rgba(16, 185, 129, 0.25)',
  warning: '0 8px 24px rgba(245, 158, 11, 0.25)',
  error: '0 8px 24px rgba(239, 68, 68, 0.25)',
  info: '0 8px 24px rgba(59, 130, 246, 0.25)',
} as const;

// Elevation scale (semantic naming)
export const elevation = {
  0: shadows.none,
  1: shadows.sm,
  2: shadows.md,
  3: shadows.lg,
  4: shadows.xl,
  5: shadows['2xl'],
  6: shadows['3xl'],
} as const;

// Type exports
export type Shadow = keyof typeof shadows;
export type DesignSystemShadow = keyof typeof designSystemShadows;
export type Elevation = keyof typeof elevation;
