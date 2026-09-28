import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { EmptyState } from '../../components/shared/EmptyState';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ListPaginationFooter } from '../../components/shared/ListPaginationFooter';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { AdminUserSummary } from '../../types/admin';
import { MOBILE_LIST_PAGE_SIZE } from '../../constants/pagination';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\w/g, (match) => match.toUpperCase());

const UsersScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<NavigationProp>();

  const query = useInfiniteQuery({
    queryKey: ['admin-users'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => usersApi.getUsers({ roleType: 'users' }, { page: pageParam, pageSize: MOBILE_LIST_PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
  });

  if (query.isLoading) return <LoadingSpinner fullScreen />;
  if (query.error) return <ErrorState message={(query.error as any).message} onRetry={query.refetch} />;

  const users = query.data?.pages.flatMap((page) => page.users) || [];
  const firstPage = query.data?.pages[0];

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: AdminUserSummary }) => (
          <Card style={styles.card} pressable onPress={() => navigation.navigate('UserDetail', { id: item.id })}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name || 'Unnamed User'}</Text>
                <Text style={[styles.email, { color: colors.textSecondary }]}>{item.email}</Text>
              </View>
              <View style={StyleSheet.flatten([styles.rolePill, { backgroundColor: `${colors.accent}16`, borderColor: `${colors.accent}32` }])}>
                <Text style={[styles.rolePillText, { color: colors.accent }]}>{titleCase(item.role)}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={[styles.metaChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Shipments</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{item._count?.shipments ?? 0}</Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Created</Text>
                <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown'}</Text>
              </View>
            </View>
          </Card>
        )}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <AppTopBar section="Users" showBack />
            <SectionHeader
              title="Users"
              meta={[
                { label: 'Total', value: String(firstPage?.total || 0) },
                { label: 'Admins', value: String(firstPage?.admins || 0) },
                { label: 'Other', value: String(firstPage?.regularUsers || 0) },
              ]}
              action={
                <Button title="Create User" onPress={() => navigation.navigate('UserCreate')} />
              }
            />
          </View>
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="users" title="No Users" />}
        ListFooterComponent={
          users.length > 0 ? (
            <ListPaginationFooter
              loadedCount={users.length}
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
  list: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  headerWrap: { marginBottom: Spacing.base },
  card: { marginBottom: Spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardInfo: { flex: 1 },
  name: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.fontSize.sm,
  },
  rolePill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  rolePillText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metaChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
  },
  metaLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  metaValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default UsersScreen;