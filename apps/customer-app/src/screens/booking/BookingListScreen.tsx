import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';
import {format} from 'date-fns';

import {bookingsApi} from '@api';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@config/theme';
import type {BookingsStackParamList} from '@navigation';
import type {Booking} from '@types';

type NavigationProp = NativeStackNavigationProp<
  BookingsStackParamList,
  'BookingList'
>;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
    case 'CONFIRMED':
      return colors.warning;
    case 'IN_PROGRESS':
    case 'PROVIDER_EN_ROUTE':
    case 'PROVIDER_ARRIVED':
      return colors.info;
    case 'COMPLETED':
      return colors.success;
    case 'CANCELLED':
      return colors.error;
    default:
      return colors.textSecondary;
  }
};

export function BookingListScreen() {
  const navigation = useNavigation<NavigationProp>();

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await bookingsApi.getBookings();
      return response.data.data;
    },
  });

  const renderBooking = ({item}: {item: Booking}) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() =>
        navigation.navigate('BookingDetail', {bookingId: item.id})
      }>
      <View style={styles.bookingHeader}>
        <Text style={styles.serviceName}>{item.service.name}</Text>
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: getStatusColor(item.status) + '20'},
          ]}>
          <Text
            style={[styles.statusText, {color: getStatusColor(item.status)}]}>
            {item.status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <View style={styles.bookingInfo}>
        <View style={styles.infoRow}>
          <Icon
            name="calendar-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.infoText}>
            {format(new Date(item.scheduledAt), 'MMM d, yyyy')} at{' '}
            {format(new Date(item.scheduledAt), 'h:mm a')}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.infoText}>{item.duration} minutes</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon
            name="location-outline"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.infoText} numberOfLines={1}>
            {item.addressText}
          </Text>
        </View>
      </View>

      <View style={styles.bookingFooter}>
        <Text style={styles.priceLabel}>Total</Text>
        <Text style={styles.price}>₱{item.totalAmount.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

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
        data={data}
        renderItem={renderBooking}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="calendar-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySubtext}>
              Book a massage to get started
            </Text>
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
  bookingCard: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  serviceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  bookingInfo: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  priceLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  price: {
    ...typography.h3,
    color: colors.text,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
