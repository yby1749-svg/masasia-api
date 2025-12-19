import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';
import {format, startOfWeek, addDays, isSameDay} from 'date-fns';

import {Card} from '@components';
import {bookingsApi} from '@api';
import {colors, typography, spacing, borderRadius} from '@config/theme';
import type {ScheduleStackParamList, Booking, BookingStatus} from '@types';

type NavigationProp = NativeStackNavigationProp<
  ScheduleStackParamList,
  'Calendar'
>;

type TabType = 'schedule' | 'history';

const ACTIVE_STATUSES = ['PENDING', 'ACCEPTED', 'CONFIRMED', 'PROVIDER_EN_ROUTE', 'PROVIDER_ARRIVED', 'IN_PROGRESS'];
const HISTORY_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED'];

const getStatusStyle = (status: BookingStatus) => {
  const statusStyles: Record<BookingStatus, {backgroundColor: string; color: string}> = {
    PENDING: {backgroundColor: colors.warning + '20', color: colors.warning},
    CONFIRMED: {backgroundColor: colors.info + '20', color: colors.info},
    ACCEPTED: {backgroundColor: colors.info + '20', color: colors.info},
    PROVIDER_ASSIGNED: {backgroundColor: colors.primary + '20', color: colors.primary},
    PROVIDER_EN_ROUTE: {backgroundColor: colors.primary + '20', color: colors.primary},
    PROVIDER_ARRIVED: {backgroundColor: colors.primary + '20', color: colors.primary},
    IN_PROGRESS: {backgroundColor: colors.success + '20', color: colors.success},
    COMPLETED: {backgroundColor: colors.success + '20', color: colors.success},
    CANCELLED: {backgroundColor: colors.error + '20', color: colors.error},
    REJECTED: {backgroundColor: colors.error + '20', color: colors.error},
  };
  return statusStyles[status] || {backgroundColor: colors.surface, color: colors.textSecondary};
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'PENDING': return 'Pending';
    case 'ACCEPTED': return 'Accepted';
    case 'PROVIDER_EN_ROUTE': return 'En Route';
    case 'PROVIDER_ARRIVED': return 'Arrived';
    case 'IN_PROGRESS': return 'In Progress';
    case 'COMPLETED': return 'Completed';
    case 'CANCELLED': return 'Cancelled';
    case 'REJECTED': return 'Rejected';
    default: return status.replace(/_/g, ' ');
  }
};

