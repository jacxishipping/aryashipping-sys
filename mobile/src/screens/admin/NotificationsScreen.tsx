import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notifications';
import { useMarkNotificationAsRead } from '../../hooks/useNotifications';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { ListPaginationFooter } from '../../components/shared/ListPaginationFooter';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { MOBILE_LIST_PAGE_SIZE } from '../../constants/pagination';
import { format } from 'date-fns';
import { Notification } from '../../types/api';

const NotificationsScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const query = useInfiniteQuery({
    queryKey: ['notifications', 'admin'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => notificationsApi.getNotifications({ page: pageParam, pageSize: MOBILE_LIST_PAGE_SIZE }),
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.hasMore ? Number(lastPageParam) + 1 : undefined,
  });
  const markAsRead = useMarkNotificationAsRead();

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.read) {
      markAsRead.mutate(notification.id);
    }
  };

  if (query.isLoading) return <LoadingSpinner fullScreen />;
  if (query.error) return <ErrorState message={(query.error as any).message} onRetry={query.refetch} />;

  const notifications = query.data?.pages.flatMap((page) => page.data) || [];
  const firstPage = query.data?.pages[0];
  const unreadCount = firstPage?.unreadCount || 0;
  const errorCount = notifications.filter((notification) => notification.type === 'ERROR').length;

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleNotificationPress(item)}>
            <Card style={StyleSheet.flatten([styles.card, !item.read ? { borderLeftWidth: 3, borderLeftColor: colors.accent } : null])}>
              <View style={styles.header}>
                <Badge label={item.type} variant={item.type === 'ERROR' ? 'error' : 'info'} size="sm" />
                <Text style={[styles.date, { color: colors.textTertiary }]}>
                  {format(new Date(item.createdAt), 'MMM d, h:mm a')}
                </Text>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>{item.message}</Text>
            </Card>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <AppTopBar section="Notifications" showBack hideNotifications />
            <View style={styles.metricRow}>
              <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{firstPage?.total || 0}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total</Text>
              </Card>
              <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{unreadCount}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Unread</Text>
              </Card>
              <Card style={StyleSheet.flatten([styles.metricCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{errorCount}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Errors</Text>
              </Card>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="notifications" title="No Notifications" />}
        ListFooterComponent={
          notifications.length > 0 ? (
            <ListPaginationFooter
              loadedCount={notifications.length}
              totalCount={firstPage?.total || 0}
              hasNextPage={query.hasNextPage}
              isFetchingNextPage={query.isFetchingNextPage}
              onLoadMore={loadMore}
            />
          ) : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={query.refetch}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.base },
  headerBlock: { marginBottom: Spacing.sm },
  metricRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  metricCard: { flex: 1, paddingVertical: Spacing.base, borderWidth: 1 },
  metricValue: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, textAlign: 'center' },
  metricLabel: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { marginBottom: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  date: { fontSize: Typography.fontSize.xs },
  title: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.xs },
  message: { fontSize: Typography.fontSize.sm },
});

export default NotificationsScreen;
