import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
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

type RouteProps = RouteProp<AdminStackParamList, 'UserEdit'>;

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Finance', value: 'finance' },
  { label: 'Operations', value: 'operations' },
  { label: 'Customer Service', value: 'customer_service' },
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

const UserEditScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [codeBusy, setCodeBusy] = useState(false);
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const [customLoginCode, setCustomLoginCode] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'admin',
    phone: '',
    address: '',
    city: '',
    country: '',
  });

  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-user-edit', route.params.id],
    queryFn: () => usersApi.getUser(route.params.id),
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      name: user.name || '',
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      country: user.country || '',
    });
    setLoginCode(user.loginCode || null);
  }, [user]);

  const roleLabel = useMemo(
    () => roleOptions.find((option) => option.value === form.role)?.label || 'Admin',
    [form.role],
  );

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const voiceAccessCode = useMemo(() => (loginCode ? toVoiceAccessCode(loginCode) : ''), [loginCode]);

  const syncLoginCode = async (nextCode?: string) => {
    try {
      setCodeBusy(true);
      const response = await usersApi.setLoginCode(route.params.id, nextCode);
      setLoginCode(response.loginCode);
      setCustomLoginCode(response.loginCode);
      void refetch();
      Alert.alert('Login code updated', 'The user can now sign in with the latest login code.');
    } catch (codeError: any) {
      Alert.alert('Unable to update login code', codeError?.message || 'The login code could not be updated.');
    } finally {
      setCodeBusy(false);
    }
  };

  const handleGenerateLoginCode = async () => {
    await syncLoginCode();
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
      'The user will no longer be able to sign in with a login code until a new one is issued.',
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
              void refetch();
              Alert.alert('Login code removed', 'The user no longer has an active login code.');
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
      await usersApi.updateUser(route.params.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
      });

      navigation.replace('UserDetail', { id: route.params.id });
    } catch (updateError: any) {
      Alert.alert('Unable to update user', updateError?.message || 'The user could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!user) return <ErrorState message="User not found" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Edit User" detail={user.email} showBack />

        <Text style={[styles.title, { color: colors.textPrimary }]}>Edit User</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Update internal account details from mobile using the same admin user mutation route used on web.</Text>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Basic Info</Text>
          <Input label="Full Name" value={form.name} onChangeText={(value) => updateField('name', value)} placeholder="Jane Doe" />
          <Input label="Email" value={form.email} onChangeText={(value) => updateField('email', value)} placeholder="jane@jacxi.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Phone" value={form.phone} onChangeText={(value) => updateField('phone', value)} placeholder="Optional phone number" keyboardType="phone-pad" />
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Role</Text>
          <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Selected role: {roleLabel}</Text>
          <View style={styles.roleGrid}>
            {roleOptions.map((option) => {
              const selected = option.value === form.role;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.85}
                  style={StyleSheet.flatten([
                    styles.roleChip,
                    {
                      backgroundColor: selected ? `${colors.accent}18` : colors.background,
                      borderColor: selected ? `${colors.accent}35` : colors.border,
                    },
                  ])}
                  onPress={() => updateField('role', option.value)}
                >
                  <Text style={[styles.roleChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contact Details</Text>
          <Input label="Address" value={form.address} onChangeText={(value) => updateField('address', value)} placeholder="Optional address" />
          <Input label="City" value={form.city} onChangeText={(value) => updateField('city', value)} placeholder="Optional city" />
          <Input label="Country" value={form.country} onChangeText={(value) => updateField('country', value)} placeholder="Optional country" />
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Login Code Management</Text>
          <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Issue, regenerate, or remove the 8-character login code used by simple login and phone support flows.</Text>

          {loginCode ? (
            <View style={styles.loginCodeBlock}>
              <View style={StyleSheet.flatten([styles.codeCard, { backgroundColor: colors.background, borderColor: `${colors.accent}35` }])}>
                <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Current Login Code</Text>
                <Text style={[styles.codeValue, { color: colors.textPrimary }]}>{formatLoginCode(loginCode)}</Text>
              </View>

              <View style={StyleSheet.flatten([styles.codeCard, { backgroundColor: colors.background, borderColor: colors.border }])}>
                <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>Voice Keypad Code</Text>
                <Text style={[styles.codeValue, { color: colors.textPrimary }]}>{formatLoginCode(voiceAccessCode)}</Text>
                <Text style={[styles.codeHelper, { color: colors.textSecondary }]}>Use this numeric keypad version when the call agent asks for phone-digit access.</Text>
              </View>
            </View>
          ) : (
            <View style={StyleSheet.flatten([styles.emptyCodeState, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Text style={[styles.emptyCodeTitle, { color: colors.textPrimary }]}>No login code issued</Text>
              <Text style={[styles.emptyCodeText, { color: colors.textSecondary }]}>Generate a code to enable the mobile login-code flow and phone support access for this user.</Text>
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
            <Button title={loginCode ? 'Regenerate Code' : 'Generate Code'} onPress={handleGenerateLoginCode} loading={codeBusy} style={styles.codeActionButton} />
            <Button title="Set Custom" variant="secondary" onPress={handleSetCustomCode} disabled={codeBusy} style={styles.codeActionButton} />
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
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  roleChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  roleChipText: {
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
    borderStyle: 'dashed',
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  emptyCodeTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  emptyCodeText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  codeActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  codeActionButton: {
    flex: 1,
  },
});

export default UserEditScreen;