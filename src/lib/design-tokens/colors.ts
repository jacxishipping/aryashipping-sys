/**
 * Design System - Color Tokens
 * 
 * Complete color system with semantic colors and proper scales.
 * All values are design decisions - DO NOT modify without design review.
 */

export const colors = {
  // Primary - Gold Accent
  // Used for: Primary actions, highlights, key CTAs
  primary: {
    50: '#FEF7E0',
    100: '#FCEEB3',
    200: '#FAE380',
    300: '#F7D84D',
    400: '#F5CF26',
    500: '#D4AF37',  // Main brand gold
    600: '#C19F2F',
    700: '#A78C27',
    800: '#8D7A1F',
    900: '#5F5215',
  },

  // Neutral - Grays
  // Used for: Text, backgrounds, borders, surfaces
  neutral: {
    50: '#F9FAFB',   // Light background
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#0A0A0A',  // Darkest
  },

  // Semantic Colors - Success
  // Used for: Completed shipments, successful actions, positive states
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',  // Main success green
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  // Semantic Colors - Warning
  // Used for: Delayed shipments, caution states, pending actions
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',  // Main warning amber
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Semantic Colors - Error
  // Used for: Failed shipments, errors, destructive actions
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',  // Main error red
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Semantic Colors - Info
  // Used for: Informational messages, in-transit status, neutral notifications
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',  // Main info blue
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Shipping Status Colors (Application-specific)
  // Prefer CSS vars --status-* in components so dark mode adapts.
  status: {
    onHand: '#10B981',      // Green
    inTransit: '#3B82F6',   // Blue
    atPort: '#F59E0B',      // Amber
    customs: 'var(--status-violet)',     // Violet token
    released: '#10B981',    // Green
    delivered: 'var(--status-emerald)',   // Dark green token
    cancelled: 'var(--status-slate)',   // Gray token
    delayed: '#EF4444',     // Red
  },

  // Payment Status Colors
  payment: {
    paid: '#10B981',        // Green
    pending: '#F59E0B',     // Amber
    overdue: '#EF4444',     // Red
    partial: '#3B82F6',     // Blue
    refunded: '#6B7280',    // Gray
  },
} as const;

// CSS Variable Mappings
// These map to the CSS variables in globals.css
export const cssVariables = {
  // Main colors
  'accent-gold': colors.primary[500],
  'background': colors.neutral[50],
  'panel': '#FFFFFF',  // Active panel color used across the live UI
  'border': colors.neutral[200],
  
  // Text
  'text-primary': colors.neutral[900],
  'text-secondary': colors.neutral[600],
  
  // Semantic
  'success': colors.success[500],
  'warning': colors.warning[500],
  'error': colors.error[500],
  'info': colors.info[500],
} as const;

// Helper function to convert hex to RGB
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `${r}, ${g}, ${b}`;
}

// RGB variants for alpha transparency
export const rgbVariables = Object.entries(cssVariables).reduce((acc, [key, value]) => {
  acc[`${key}-rgb`] = hexToRgb(value);
  return acc;
}, {} as Record<string, string>);

// Type exports for TypeScript autocomplete
export type ColorScale = keyof typeof colors;
export type ColorShade = keyof typeof colors.primary;
export type SemanticColor = 'success' | 'warning' | 'error' | 'info';
export type StatusColor = keyof typeof colors.status;
export type PaymentStatusColor = keyof typeof colors.payment;
