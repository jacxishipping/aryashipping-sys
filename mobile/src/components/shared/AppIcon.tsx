import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type AppIconName =
  | 'brand'
  | 'back'
  | 'close'
  | 'forward'
  | 'search'
  | 'location'
  | 'login'
  | 'loginCode'
  | 'resetPassword'
  | 'add'
  | 'menu'
  | 'notifications'
  | 'theme'
  | 'settings'
  | 'workspace'
  | 'home'
  | 'dashboard'
  | 'shipments'
  | 'customers'
  | 'tracking'
  | 'containers'
  | 'dispatches'
  | 'transits'
  | 'documents'
  | 'finance'
  | 'reports'
  | 'aging'
  | 'port'
  | 'delivered'
  | 'banking'
  | 'ledgers'
  | 'invoices'
  | 'users'
  | 'partnerPortals'
  | 'analytics'
  | 'systemTools';

const iconMap: Record<AppIconName, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  brand: 'anchor',
  back: 'chevron-left',
  close: 'close',
  forward: 'chevron-right',
  search: 'magnify',
  location: 'map-marker-outline',
  login: 'shield-account-outline',
  loginCode: 'form-textbox-password',
  resetPassword: 'lock-reset',
  add: 'plus',
  menu: 'dots-grid',
  notifications: 'bell-outline',
  theme: 'theme-light-dark',
  settings: 'cog-outline',
  workspace: 'view-grid-outline',
  home: 'home-outline',
  dashboard: 'view-dashboard-outline',
  shipments: 'package-variant-closed',
  customers: 'account-group-outline',
  tracking: 'map-marker-path',
  containers: 'cube-outline',
  dispatches: 'truck-fast-outline',
  transits: 'map-marker-distance',
  documents: 'file-document-outline',
  finance: 'cash-multiple',
  reports: 'chart-line',
  aging: 'calendar-clock-outline',
  port: 'anchor',
  delivered: 'check-circle-outline',
  banking: 'bank-outline',
  ledgers: 'book-open-page-variant-outline',
  invoices: 'file-document-outline',
  users: 'account-cog-outline',
  partnerPortals: 'domain',
  analytics: 'chart-timeline-variant',
  systemTools: 'tools',
};

export function getTabIconName(routeName: string): AppIconName {
  switch (routeName) {
    case 'Dashboard':
      return 'dashboard';
    case 'Shipments':
      return 'shipments';
    case 'Customers':
      return 'customers';
    case 'Tracking':
      return 'tracking';
    case 'Invoices':
      return 'invoices';
    case 'Workspace':
      return 'workspace';
    default:
      return 'workspace';
  }
}

export function isAppIconName(value: string): value is AppIconName {
  return value in iconMap;
}

type AppIconProps = {
  name: AppIconName;
  size?: number;
  color: string;
};

export const AppIcon: React.FC<AppIconProps> = ({ name, size = 20, color }) => {
  return <MaterialCommunityIcons name={iconMap[name]} size={size} color={color} />;
};