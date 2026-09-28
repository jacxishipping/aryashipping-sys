import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { customersApi } from '../../api/customers';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const CustomerCreateScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  });

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
      const customer = await customersApi.createCustomer({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        address: {
          street: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          country: form.country.trim() || undefined,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      navigation.replace('CustomerDetail', { id: customer.id });
    } catch (error: any) {
      Alert.alert('Unable to create customer', error?.message || 'The customer could not be created.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Create Customer" detail="Customer onboarding" showBack />

        <Text style={[styles.title, { color: colors.textPrimary }]}>Create Customer</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Add a customer account from mobile using the same backend registration flow used by admin tools.</Text>

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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Security</Text>
          <Input label="Password" value={form.password} onChangeText={(value) => updateField('password', value)} placeholder="Minimum 6 characters" secureTextEntry />
          <Input label="Confirm Password" value={form.confirmPassword} onChangeText={(value) => updateField('confirmPassword', value)} placeholder="Re-enter password" secureTextEntry />
        </Card>

        <Button title="Create Customer" onPress={handleSubmit} loading={saving} fullWidth />
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
});

export default CustomerCreateScreen;