export function CalendarScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [activeTab, setActiveTab] = useState<TabType>('schedule');

  const {
    data: bookings,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['providerBookings'],
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
      queryClient.invalidateQueries({queryKey: ['providerBookings']});
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

  const weekStart = startOfWeek(new Date(), {weekStartsOn: 1});
  const weekDays = Array.from({length: 7}, (_, i) => addDays(weekStart, i));

  const activeBookings = bookings?.filter((b: Booking) => ACTIVE_STATUSES.includes(b.status)) || [];
  const historyBookings = bookings?.filter((b: Booking) => HISTORY_STATUSES.includes(b.status)) || [];

  const selectedDayBookings = activeBookings?.filter((booking: Booking) =>
    isSameDay(new Date(booking.scheduledAt), selectedDate),
  ) || [];

  const getBookingsForDay = (date: Date) => {
    return activeBookings?.filter((booking: Booking) =>
      isSameDay(new Date(booking.scheduledAt), date),
    ).length || 0;
  };

  const renderScheduleTab = () => (
    <>
      {/* Week Calendar */}
      <View style={styles.weekCalendar}>
        {weekDays.map(day => {
          const isSelected = isSameDay(day, selectedDate);
          const bookingCount = getBookingsForDay(day);

          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.dayButton,
                isSelected ? styles.selectedDay : undefined,
              ]}
              onPress={() => setSelectedDate(day)}>
              <Text
                style={[
                  styles.dayName,
                  isSelected ? styles.selectedDayText : undefined,
                ]}>
                {format(day, 'EEE')}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected ? styles.selectedDayText : undefined,
                ]}>
                {format(day, 'd')}
              </Text>
              {bookingCount > 0 && (
                <View style={styles.bookingDot}>
                  <Text style={styles.bookingDotText}>{bookingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Availability')}>
          <Icon name="time-outline" size={20} color={colors.primary} />
          <Text style={styles.actionText}>Set Availability</Text>
          <Icon name="chevron-forward" size={20} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('BlockedDates')}>
          <Icon name="calendar-outline" size={20} color={colors.primary} />
          <Text style={styles.actionText}>Blocked Dates</Text>
          <Icon name="chevron-forward" size={20} color={colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      <View style={styles.bookingsList}>
        <Text style={styles.dateTitle}>
          {format(selectedDate, 'EEEE, MMMM d')}
        </Text>

        {selectedDayBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No bookings on this day</Text>
          </View>
        ) : (
          selectedDayBookings.map((booking: Booking) => (
            <TouchableOpacity
              key={booking.id}
              onPress={() => {
                navigation.getParent()?.navigate('DashboardTab', {
                  screen: 'JobDetail',
                  params: {bookingId: booking.id},
                });
              }}
              activeOpacity={0.7}>
              <Card style={styles.bookingCard}>
                <View style={styles.timeContainer}>
                  <Text style={styles.time}>
                    {format(new Date(booking.scheduledAt), 'h:mm a')}
                  </Text>
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{booking.duration}min</Text>
                  </View>
                </View>
                <View style={styles.bookingInfo}>
                  <Text style={styles.serviceName}>{booking.service?.name}</Text>
                  <Text style={styles.customerName}>
                    {booking.customer?.firstName} {booking.customer?.lastName}
                  </Text>
                </View>
                <View style={[styles.statusBadge, {backgroundColor: getStatusStyle(booking.status).backgroundColor}]}>
                  <Text style={[styles.statusText, {color: getStatusStyle(booking.status).color}]}>
                    {getStatusLabel(booking.status)}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </View>
    </>
  );

  const renderHistoryTab = () => (
    <View style={styles.historyContainer}>
      <Text style={styles.historyTitle}>Booking History ({historyBookings.length})</Text>

      {historyBookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="time-outline" size={48} color={colors.textLight} />
          <Text style={styles.emptyText}>No booking history</Text>
          <Text style={styles.emptySubtext}>Completed bookings will appear here</Text>
        </View>
      ) : (
        historyBookings.map((booking: Booking) => (
          <Card key={booking.id} style={styles.historyCard}>
            <TouchableOpacity
              onPress={() => {
                navigation.getParent()?.navigate('DashboardTab', {
                  screen: 'JobDetail',
                  params: {bookingId: booking.id},
                });
              }}
              style={styles.historyCardContent}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyService}>{booking.service?.name}</Text>
                <Text style={styles.historyCustomer}>
                  {booking.customer?.firstName} {booking.customer?.lastName}
                </Text>
                <Text style={styles.historyDate}>
                  {format(new Date(booking.scheduledAt), 'MMM d, yyyy h:mm a')}
                </Text>
              </View>
              <View style={styles.historyRight}>
                <View style={[styles.statusBadge, {backgroundColor: getStatusStyle(booking.status).backgroundColor}]}>
                  <Text style={[styles.statusText, {color: getStatusStyle(booking.status).color}]}>
                    {getStatusLabel(booking.status)}
                  </Text>
                </View>
                <Text style={styles.historyPrice}>₱{booking.totalAmount?.toLocaleString()}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteHistory(booking)}>
              <Icon name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </Card>
        ))
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && styles.activeTab]}
          onPress={() => setActiveTab('schedule')}>
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.activeTabText]}>
            Schedule ({activeBookings.length})
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

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }>
        {activeTab === 'schedule' ? renderScheduleTab() : renderHistoryTab()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
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
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  dayButton: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 44,
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  dayName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dayNumber: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xs,
  },
  selectedDayText: {
    color: colors.textInverse,
  },
  bookingDot: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  bookingDotText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  quickActions: {
    backgroundColor: colors.card,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  actionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  bookingsList: {
    padding: spacing.md,
  },
  dateTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  bookingCard: {
    marginBottom: spacing.md,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  time: {
    ...typography.h3,
    color: colors.primary,
  },
  durationBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  durationText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  bookingInfo: {
    marginBottom: spacing.sm,
  },
  serviceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  customerName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  // History styles
  historyContainer: {
    padding: spacing.md,
  },
  historyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  historyCard: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  historyCardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyInfo: {
    flex: 1,
  },
  historyService: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  historyCustomer: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  historyDate: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyPrice: {
    ...typography.body,
    fontWeight: '600',
    color: colors.success,
    marginTop: spacing.sm,
  },
  deleteButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error + '10',
  },
});
