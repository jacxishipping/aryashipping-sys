import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { TrackingTimeline } from '../../components/customer/TrackingTimeline';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { trackingApi } from '../../api/tracking';
import { Shipment } from '../../types/shipment';

const TrackingScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState('');
  
  const { control, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      setError('');
      const result = await trackingApi.trackByNumber(data.trackingNumber);
      setShipment(result);
    } catch (err: any) {
      setError(err.message || 'Failed to track shipment');
      setShipment(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Tracking" detail="Track vehicles, containers, and status updates" />

        <Card>
          <Controller
            control={control}
            name="trackingNumber"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Tracking Number / VIN"
                placeholder="Enter tracking number or VIN"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <Button title="Track" onPress={handleSubmit(onSubmit)} loading={loading} fullWidth />
        </Card>

        <Card style={styles.workspaceCard}>
          <Text style={[styles.workspaceTitle, { color: colors.textPrimary }]}>Container Workspace</Text>
          <Text style={[styles.workspaceDescription, { color: colors.textSecondary }]}>Open your container list to see vessel progress, capacity, and linked shipment counts without entering a tracking number each time.</Text>
          <View style={styles.workspaceActions}>
            <Button title="My Containers" onPress={() => navigation.navigate('Containers')} style={styles.workspaceButton} />
            <Button title="Documents" variant="secondary" onPress={() => navigation.navigate('Documents')} style={styles.workspaceButton} />
          </View>
        </Card>

        {error && (
          <Card style={styles.error}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </Card>
        )}

        {loading && <LoadingSpinner />}

        {shipment && (
          <Card style={styles.result}>
            <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
              {shipment.vehicle.vin}
            </Text>
            <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
              {shipment.vehicle.year} {shipment.vehicle.make} {shipment.vehicle.model}
            </Text>
            <TrackingTimeline tracking={shipment.tracking} currentStatus={shipment.status} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base },
  workspaceCard: { marginTop: Spacing.base },
  workspaceTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  workspaceDescription: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing.base },
  workspaceActions: { flexDirection: 'row', gap: Spacing.sm },
  workspaceButton: { flex: 1 },
  error: { marginTop: Spacing.base },
  errorText: { fontSize: Typography.fontSize.base, textAlign: 'center' },
  result: { marginTop: Spacing.base },
  resultTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  resultSubtitle: { fontSize: Typography.fontSize.base, marginBottom: Spacing.base },
});

export default TrackingScreen;
