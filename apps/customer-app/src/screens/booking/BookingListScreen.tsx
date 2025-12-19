import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
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

type TabType = 'active' | 'history';

const ACTIVE_STATUSES = ['PENDING', 'ACCEPTED', 'CONFIRMED', 'PROVIDER_EN_ROUTE', 'PROVIDER_ARRIVED', 'IN_PROGRESS'];
const HISTORY_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED'];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return colors.warning;
    case 'ACCEPTED':
    case 'CONFIRMED':
      return colors.info;
    case 'IN_PROGRESS':
    case 'PROVIDER_EN_ROUTE':
    case 'PROVIDER_ARRIVED':
      return colors.primary;
    case 'COMPLETED':
      return colors.success;
    case 'CANCELLED':
    case 'REJECTED':
      return colors.error;
    default:
      return colors.textSecondary;
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING': return 'Pending';
    case 'ACCEPTED': return 'Confirmed';
    case 'PROVIDER_EN_ROUTE': return 'On The Way';
    case 'PROVIDER_ARRIVED': return 'Arrived';
    case 'IN_PROGRESS': return 'In Progress';
    case 'COMPLETED': return 'Completed';
    case 'CANCELLED': return 'Cancelled';
    case 'REJECTED': return 'Declined';
    default: return status.replace(/_/g, ' ');
  }
};

export function BookingListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('active');

  const {data, isLoading, refetch} = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await bookingsApi.getBookings({limit: 100});
      return response.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      await bookingsApi.hideBooking(bookingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['bookings']});
    },
  });

  const handleDeleteHistory = (booking: Booking) => {
    Alert.alert(
      'Remove from History',
      'Are you sure you want to remove this booking from your history?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(booking.id),
        },
      ],
    );
  };

  const activeBookings = data?.filter((b: Booking) => ACTIVE_STATUSES.includes(b.status)) || [];
  const historyBookings = data?.filter((b: Booking) => HISTORY_STATUSES.includes(b.status)) || [];
  const displayedBookings = activeTab === 'active' ? activeBookings : historyBookings;

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
            {getStatusLabel(item.status)}
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
        <View>
          <Text style={styles.priceLabel}>Total</Text>
          <Text style={styles.price}>₱{item.totalAmount.toFixed(2)}</Text>
        </View>
        {activeTab === 'history' && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteHistory(item)}>
            <Icon name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
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
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}>
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active ({activeBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History ({historyBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayedBookings}
        renderItem={renderBooking}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon
              name={activeTab === 'active' ? 'calendar-outline' : 'time-outline'}
              size={64}
              color={colors.textLight}
            />
            <Text style={styles.emptyText}>
              {activeTab === 'active' ? 'No active bookings' : 'No booking history'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'active'
                ? 'Book a massage to get started'
                : 'Completed bookings will appear here'}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
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
    flex: 1,
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
  deleteButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error + '10',
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
