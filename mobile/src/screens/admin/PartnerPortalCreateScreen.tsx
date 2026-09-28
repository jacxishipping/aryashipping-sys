import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { partnerPortalsApi } from '../../api/partnerPortals';
import { usersApi } from '../../api/users';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { AdminUserSummary } from '../../types/admin';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const PartnerPortalCreateScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<AdminUserSummary | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    companyLabel: '',
    customDomain: '',
    accentColor: '#0ea5e9',
    logoUrl: '',
    notes: '',
  });

  const ownersQuery = useQuery({
    queryKey: ['portal-owner-search', ownerSearch],
    queryFn: () => usersApi.getUsers({ query: ownerSearch || undefined, roleType: 'users' }, { pageSize: 10 }),
  });

  const ownerOptions = ownersQuery.data?.users || [];
  const selectedOwnerLabel = useMemo(() => {
    if (!selectedOwner) {
      return 'No owner selected';
    }

    return selectedOwner.name ? `${selectedOwner.name} (${selectedOwner.email})` : selectedOwner.email;
  }, [selectedOwner]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert('Missing portal name', 'Portal name is required.');
      return;
    }

    if (!selectedOwner) {
      Alert.alert('Missing owner', 'Select the portal owner before creating the portal.');
      return;
    }

    try {
      setSaving(true);
      const portal = await partnerPortalsApi.createPortal({
        name: form.name.trim(),
        ownerUserId: selectedOwner.id,
        code: form.code.trim() || undefined,
        companyLabel: form.companyLabel.trim() || undefined,
        customDomain: form.customDomain.trim() || undefined,
        accentColor: form.accentColor.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });

      navigation.replace('PartnerPortalDetail', { id: portal.id });
    } catch (error: any) {
      Alert.alert('Unable to create portal', error?.message || 'The partner portal could not be created.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Create Partner Portal" detail="Partner workspace setup and ownership" showBack />

        <Text style={[styles.title, { color: colors.textPrimary }]}>Create Partner Portal</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Create a partner workspace from mobile using the same portal creation route used on web.</Text>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Portal Details</Text>
          <Input label="Portal Name" value={form.name} onChangeText={(value) => updateField('name', value)} placeholder="Gulf Partner Workspace" />
          <Input label="Portal Code" value={form.code} onChangeText={(value) => updateField('code', value)} placeholder="Optional short code" autoCapitalize="none" />
          <Input label="Company Label" value={form.companyLabel} onChangeText={(value) => updateField('companyLabel', value)} placeholder="Brand label shown to partner users" />
          <Input label="Notes" value={form.notes} onChangeText={(value) => updateField('notes', value)} placeholder="Optional portal notes" multiline />
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Branding</Text>
          <Input label="Custom Domain" value={form.customDomain} onChangeText={(value) => updateField('customDomain', value)} placeholder="portal.partner.com" autoCapitalize="none" />
          <Input label="Accent Color" value={form.accentColor} onChangeText={(value) => updateField('accentColor', value)} placeholder="#0ea5e9" autoCapitalize="none" />
          <Input label="Logo URL" value={form.logoUrl} onChangeText={(value) => updateField('logoUrl', value)} placeholder="https://example.com/logo.png" autoCapitalize="none" />
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Owner</Text>
          <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Selected owner: {selectedOwnerLabel}</Text>
          <Input label="Search Users" value={ownerSearch} onChangeText={setOwnerSearch} placeholder="Search by name or email" autoCapitalize="none" />
          <View style={styles.optionList}>
            {ownerOptions.map((owner) => {
              const selected = owner.id === selectedOwner?.id;
              return (
                <TouchableOpacity
                  key={owner.id}
                  activeOpacity={0.85}
                  style={StyleSheet.flatten([
                    styles.optionCard,
                    {
                      backgroundColor: selected ? `${colors.accent}18` : colors.background,
                      borderColor: selected ? `${colors.accent}35` : colors.border,
                    },
                  ])}
                  onPress={() => setSelectedOwner(owner)}
                >
                  <Text style={[styles.optionTitle, { color: selected ? colors.accent : colors.textPrimary }]}>{owner.name || 'Unnamed User'}</Text>
                  <Text style={[styles.optionMeta, { color: colors.textSecondary }]}>{owner.email}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Button title="Create Partner Portal" onPress={handleSubmit} loading={saving} fullWidth />
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
  sectionCaption: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  optionList: {
    gap: Spacing.sm,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  optionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  optionMeta: {
    fontSize: Typography.fontSize.sm,
  },
});

export default PartnerPortalCreateScreen;