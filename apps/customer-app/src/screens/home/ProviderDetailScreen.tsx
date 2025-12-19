import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';

import {providersApi} from '@api';
import {Button} from '@components';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@config/theme';
import type {HomeStackParamList} from '@navigation';
import type {ProviderService, Review} from '@types';

type RouteProps = RouteProp<HomeStackParamList, 'ProviderDetail'>;
type NavigationProps = NativeStackNavigationProp<HomeStackParamList, 'ProviderDetail'>;

export function ProviderDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const {providerId} = route.params;

  const {data: provider, isLoading} = useQuery({
    queryKey: ['provider', providerId],
    queryFn: async () => {
      const response = await providersApi.getProvider(providerId);
      return response.data.data;
    },
  });

  const {data: reviews} = useQuery({
    queryKey: ['providerReviews', providerId],
    queryFn: async () => {
      const response = await providersApi.getProviderReviews(providerId);
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Provider not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Icon name="person" size={48} color={colors.textLight} />
          </View>
          <Text style={styles.name}>{provider.displayName}</Text>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={18} color={colors.warning} />
            <Text style={styles.rating}>{provider.rating.toFixed(1)}</Text>
            <Text style={styles.reviews}>
              ({provider.totalReviews} reviews)
            </Text>
          </View>
          {provider.bio && <Text style={styles.bio}>{provider.bio}</Text>}
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          {provider.services?.map((ps: ProviderService) => (
            <View key={ps.id} style={styles.serviceCard}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{ps.service.name}</Text>
                <Text style={styles.serviceDesc}>{ps.service.description}</Text>
              </View>
              <View style={styles.servicePrices}>
                <Text style={styles.priceLabel}>
                  90 min: ₱{ps.price90 || ps.price60}
                </Text>
                {ps.price120 && (
                  <Text style={styles.priceLabel}>120 min: ₱{ps.price120}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          {reviews?.slice(0, 5).map((review: Review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>
                  {review.author.firstName}
                </Text>
                <View style={styles.reviewRating}>
                  <Icon name="star" size={14} color={colors.warning} />
                  <Text style={styles.reviewScore}>{review.rating}</Text>
                </View>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
            </View>
          ))}
          {(!reviews || reviews.length === 0) && (
            <Text style={styles.noReviews}>No reviews yet</Text>
          )}
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={styles.footer}>
        <Button
          title="Book Now"
          onPress={() => {
            navigation.navigate('BookingFlow', {providerId});
          }}
        />
      </View>
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
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  header: {
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    color: colors.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  rating: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  reviews: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  bio: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  serviceDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  servicePrices: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    ...typography.bodySmall,
    color: colors.text,
  },
  reviewCard: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reviewScore: {
    ...typography.bodySmall,
    color: colors.text,
  },
  reviewComment: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  noReviews: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
