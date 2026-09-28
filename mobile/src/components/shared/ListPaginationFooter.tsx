import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface ListPaginationFooterProps {
  loadedCount: number;
  totalCount: number;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export const ListPaginationFooter: React.FC<ListPaginationFooterProps> = ({
  loadedCount,
  totalCount,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}) => {
  const { colors } = useAppTheme();

  if (totalCount <= 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        Showing {loadedCount} of {totalCount}
      </Text>

      {isFetchingNextPage ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading more</Text>
        </View>
      ) : hasNextPage && onLoadMore ? (
        <Button title="Load More" variant="secondary" size="sm" onPress={onLoadMore} />
      ) : (
        <Text style={[styles.doneText, { color: colors.textSecondary }]}>All items loaded</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  caption: {
    fontSize: Typography.fontSize.xs,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
  },
  doneText: {
    fontSize: Typography.fontSize.xs,
  },
});