export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const BorderRadius = {
  sm: 4,
  base: 8,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export const IconSizes = {
  xs: 12,
  sm: 16,
  base: 20,
  md: 24,
  lg: 32,
  xl: 40,
  '2xl': 48,
} as const;

export const ContainerPadding = {
  horizontal: Spacing.base,
  vertical: Spacing.base,
} as const;
