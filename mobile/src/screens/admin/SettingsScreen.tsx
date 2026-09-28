import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { WorkspaceHub } from '../../components/shared/WorkspaceHub';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  if (!user) return null;

  const openTab = (screen: 'Dashboard' | 'Shipments' | 'Customers' | 'Workspace') => {
    navigation.navigate('Home', { screen });
  };

  const openStack = (
    screen:
      | 'Search'
      | 'Containers'
      | 'Dispatches'
      | 'Invoices'
      | 'Finance'
      | 'FinanceReports'
      | 'AgingReport'
      | 'Banking'
      | 'CompanyLedgers'
      | 'Documents'
      | 'Analytics'
      | 'Users'
      | 'PartnerPortals'
      | 'Transits'
        | 'SystemTools'
      | 'Notifications'
      | 'Settings'
  ) => {
    navigation.navigate(screen);
  };

  return (
    <WorkspaceHub
      title="Admin Workspace"
      subtitle="A mobile shell organized like the web dashboard, with operations, finance, and admin tools grouped in one place."
      roleLabel={user.role}
      name={user.name}
      email={user.email}
      sections={[
        {
          title: 'Main',
          caption: 'Core dashboard surfaces used every day.',
          items: [
            { title: 'Search', description: 'Find shipments across the workspace with smart query matching.', icon: 'search', onPress: () => openStack('Search') },
            { title: 'Dashboard', description: 'Overview, KPIs, and recent activity.', icon: 'dashboard', onPress: () => openTab('Dashboard') },
            { title: 'Shipments', description: 'Review and manage shipment records.', icon: 'shipments', onPress: () => openTab('Shipments') },
            { title: 'Customers', description: 'Access customer accounts and details.', icon: 'customers', onPress: () => openTab('Customers') },
          ],
        },
        {
          title: 'Operations',
          caption: 'Workflow and logistics tools grouped together.',
          items: [
            { title: 'Containers', description: 'Container assignments and detail views.', icon: 'containers', onPress: () => openStack('Containers') },
            { title: 'Dispatches', description: 'Dispatch workflow and routing status.', icon: 'dispatches', onPress: () => openStack('Dispatches') },
            { title: 'Transits', description: 'Route legs, movement progress, and transit coordination.', icon: 'transits', onPress: () => openStack('Transits') },
            { title: 'Documents', description: 'Shipment and compliance documents.', icon: 'documents', onPress: () => openStack('Documents') },
          ],
        },
        {
          title: 'Finance',
          caption: 'Revenue, banking, and ledger tools in one cluster.',
          items: [
            { title: 'Finance', description: 'Financial overview and reporting entry point.', icon: 'finance', onPress: () => openStack('Finance') },
            { title: 'Reports', description: 'Summary, user-wise, and shipment-wise financial reporting.', icon: 'reports', onPress: () => openStack('FinanceReports') },
            { title: 'Aging', description: 'Overdue shipment balances grouped by age bucket.', icon: 'aging', onPress: () => openStack('AgingReport') },
            { title: 'Banking', description: 'Connected bank workflows and reconciliation entry point.', icon: 'banking', onPress: () => openStack('Banking') },
            { title: 'Company Ledgers', description: 'Company-level balances and ledger workflows.', icon: 'ledgers', onPress: () => openStack('CompanyLedgers') },
            { title: 'Invoices', description: 'Invoice management and payment status.', icon: 'invoices', onPress: () => openStack('Invoices') },
          ],
        },
        {
          title: 'Admin & Growth',
          caption: 'Internal operations, partner coordination, and oversight.',
          items: [
            { title: 'Users', description: 'Internal account administration and staff oversight.', icon: 'users', onPress: () => openStack('Users') },
            { title: 'Partner Portals', description: 'Partner workspace coordination and handoff management.', icon: 'partnerPortals', onPress: () => openStack('PartnerPortals') },
            { title: 'Analytics', description: 'Operational performance and trends.', icon: 'analytics', onPress: () => openStack('Analytics') },
            { title: 'Notifications', description: 'Messages and workflow alerts.', icon: 'notifications', onPress: () => openStack('Notifications') },
          ],
        },
        {
          title: 'System & Tooling',
          caption: 'Settings health, voice-agent readiness, and AI observability.',
          items: [
            { title: 'System Tools', description: 'Review settings, call-agent readiness, and recent AI logs.', icon: 'systemTools', onPress: () => openStack('SystemTools') },
            { title: 'Workspace Home', description: 'Return to the top-level admin workspace.', icon: 'home', onPress: () => openTab('Workspace') },
          ],
        },
      ]}
      footer={
        <View style={styles.footer}>
          <Button title="Logout" onPress={handleLogout} variant="danger" fullWidth style={styles.logoutButton} />
          <Text style={[styles.version, { color: colors.textTertiary }]}>Version 1.0.0</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingTop: Spacing.sm,
  },
  logoutButton: {
    marginTop: Spacing.sm,
  },
  version: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});

export default SettingsScreen;
