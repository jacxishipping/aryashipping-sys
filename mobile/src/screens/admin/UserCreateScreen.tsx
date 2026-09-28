import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { usersApi } from '../../api/users';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Finance', value: 'finance' },
  { label: 'Operations', value: 'operations' },
  { label: 'Customer Service', value: 'customer_service' },
];

const UserCreateScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    phone: '',
    address: '',
    city: '',
    country: '',
  });

  const roleLabel = useMemo(
    () => roleOptions.find((option) => option.value === form.role)?.label || 'Admin',
    [form.role],
  );

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert('Missing fields', 'Name, email, and password are required.');
      return;
    }

    if (form.password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert('Password mismatch', 'Password and confirmation do not match.');
      return;
    }

    try {
      setSaving(true);
      const user = await usersApi.createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
      });

      navigation.replace('UserDetail', { id: user.id });
    } catch (error: any) {
      Alert.alert('Unable to create user', error?.message || 'The user could not be created.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Create User" detail="Internal account onboarding" showBack />

        <Text style={[styles.title, { color: colors.textPrimary }]}>Create Internal User</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Add a new internal account from mobile using the same admin registration flow used on web.</Text>

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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Security</Text>
          <Input label="Password" value={form.password} onChangeText={(value) => updateField('password', value)} placeholder="Minimum 6 characters" secureTextEntry />
          <Input label="Confirm Password" value={form.confirmPassword} onChangeText={(value) => updateField('confirmPassword', value)} placeholder="Re-enter password" secureTextEntry />
        </Card>

        <Button title="Create User" onPress={handleSubmit} loading={saving} fullWidth />
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
});

export default UserCreateScreen;