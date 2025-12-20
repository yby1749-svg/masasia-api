import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {format} from 'date-fns';

import {Button, Card} from '@components';
import {useAuthStore, useJobStore, useStatusStore} from '@store';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  gradients,
} from '@config/theme';
import type {DashboardStackParamList, MainTabParamList, Booking} from '@types';

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<DashboardStackParamList, 'JobDashboard'>,
  BottomTabNavigationProp<MainTabParamList>
>;

export function JobDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {provider, user} = useAuthStore();
  const {
    pendingJobs,
    declinedJobIds,
    activeJob,
    todayJobs,
    isLoading,
    fetchPendingJobs,
    fetchTodayJobs,
    acceptJob,
    rejectJob,
  } = useJobStore();
  const {isOnline, isUpdating, goOnline, goOffline} = useStatusStore();

  useEffect(() => {
    fetchPendingJobs();
    fetchTodayJobs();
  }, [fetchPendingJobs, fetchTodayJobs]);

  const onRefresh = async () => {
    await Promise.all([fetchPendingJobs(), fetchTodayJobs()]);
  };

  const handleToggleOnline = async () => {
    if (isOnline) {
      await goOffline();
    } else {
      await goOnline();
    }
  };

  const handleAccept = async (bookingId: string) => {
    try {
      const acceptedBooking = await acceptJob(bookingId);
      // Navigate to Schedule tab after accepting
      navigation.navigate('ScheduleTab');
    } catch {
      // Error handled in store
    }
  };

  const handleReject = async (bookingId: string) => {
    try {
      await rejectJob(bookingId);
    } catch {
      // Error handled in store
    }
  };

  const renderPendingJob = (job: Booking) => {
    const isDeclined = declinedJobIds.includes(job.id);

    return (
      <View
        key={job.id}
        style={[
          styles.pendingJobCard,
          isDeclined && styles.declinedJobCard
        ]}>
        {/* Declined Badge */}
        {isDeclined && (
          <View style={styles.declinedBadge}>
            <Icon name="close-circle" size={16} color={colors.error} />
            <Text style={styles.declinedBadgeText}>Declined</Text>
          </View>
        )}
        {/* Tappable header to view details */}
        <TouchableOpacity
          onPress={() => navigation.navigate('JobDetail', {bookingId: job.id})}
          activeOpacity={0.7}
          disabled={isDeclined}>
          <View style={styles.jobHeader}>
            <View style={styles.jobInfo}>
              <Text style={[styles.serviceName, isDeclined && styles.declinedText]}>
                {job.service?.name}
              </Text>
              <Text style={[styles.customerName, isDeclined && styles.declinedText]}>
                {job.customer?.firstName} {job.customer?.lastName?.charAt(0)}.
              </Text>
            </View>
            <View style={[styles.priceContainer, isDeclined && styles.declinedPriceContainer]}>
              <Text style={[styles.price, isDeclined && styles.declinedPrice]}>
                ₱{job.totalAmount || job.price}
              </Text>
            </View>
          </View>
          <View style={styles.jobDetails}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBg, isDeclined && styles.declinedIconBg]}>
                <Icon name="calendar" size={14} color={isDeclined ? colors.textLight : colors.primary} />
              </View>
              <Text style={[styles.detailText, isDeclined && styles.declinedText]}>
                {format(new Date(job.scheduledAt), 'MMM d, h:mm a')}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBg, isDeclined && styles.declinedIconBg]}>
                <Icon name="time" size={14} color={isDeclined ? colors.textLight : colors.primary} />
              </View>
              <Text style={[styles.detailText, isDeclined && styles.declinedText]}>
                {job.duration} minutes
              </Text>
            </View>
            {/* Location details */}
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBg, isDeclined && styles.declinedIconBg]}>
                <Icon name="location" size={14} color={isDeclined ? colors.textLight : colors.primary} />
              </View>
              <View style={styles.locationInfo}>
                <Text style={[styles.detailText, isDeclined && styles.declinedText]} numberOfLines={2}>
                  {job.addressText || `${job.address?.street}, ${job.address?.city}`}
                </Text>
                {(job.addressNotes || job.address?.notes) && (
                  <Text style={[styles.locationNotes, isDeclined && styles.declinedText]} numberOfLines={2}>
                    {job.addressNotes || job.address?.notes}
                  </Text>
                )}
              </View>
            </View>
          </View>
          {!isDeclined && <Text style={styles.tapHint}>Tap for details & map</Text>}
        </TouchableOpacity>
        {!isDeclined && (
          <View style={styles.jobActions}>
            <Button
              title="Decline"
              variant="outline"
              size="sm"
              onPress={() => handleReject(job.id)}
              style={styles.rejectButton}
            />
            <Button
              title="Accept"
              variant="success"
              size="sm"
              icon="checkmark"
              onPress={() => handleAccept(job.id)}
              style={styles.acceptButton}
            />
          </View>
        )}
      </View>
    );
  };

  const renderActiveJob = () => {
    if (!activeJob) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Job</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            navigation.navigate('JobDetail', {bookingId: activeJob.id})
          }>
          <LinearGradient
            colors={gradients.primary as [string, string]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.activeJobCard}>
            <View style={styles.activeJobStatus}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {activeJob.status.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
            <View style={styles.jobHeader}>
              <View style={styles.jobInfo}>
                <Text style={styles.activeServiceName}>
                  {activeJob.service?.name}
                </Text>
                <Text style={styles.activeCustomerName}>
                  {activeJob.customer?.firstName} {activeJob.customer?.lastName}
                </Text>
              </View>
              <View style={styles.activeArrow}>
                <Icon name="chevron-forward" size={20} color={colors.primary} />
              </View>
            </View>
            <View style={styles.activeDetailRow}>
              <Icon name="location" size={16} color={colors.textInverse} />
              <Text style={styles.activeDetailText}>
                {activeJob.address?.street}, {activeJob.address?.city}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Hero Header */}
      <LinearGradient
        colors={isOnline ? (gradients.online as [string, string]) : [colors.surface, colors.background]}
        style={styles.heroGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.greeting}>
                Hello, {provider?.displayName || user?.firstName || 'Provider'}!
              </Text>
              <Text style={styles.subtitle}>
                {isOnline ? 'Ready to receive bookings' : 'Go online to start'}
              </Text>
            </View>
            <View style={styles.onlineToggle}>
              <View style={[
                styles.onlineIndicator,
                isOnline ? styles.onlineIndicatorActive : styles.onlineIndicatorInactive
              ]}>
                <View style={[
                  styles.onlineDot,
                  isOnline && styles.onlineDotActive
                ]} />
                <Text style={[
                  styles.onlineLabel,
                  isOnline ? styles.onlineLabelActive : styles.onlineLabelInactive
                ]}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={handleToggleOnline}
                disabled={isUpdating}
                trackColor={{false: colors.border, true: colors.success}}
                thumbColor={colors.card}
                ios_backgroundColor={colors.border}
              />
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={[colors.primarySoft, colors.card]}
                style={styles.statIconBg}>
                <Icon name="calendar" size={20} color={colors.primary} />
              </LinearGradient>
              <Text style={styles.statValue}>{todayJobs.length}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statCard}>
              <LinearGradient
                colors={[colors.accentLight, colors.card]}
                style={styles.statIconBg}>
                <Icon name="hourglass" size={20} color={colors.accent} />
              </LinearGradient>
              <Text style={styles.statValue}>{pendingJobs.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        {/* Active Job */}
        {renderActiveJob()}

        {/* Pending Jobs */}
        {pendingJobs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Requests</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingJobs.length}</Text>
              </View>
            </View>
            {pendingJobs.map(renderPendingJob)}
          </View>
        )}

        {/* Today's Schedule */}
        {todayJobs.length > 0 && !activeJob && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {todayJobs.map((job: Booking) => (
              <TouchableOpacity
                key={job.id}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate('JobDetail', {bookingId: job.id})
                }>
                <View style={styles.scheduleCard}>
                  <View style={styles.scheduleTime}>
                    <Text style={styles.time}>
                      {format(new Date(job.scheduledAt), 'h:mm')}
                    </Text>
                    <Text style={styles.timePeriod}>
                      {format(new Date(job.scheduledAt), 'a')}
                    </Text>
                  </View>
                  <View style={styles.scheduleDivider} />
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleServiceName}>{job.service?.name}</Text>
                    <Text style={styles.scheduleCustomerName}>
                      {job.customer?.firstName} • {job.duration}min
                    </Text>
                  </View>
                  <View style={styles.scheduleArrow}>
                    <Icon name="chevron-forward" size={18} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {pendingJobs.length === 0 && todayJobs.length === 0 && !activeJob && (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={[colors.primarySoft, colors.surface]}
              style={styles.emptyIconBg}>
              <Icon name="calendar-outline" size={48} color={colors.primary} />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Jobs Yet</Text>
            <Text style={styles.emptySubtitle}>
              {isOnline
                ? 'New booking requests will appear here'
                : 'Go online to receive booking requests'}
            </Text>
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={{height: spacing.xxl}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroGradient: {
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    ...typography.h2,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  onlineToggle: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  onlineIndicatorActive: {
    backgroundColor: colors.card,
    borderColor: colors.success,
    borderWidth: 2,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textLight,
  },
  onlineDotActive: {
    backgroundColor: colors.success,
  },
  onlineLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  onlineLabelActive: {
    color: colors.accentDark,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    ...shadows.card,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textInverse,
  },
  pendingJobCard: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.success,
    ...shadows.card,
  },
  activeJobCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.primaryGlow,
  },
  activeJobStatus: {
    marginBottom: spacing.sm,
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  jobInfo: {
    flex: 1,
  },
  serviceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  activeServiceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textInverse,
  },
  customerName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  activeCustomerName: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
  },
  priceContainer: {
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  price: {
    ...typography.h3,
    color: colors.success,
  },
  activeArrow: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  activeDetailText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  jobDetails: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailIconBg: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    marginTop: 4,
  },
  locationInfo: {
    flex: 1,
  },
  locationNotes: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 4,
  },
  tapHint: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  jobActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  rejectButton: {
    flex: 1,
  },
  acceptButton: {
    flex: 1,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  scheduleTime: {
    alignItems: 'center',
    width: 50,
  },
  time: {
    ...typography.h3,
    color: colors.primary,
  },
  timePeriod: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  scheduleDivider: {
    width: 2,
    height: 40,
    backgroundColor: colors.primaryLight,
    marginHorizontal: spacing.md,
    borderRadius: 1,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleServiceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  scheduleCustomerName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  scheduleArrow: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  // Online indicator - more visible
  onlineIndicatorInactive: {
    backgroundColor: colors.error + '20',
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  onlineLabelInactive: {
    color: colors.error,
    fontWeight: '700',
  },
  // Declined job styles
  declinedJobCard: {
    borderColor: colors.error,
    borderWidth: 2,
    backgroundColor: colors.surface,
    opacity: 0.8,
  },
  declinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  declinedBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.error,
  },
  declinedText: {
    color: colors.textLight,
  },
  declinedPriceContainer: {
    backgroundColor: colors.textLight + '15',
  },
  declinedPrice: {
    color: colors.textLight,
  },
  declinedIconBg: {
    backgroundColor: colors.surface,
  },
});
