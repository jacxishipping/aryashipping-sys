/**
 * Design System - Dark Mode Tokens
 * 
 * Dark theme color palette for reduced eye strain in low-light environments.
 * Maintains proper contrast ratios and visual hierarchy.
 */

export const darkModeColors = {
  // Main colors
  'accent-gold': '#D4AF37',  // Keep same accent
  'accent-gold-rgb': '212, 175, 55',
  
  // Backgrounds & Surfaces
  'background': '#0A0A0A',
  'background-rgb': '10, 10, 10',
  'panel': '#1A1A1A',
  'panel-rgb': '26, 26, 26',
  
  // Borders
  'border': '#2A2A2A',
  'border-rgb': '42, 42, 42',
  
  // Text
  'text-primary': '#E5E5E5',
  'text-primary-rgb': '229, 229, 229',
  'text-secondary': '#A0A0A0',
  'text-secondary-rgb': '160, 160, 160',
  
  // Semantic Colors - Success
  'success': '#10B981',
  'success-rgb': '16, 185, 129',
  'success-light': '#064E3B',  // Darker version for dark mode
  'success-dark': '#D1FAE5',   // Lighter version for dark mode
  
  // Semantic Colors - Warning
  'warning': '#F59E0B',
  'warning-rgb': '245, 158, 11',
  'warning-light': '#78350F',
  'warning-dark': '#FEF3C7',
  
  // Semantic Colors - Error
  'error': '#EF4444',
  'error-rgb': '239, 68, 68',
  'error-light': '#7F1D1D',
  'error-dark': '#FEE2E2',
  
  // Semantic Colors - Info
  'info': '#3B82F6',
  'info-rgb': '59, 130, 246',
  'info-light': '#1E3A8A',
  'info-dark': '#DBEAFE',
} as const;

// Generate CSS custom properties for dark mode
export function generateDarkModeCss(): string {
  return Object.entries(darkModeColors)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join('\n');
}

// Type exports
export type DarkModeColor = keyof typeof darkModeColors;
