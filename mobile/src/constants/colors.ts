export const Colors = {
  light: {
    accent: '#D4AF37',
    accentLight: '#E5C158',
    accentDark: '#B89230',
    accentContrast: '#111111',
    accentSoft: 'rgba(212, 175, 55, 0.14)',
    
    background: '#F9FAFB',
    panel: '#FFFFFF',
    surfaceMuted: '#F3F4F6',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    
    textPrimary: '#1C1C1E',
    textSecondary: '#5F6368',
    textTertiary: '#9CA3AF',
    
    success: '#10B981',
    successLight: '#D1FAE5',
    successDark: '#047857',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    warningDark: '#B45309',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    errorDark: '#B91C1C',
    info: '#3B82F6',
    infoLight: '#DBEAFE',
    infoDark: '#1D4ED8',
    shadow: 'rgba(28, 28, 30, 0.1)',
    
    overlay: 'rgba(0, 0, 0, 0.5)',
    shimmer: 'rgba(255, 255, 255, 0.8)',
  },
  dark: {
    accent: '#D4AF37',
    accentLight: '#E5C158',
    accentDark: '#B89230',
    accentContrast: '#111111',
    accentSoft: 'rgba(212, 175, 55, 0.18)',
    
    background: '#0A0A0A',
    panel: '#1A1A1A',
    surfaceMuted: '#141414',
    border: '#2A2A2A',
    borderLight: '#333333',
    
    textPrimary: '#E5E5E5',
    textSecondary: '#A0A0A0',
    textTertiary: '#737373',
    
    success: '#10B981',
    successLight: '#064E3B',
    successDark: '#34D399',
    warning: '#F59E0B',
    warningLight: '#78350F',
    warningDark: '#FCD34D',
    error: '#EF4444',
    errorLight: '#7F1D1D',
    errorDark: '#FCA5A5',
    info: '#3B82F6',
    infoLight: '#1E3A8A',
    infoDark: '#93C5FD',
    shadow: 'rgba(0, 0, 0, 0.28)',
    
    overlay: 'rgba(0, 0, 0, 0.7)',
    shimmer: 'rgba(255, 255, 255, 0.1)',
  },
};

export const ShipmentStatusColors = {
  ON_HAND: '#10B981',
  DISPATCHING: '#3B82F6',
  IN_TRANSIT: '#3B82F6',
  IN_TRANSIT_TO_DESTINATION: '#8B5CF6',
  AT_PORT: '#F59E0B',
  CUSTOMS_CLEARANCE: '#8B5CF6',
  RELEASED: '#10B981',
  DELIVERED: '#059669',
  CANCELLED: '#6B7280',
  PENDING: '#98989D',
} as const;

export const InvoiceStatusColors = {
  PAID: '#10B981',
  PENDING: '#F59E0B',
  SENT: '#3B82F6',
  OVERDUE: '#EF4444',
  CANCELLED: '#6B7280',
  DRAFT: '#98989D',
} as const;

export type ColorScheme = 'light' | 'dark';
