import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { transitsApi } from '../../api/transits';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';

interface AssignToTransitModalProps {
  visible: boolean;
  shipmentId: string;
  shipmentLabel: string;
  releaseToken: string;
  onClose: () => void;
  onAssigned: () => void;
}

const titleCase = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

export const AssignToTransitModal: React.FC<AssignToTransitModalProps> = ({
  visible,
  shipmentId,
  shipmentLabel,
  releaseToken,
  onClose,
  onAssigned,
}) => {
  const { colors } = useAppTheme();
  const [selectedTransitId, setSelectedTransitId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const transitsQuery = useQuery({
    queryKey: ['transits', 'open'],
    queryFn: () => transitsApi.getTransits(),
    enabled: visible,
    staleTime: 0,
  });

  const openTransits = useMemo(
    () => (transitsQuery.data?.transits || []).filter((transit) => transit.status !== 'DELIVERED' && transit.status !== 'CANCELLED'),
    [transitsQuery.data],
  );

  const handleClose = () => {
    if (assigning) {
      return;
    }

    setSelectedTransitId(null);
    onClose();
  };

  const handleAssign = async () => {
    if (!selectedTransitId) {
      Alert.alert('Select a transit', 'Choose an open transit to assign this shipment to.');
      return;
    }

    const transit = openTransits.find((item) => item.id === selectedTransitId);

    try {
      setAssigning(true);
      await transitsApi.assignShipment(selectedTransitId, shipmentId, releaseToken);
      onAssigned();
      onClose();
      Alert.alert('Shipment assigned', `Added to transit ${transit?.referenceNumber || selectedTransitId}.`);
    } catch (error: any) {
      Alert.alert('Unable to assign shipment', error?.message || 'The shipment could not be assigned to the transit.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={handleClose}
      title="Assign to Transit"
      subtitle="Choose an open transit for this released shipment. The release token is filled in automatically."
      showCloseButton={!assigning}
    >
      <View style={styles.container}>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
          {transitsQuery.isLoading ? (
            <View style={styles.statusWrap}>
              <ActivityIndicator color={colors.accent} />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>Loading open transits…</Text>
            </View>
          ) : transitsQuery.error ? (
            <View style={styles.statusWrap}>
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>Could not load transits.</Text>
              <TouchableOpacity activeOpacity={0.85} onPress={() => void transitsQuery.refetch()}>
                <Text style={[styles.retryLink, { color: colors.accent }]}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          ) : openTransits.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No open transits are available. Create a transit first, then assign this shipment.
            </Text>
          ) : (
            openTransits.map((transit, index) => {
              const selected = transit.id === selectedTransitId;

              return (
                <TouchableOpacity
                  key={transit.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedTransitId(transit.id)}
                  style={StyleSheet.flatten([
                    styles.transitRow,
                    index === openTransits.length - 1 ? styles.transitRowLast : null,
                    {
                      backgroundColor: selected ? `${colors.accent}18` : colors.surfaceMuted,
                      borderColor: selected ? `${colors.accent}35` : colors.border,
                    },
                  ])}
                >
                  <View style={styles.transitCopy}>
                    <Text style={[styles.transitTitle, { color: colors.textPrimary }]}>{transit.referenceNumber}</Text>
                    <Text style={[styles.transitMeta, { color: colors.textSecondary }]}>
                      {transit.origin} to {transit.destination} • {titleCase(transit.status)}
                    </Text>
                    <Text style={[styles.transitMeta, { color: colors.textSecondary }]}>
                      {transit._count.shipments} shipment(s) on board
                    </Text>
                  </View>
                  <View style={[styles.radioOuter, { borderColor: selected ? colors.accent : colors.border }]}>
                    {selected ? <View style={[styles.radioInner, { backgroundColor: colors.accent }]} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <View style={[styles.tokenBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          <Text style={[styles.tokenLabel, { color: colors.textSecondary }]}>Release token (auto-filled)</Text>
          <Text style={[styles.tokenValue, { color: colors.textPrimary }]} numberOfLines={1}>
            {releaseToken}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button title="Cancel" variant="secondary" onPress={handleClose} disabled={assigning} fullWidth />
          <Button title="Assign to Transit" onPress={handleAssign} loading={assigning} fullWidth />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  list: {
    flexGrow: 0,
    maxHeight: 360,
  },
  listContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  transitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
  },
  transitRowLast: {
    marginBottom: 0,
  },
  transitCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  transitTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  transitMeta: {
    fontSize: Typography.fontSize.xs,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusWrap: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
  },
  retryLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    paddingVertical: Spacing.sm,
  },
  tokenBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  tokenLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  tokenValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  actions: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
