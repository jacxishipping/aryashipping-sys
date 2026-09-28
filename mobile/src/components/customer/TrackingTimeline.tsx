import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShipmentTracking } from '../../types/shipment';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { format } from 'date-fns';
import { useAppTheme } from '../../hooks/useAppTheme';
import { AppIcon } from '../shared/AppIcon';

interface TrackingTimelineProps {
  tracking: ShipmentTracking[];
  currentStatus: string;
}

export const TrackingTimeline: React.FC<TrackingTimelineProps> = ({ tracking, currentStatus }) => {
  const { colors } = useAppTheme();

  const sortedTracking = [...tracking].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <View style={styles.container}>
      {sortedTracking.map((event, index) => {
        const isLast = index === sortedTracking.length - 1;
        const isCurrent = event.status === currentStatus;

        return (
          <View key={event.id} style={styles.event}>
            <View style={styles.timeline}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isCurrent ? colors.accent : colors.success,
                    borderColor: isCurrent ? colors.accent : colors.success,
                  },
                ]}
              />
              {!isLast && (
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              )}
            </View>
            <View style={styles.content}>
              <Text style={[styles.status, { color: colors.textPrimary }]}>
                {event.status.replace(/_/g, ' ')}
              </Text>
              {event.description && (
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {event.description}
                </Text>
              )}
              {event.location && (
                <View style={styles.locationRow}>
                  <AppIcon name="location" size={14} color={colors.textTertiary} />
                  <Text style={[styles.location, { color: colors.textTertiary }]}>{event.location}</Text>
                </View>
              )}
              <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.base,
  },
  event: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
  },
  timeline: {
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingBottom: Spacing.base,
  },
  status: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
    textTransform: 'capitalize',
  },
  description: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xs,
  },
  location: {
    fontSize: Typography.fontSize.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  timestamp: {
    fontSize: Typography.fontSize.xs,
  },
});
