import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useInfiniteQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';

import {providersApi} from '@api';
import {useLocationStore} from '@store';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@config/theme';
import type {HomeStackParamList} from '@navigation';
import type {Provider} from '@types';

type NavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'ProviderList'
>;
type RouteProps = RouteProp<HomeStackParamList, 'ProviderList'>;

export function ProviderListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const {latitude, longitude} = useLocationStore();
  const {serviceId} = route.params || {};

  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} =
    useInfiniteQuery({
      queryKey: ['providers', serviceId, latitude, longitude],
      queryFn: async ({pageParam = 1}) => {
        const response = await providersApi.getProviders({
          serviceId,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          page: pageParam,
          limit: 20,
        });
        return response.data;
      },
      getNextPageParam: lastPage => {
        const {page, totalPages} = lastPage.pagination;
        return page < totalPages ? page + 1 : undefined;
      },
      initialPageParam: 1,
    });

  const providers = data?.pages.flatMap(page => page.data) || [];

  const renderProvider = ({item}: {item: Provider}) => {
    return (
      <TouchableOpacity
        style={styles.providerCard}
        onPress={() =>
          navigation.navigate('ProviderDetail', {providerId: item.id})
        }>
        {item.photoUrl ? (
          <Image
            source={{uri: item.photoUrl}}
            style={styles.providerAvatarImage}
          />
        ) : (
          <View style={styles.providerAvatar}>
            <Icon name="person" size={32} color={colors.textLight} />
          </View>
        )}
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{item.displayName}</Text>
          <View style={styles.providerMeta}>
            <Icon name="star" size={14} color={colors.warning} />
            <Text style={styles.providerRating}>{item.rating.toFixed(1)}</Text>
            <Text style={styles.providerReviews}>
              ({item.totalReviews} reviews)
            </Text>
          </View>
          <Text style={styles.providerBookings}>
            {item.completedBookings} completed bookings
          </Text>
        </View>
        <Icon name="chevron-forward" size={20} color={colors.textLight} />
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!isFetchingNextPage) {
      return null;
    }
    return (
      <ActivityIndicator
        style={styles.footer}
        size="small"
        color={colors.primary}
      />
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={providers}
        renderItem={renderProvider}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="search-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No providers found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: spacing.lg,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  providerAvatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
  },
  providerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  providerName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  providerRating: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
  },
  providerReviews: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  providerBookings: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
