import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { partnerPortalsApi } from '../../api/partnerPortals';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Input } from '../../components/ui/Input';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type RouteProps = RouteProp<AdminStackParamList, 'PartnerPortalEdit'>;

const toggleItems = [
  { key: 'notifyOnShipmentAssigned', label: 'Notify On Shipment Assigned' },
  { key: 'autoAssignToSingleCustomer', label: 'Auto-Assign To Single Customer' },
  { key: 'requireCustomerLinkForReady', label: 'Require Customer Link For Ready' },
] as const;

const PartnerPortalEditScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customDomain: '',
    companyLabel: '',
    accentColor: '',
    logoUrl: '',
    defaultShipmentNotes: '',
    notifyOnShipmentAssigned: false,
    autoAssignToSingleCustomer: false,
    requireCustomerLinkForReady: false,
  });

  const { data: portal, isLoading, error, refetch } = useQuery({
    queryKey: ['partner-portal-edit', route.params.id],
    queryFn: () => partnerPortalsApi.getPortal(route.params.id),
  });

  useEffect(() => {
    if (!portal) {
      return;
    }

    setForm({
      customDomain: portal.customDomain || '',
      companyLabel: portal.companyLabel || '',
      accentColor: portal.accentColor || '',
      logoUrl: portal.logoUrl || '',
      defaultShipmentNotes: portal.defaultShipmentNotes || '',
      notifyOnShipmentAssigned: portal.notifyOnShipmentAssigned,
      autoAssignToSingleCustomer: portal.autoAssignToSingleCustomer,
      requireCustomerLinkForReady: portal.requireCustomerLinkForReady,
    });
  }, [portal]);

  const updateField = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      await partnerPortalsApi.updatePortal(route.params.id, {
        customDomain: form.customDomain.trim() || undefined,
        companyLabel: form.companyLabel.trim() || undefined,
        accentColor: form.accentColor.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        defaultShipmentNotes: form.defaultShipmentNotes.trim() || undefined,
        notifyOnShipmentAssigned: form.notifyOnShipmentAssigned,
        autoAssignToSingleCustomer: form.autoAssignToSingleCustomer,
        requireCustomerLinkForReady: form.requireCustomerLinkForReady,
      });

      navigation.replace('PartnerPortalDetail', { id: route.params.id });
    } catch (updateError: any) {
      Alert.alert('Unable to update portal', updateError?.message || 'The partner portal could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!portal) return <ErrorState message="Partner portal not found" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Edit Partner Portal" detail={portal.name} showBack />

        <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Partner Portal</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Update portal branding and workflow settings through the same portal settings route used on web.</Text>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Branding</Text>
          <Input label="Company Label" value={form.companyLabel} onChangeText={(value) => updateField('companyLabel', value)} placeholder="Partner company label" />
          <Input label="Custom Domain" value={form.customDomain} onChangeText={(value) => updateField('customDomain', value)} placeholder="portal.partner.com" autoCapitalize="none" />
          <Input label="Accent Color" value={form.accentColor} onChangeText={(value) => updateField('accentColor', value)} placeholder="#0ea5e9" autoCapitalize="none" />
          <Input label="Logo URL" value={form.logoUrl} onChangeText={(value) => updateField('logoUrl', value)} placeholder="https://example.com/logo.png" autoCapitalize="none" />
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Workflow Defaults</Text>
          <Input label="Default Shipment Notes" value={form.defaultShipmentNotes} onChangeText={(value) => updateField('defaultShipmentNotes', value)} placeholder="Optional shipment note default" multiline />
          <View style={styles.toggleList}>
            {toggleItems.map((item) => {
              const selected = form[item.key];
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.85}
                  style={StyleSheet.flatten([
                    styles.toggleCard,
                    {
                      backgroundColor: selected ? `${colors.accent}18` : colors.background,
                      borderColor: selected ? `${colors.accent}35` : colors.border,
                    },
                  ])}
                  onPress={() => updateField(item.key, !selected)}
                >
                  <Text style={[styles.toggleTitle, { color: selected ? colors.accent : colors.textPrimary }]}>{item.label}</Text>
                  <Text style={[styles.toggleMeta, { color: colors.textSecondary }]}>{selected ? 'Enabled' : 'Disabled'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Button title="Save Portal Settings" onPress={handleSubmit} loading={saving} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  sectionCard: { marginBottom: Spacing.base },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  toggleList: {
    gap: Spacing.sm,
  },
  toggleCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  toggleTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  toggleMeta: {
    fontSize: Typography.fontSize.sm,
  },
});

export default PartnerPortalEditScreen;