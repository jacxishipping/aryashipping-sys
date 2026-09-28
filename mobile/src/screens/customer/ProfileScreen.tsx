import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { WorkspaceHub } from '../../components/shared/WorkspaceHub';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

const ProfileScreen: React.FC = () => {
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

  const openTab = (screen: 'Dashboard' | 'Shipments' | 'Tracking' | 'Invoices' | 'Workspace') => {
    navigation.navigate('Home', { screen });
  };

  const openNotifications = () => {
    navigation.navigate('Notifications');
  };

  const openStack = (screen: 'Search' | 'Documents' | 'Containers') => {
    navigation.navigate(screen);
  };

  return (
    <WorkspaceHub
      title="Customer Workspace"
      subtitle="A mobile shell organized like the customer portal, with shipment, finance, document, and container tools grouped together."
      roleLabel={user.role}
      name={user.name}
      email={user.email}
      loginCode={user.loginCode}
      sections={[
        {
          title: 'Main',
          caption: 'Your primary customer views.',
          items: [
            { title: 'Search', description: 'Quickly find your shipments using VIN, lot number, or vehicle details.', icon: 'search', onPress: () => openStack('Search') },
            { title: 'Dashboard', description: 'Current shipments, alerts, and next steps.', icon: 'dashboard', onPress: () => openTab('Dashboard') },
            { title: 'Shipments', description: 'Browse your active and completed shipments.', icon: 'shipments', onPress: () => openTab('Shipments') },
            { title: 'Tracking', description: 'Track containers and shipment progress.', icon: 'tracking', onPress: () => openTab('Tracking') },
            { title: 'Invoices', description: 'Review balances and payment status.', icon: 'invoices', onPress: () => openTab('Invoices') },
          ],
        },
        {
          title: 'Workspace Tools',
          caption: 'Supporting documents and container context for your shipments.',
          items: [
            { title: 'Documents', description: 'Open invoices, bills of lading, and uploaded paperwork.', icon: 'documents', onPress: () => openStack('Documents') },
            { title: 'Containers', description: 'See the containers currently carrying your shipments.', icon: 'containers', onPress: () => openStack('Containers') },
          ],
        },
        {
          title: 'Account',
          caption: 'Alerts and account access tools.',
          items: [
            { title: 'Notifications', description: 'Stay on top of shipment and billing updates.', icon: 'notifications', onPress: openNotifications },
            { title: 'Workspace Home', description: 'Return to this account overview at any time.', icon: 'home', onPress: () => openTab('Workspace') },
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

export default ProfileScreen;
