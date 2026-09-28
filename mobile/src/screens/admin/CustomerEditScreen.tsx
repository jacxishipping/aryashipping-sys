import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import { usersApi } from '../../api/users';
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

type RouteProps = RouteProp<AdminStackParamList, 'CustomerEdit'>;

const collectionStatusOptions = [
  { label: 'Current', value: 'CURRENT' },
  { label: 'Follow Up', value: 'FOLLOW_UP' },
  { label: 'Promised', value: 'PROMISED_TO_PAY' },
  { label: 'Collections', value: 'IN_COLLECTIONS' },
  { label: 'Escalated', value: 'ESCALATED' },
  { label: 'On Hold', value: 'ON_HOLD' },
];

const keypadMap: Record<string, string> = {
  A: '2',
  B: '2',
  C: '2',
  D: '3',
  E: '3',
  F: '3',
  G: '4',
  H: '4',
  I: '4',
  J: '5',
  K: '5',
  L: '5',
  M: '6',
  N: '6',
  O: '6',
  P: '7',
  Q: '7',
  R: '7',
  S: '7',
  T: '8',
  U: '8',
  V: '8',
  W: '9',
  X: '9',
  Y: '9',
  Z: '9',
};

const formatLoginCode = (value: string) => value.replace(/(.{4})/, '$1 ').trim();

const toVoiceAccessCode = (value: string) =>
  value
    .toUpperCase()
    .split('')
    .map((character) => (/\d/.test(character) ? character : keypadMap[character] || ''))
    .join('');

const CustomerEditScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [codeBusy, setCodeBusy] = useState(false);
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const [customLoginCode, setCustomLoginCode] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    collectionStatus: 'CURRENT',
    promiseToPayDate: '',
    followUpDate: '',
    notes: '',
  });

  const { data: customer, isLoading, error, refetch } = useQuery({
    queryKey: ['customer-edit', route.params.id],
    queryFn: () => customersApi.getCustomer(route.params.id),
  });

  useEffect(() => {
    if (!customer) {
      return;
    }

    setForm({
      name: customer.name || '',
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address?.street || '',
      city: customer.address?.city || '',
      country: customer.address?.country || '',
      collectionStatus: customer.collectionStatus || 'CURRENT',
      promiseToPayDate: customer.promiseToPayDate ? customer.promiseToPayDate.slice(0, 10) : '',
      followUpDate: customer.followUpDate ? customer.followUpDate.slice(0, 10) : '',
      notes: customer.notes || '',
    });
    setLoginCode(customer.loginCode || null);
    setCustomLoginCode(customer.loginCode || '');
  }, [customer]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const voiceAccessCode = useMemo(() => (loginCode ? toVoiceAccessCode(loginCode) : ''), [loginCode]);

  const refreshCustomerQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['customers'] }),
      queryClient.invalidateQueries({ queryKey: ['customer', route.params.id] }),
      queryClient.invalidateQueries({ queryKey: ['customer-edit', route.params.id] }),
    ]);
  };

  const syncLoginCode = async (nextCode?: string) => {
    try {
      setCodeBusy(true);
      const response = await usersApi.setLoginCode(route.params.id, nextCode);
      setLoginCode(response.loginCode);
      setCustomLoginCode(response.loginCode);
      await refreshCustomerQueries();
      Alert.alert('Login code updated', 'The customer can now sign in with the latest login code.');
    } catch (codeError: any) {
      Alert.alert('Unable to update login code', codeError?.message || 'The login code could not be updated.');
    } finally {
      setCodeBusy(false);
    }
  };

  const handleSetCustomCode = async () => {
    const normalizedCode = customLoginCode.trim().toUpperCase();

    if (!/^[A-Z0-9]{8}$/.test(normalizedCode)) {
      Alert.alert('Invalid login code', 'Custom login codes must be exactly 8 letters or numbers.');
      return;
    }

    await syncLoginCode(normalizedCode);
  };

  const handleClearLoginCode = () => {
    Alert.alert(
      'Remove login code?',
      'The customer will no longer be able to use login-code sign in until a new code is issued.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setCodeBusy(true);
              await usersApi.clearLoginCode(route.params.id);
              setLoginCode(null);
              setCustomLoginCode('');
              await refreshCustomerQueries();
              Alert.alert('Login code removed', 'The customer no longer has an active login code.');
            } catch (codeError: any) {
              Alert.alert('Unable to remove login code', codeError?.message || 'The login code could not be removed.');
            } finally {
              setCodeBusy(false);
            }
          },
        },
      ],
    );
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert('Missing fields', 'Name and email are required.');
      return;
    }

    try {
      setSaving(true);
      await customersApi.updateCustomer(route.params.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        address: {
          street: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          country: form.country.trim() || undefined,
        },
        collectionStatus: form.collectionStatus,
        promiseToPayDate: form.promiseToPayDate.trim() || '',
        followUpDate: form.followUpDate.trim() || '',
        notes: form.notes,
      });

      await refreshCustomerQueries();
      navigation.replace('CustomerDetail', { id: route.params.id });
    } catch (updateError: any) {
      Alert.alert('Unable to update customer', updateError?.message || 'The customer could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!customer) return <ErrorState message="Customer not found" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Edit Customer" detail={customer.email} showBack />

        <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Customer</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Update customer profile, collection workflow, and login access from mobile.</Text>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Basic Info</Text>
          <Input label="Full Name" value={form.name} onChangeText={(value) => updateField('name', value)} placeholder="Jane Customer" />
          <Input label="Email" value={form.email} onChangeText={(value) => updateField('email', value)} placeholder="customer@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Phone" value={form.phone} onChangeText={(value) => updateField('phone', value)} placeholder="Optional phone number" keyboardType="phone-pad" />
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contact Details</Text>
          <Input label="Address" value={form.address} onChangeText={(value) => updateField('address', value)} placeholder="Street address" />
          <Input label="City" value={form.city} onChangeText={(value) => updateField('city', value)} placeholder="City" />
          <Input label="Country" value={form.country} onChangeText={(value) => updateField('country', value)} placeholder="Country" />
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Collections Workflow</Text>
          <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Current status: {collectionStatusOptions.find((option) => option.value === form.collectionStatus)?.label || 'Current'}</Text>
          <View style={styles.statusGrid}>
            {collectionStatusOptions.map((option) => {
              const selected = option.value === form.collectionStatus;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.85}
                  style={StyleSheet.flatten([
                    styles.statusChip,
                    {
                      backgroundColor: selected ? `${colors.accent}18` : colors.background,
                      borderColor: selected ? `${colors.accent}35` : colors.border,
                    },
                  ])}
                  onPress={() => updateField('collectionStatus', option.value)}
                >
                  <Text style={[styles.statusChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Input label="Promise To Pay" value={form.promiseToPayDate} onChangeText={(value) => updateField('promiseToPayDate', value)} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          <Input label="Follow Up Date" value={form.followUpDate} onChangeText={(value) => updateField('followUpDate', value)} placeholder="YYYY-MM-DD" autoCapitalize="none" />
          <Input label="Collection Notes" value={form.notes} onChangeText={(value) => updateField('notes', value)} placeholder="Notes for collections and customer communication" multiline numberOfLines={4} textAlignVertical="top" />
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Login Code Management</Text>
          <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Issue, regenerate, or remove the 8-character login code used by the customer mobile login flow.</Text>

          {loginCode ? (
            <View style={styles.loginCodeBlock}>
              <View style={StyleSheet.flatten([styles.codeCard, { backgroundColor: colors.background, borderColor: `${colors.accent}35` }])}>
                <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Current Login Code</Text>
                <Text style={[styles.codeValue, { color: colors.textPrimary }]}>{formatLoginCode(loginCode)}</Text>
              </View>

              <View style={StyleSheet.flatten([styles.codeCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
                <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Voice Keypad Code</Text>
                <Text style={[styles.codeValue, { color: colors.textPrimary }]}>{formatLoginCode(voiceAccessCode)}</Text>
                <Text style={[styles.codeHelper, { color: colors.textSecondary }]}>Use this numeric keypad version when access needs to be communicated by phone.</Text>
              </View>
            </View>
          ) : (
            <View style={StyleSheet.flatten([styles.emptyCodeState, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.emptyCodeTitle, { color: colors.textPrimary }]}>No login code issued</Text>
              <Text style={[styles.emptyCodeText, { color: colors.textSecondary }]}>Generate one to enable the customer login-code flow again.</Text>
            </View>
          )}

          <Input
            label="Custom Login Code"
            value={customLoginCode}
            onChangeText={(value) => setCustomLoginCode(value.toUpperCase())}
            placeholder="ABCDEFG1"
            autoCapitalize="characters"
            autoComplete="off"
            maxLength={8}
          />

          <View style={styles.codeActionRow}>
            <Button title={loginCode ? 'Regenerate Code' : 'Generate Code'} onPress={() => void syncLoginCode()} loading={codeBusy} style={styles.codeActionButton} />
            <Button title="Set Custom" variant="secondary" onPress={() => void handleSetCustomCode()} disabled={codeBusy} style={styles.codeActionButton} />
          </View>

          {loginCode ? (
            <Button title="Remove Login Code" variant="danger" onPress={handleClearLoginCode} disabled={codeBusy} fullWidth />
          ) : null}
        </Card>

        <Button title="Save Changes" onPress={handleSubmit} loading={saving} fullWidth />
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
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  statusChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  loginCodeBlock: {
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  codeCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  codeLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  codeValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  codeHelper: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  emptyCodeState: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  emptyCodeTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  emptyCodeText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  codeActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  codeActionButton: {
    flex: 1,
  },
});

export default CustomerEditScreen;