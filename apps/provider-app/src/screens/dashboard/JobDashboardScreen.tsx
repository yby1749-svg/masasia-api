import React, {useEffect, useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  Vibration,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {format, isWithinInterval, subMinutes, addMinutes} from 'date-fns';

import {Button, Card} from '@components';
import {useAuthStore, useJobStore, useStatusStore, useNotificationStore} from '@store';
import {colors, typography, spacing, borderRadius, gradients, shadows} from '@config/theme';
import type {DashboardStackParamList, Booking} from '@types';

type NavigationProp = NativeStackNavigationProp<
  DashboardStackParamList,
  'JobDashboard'
>;

type TabType = 'pending' | 'history';

export function JobDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {provider, user} = useAuthStore();
  const {unreadCount} = useNotificationStore();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [hasNotifiedReadyJob, setHasNotifiedReadyJob] = useState<string | null>(null);
  const {
    pendingJobs,
    rejectedJobs,
    activeJob,
    todayJobs,
    isLoading,
    fetchPendingJobs,
    fetchRejectedJobs,
    fetchTodayJobs,
    acceptJob,
    rejectJob,
  } = useJobStore();
  const {isOnline, isUpdating, goOnline, goOffline} = useStatusStore();

  // Check if a job is ready to start (within 30 minutes of scheduled time)
  const isJobReadyToStart = (job: Booking): boolean => {
    if (job.status !== 'ACCEPTED') return false;
    const scheduledTime = new Date(job.scheduledAt);
    const now = new Date();
    const startWindow = subMinutes(scheduledTime, 30);
    const endWindow = addMinutes(scheduledTime, job.duration || 120);
    return isWithinInterval(now, {start: startWindow, end: endWindow});
  };

  // Find job ready to start from today's jobs
  const readyToStartJob = useMemo(() => {
    return todayJobs.find(job => isJobReadyToStart(job));
  }, [todayJobs]);

  // Notify when a job is ready to start
  useEffect(() => {
    if (readyToStartJob && readyToStartJob.id !== hasNotifiedReadyJob) {
      // Vibrate to alert the provider
      Vibration.vibrate([0, 500, 200, 500]);
      setHasNotifiedReadyJob(readyToStartJob.id);
    }
  }, [readyToStartJob, hasNotifiedReadyJob]);

  // Refresh data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchPendingJobs();
      fetchRejectedJobs();
      fetchTodayJobs();
    }, [fetchPendingJobs, fetchRejectedJobs, fetchTodayJobs])
  );

  useEffect(() => {
    fetchPendingJobs();
    fetchRejectedJobs();
    fetchTodayJobs();
  }, [fetchPendingJobs, fetchRejectedJobs, fetchTodayJobs]);

  const onRefresh = async () => {
    await Promise.all([fetchPendingJobs(), fetchRejectedJobs(), fetchTodayJobs()]);
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
      await acceptJob(bookingId);
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

  const renderPendingJob = (job: Booking) => (
    <Card key={job.id} style={styles.pendingJobCard}>
      {/* Tappable header to view details */}
      <TouchableOpacity
        onPress={() => navigation.navigate('JobDetail', {bookingId: job.id})}
        activeOpacity={0.7}>
        <View style={styles.jobHeader}>
          <View style={styles.jobInfo}>
            <Text style={styles.serviceName}>{job.service?.name}</Text>
            <Text style={styles.customerName}>
              {job.customer?.firstName} {job.customer?.lastName?.charAt(0)}.
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₱{job.totalAmount || job.price}</Text>
            <Icon name="chevron-forward" size={16} color={colors.textLight} />
          </View>
        </View>
        <View style={styles.jobDetails}>
          <View style={styles.detailRow}>
            <Icon
              name="calendar-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.detailText}>
              {format(new Date(job.scheduledAt), 'MMM d, h:mm a')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{job.duration} minutes</Text>
          </View>
          {/* Location details */}
          <View style={styles.detailRow}>
            <Icon
              name="location"
              size={16}
              color={colors.primary}
            />
            <View style={styles.locationInfo}>
              <Text style={styles.detailText} numberOfLines={2}>
                {job.addressText || `${job.address?.street}, ${job.address?.city}`}
                {(job.addressNotes || job.address?.notes) ? `  ${job.addressNotes || job.address?.notes}` : ''}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.tapHint}>Tap for details & map</Text>
      </TouchableOpacity>
      <View style={styles.jobActions}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('Chat', {bookingId: job.id})}>
          <Icon name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Button
          title="Reject"
          variant="outline"
          size="sm"
          onPress={() => handleReject(job.id)}
          style={styles.rejectButton}
        />
        <Button
          title="Accept"
          variant="success"
          size="sm"
          onPress={() => handleAccept(job.id)}
          style={styles.acceptButton}
        />
      </View>
    </Card>
  );

  const renderRejectedJob = (job: Booking) => (
    <Card key={job.id} style={styles.rejectedJobCard}>
      <TouchableOpacity
        onPress={() => navigation.navigate('JobDetail', {bookingId: job.id})}
        activeOpacity={0.7}>
        <View style={styles.jobHeader}>
          <View style={styles.jobInfo}>
            <Text style={styles.serviceName}>{job.service?.name}</Text>
            <Text style={styles.customerName}>
              {job.customer?.firstName} {job.customer?.lastName?.charAt(0)}.
            </Text>
          </View>
          <View style={styles.rejectedBadge}>
            <Text style={styles.rejectedText}>Declined</Text>
          </View>
        </View>
        <View style={styles.jobDetails}>
          <View style={styles.detailRow}>
            <Icon
              name="calendar-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.detailText}>
              {format(new Date(job.scheduledAt), 'MMM d, h:mm a')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="cash-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>₱{job.totalAmount || job.price}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  // Render "Ready to Start" job (ACCEPTED but time has arrived)
  const renderReadyToStartJob = () => {
    if (!readyToStartJob || activeJob) {
      return null;
    }

    return (
      <View style={styles.section}>
        <View style={styles.readyHeader}>
          <View style={styles.alertPulse} />
          <Text style={styles.sectionTitle}>🔔 Time to Start!</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            navigation.navigate('JobDetail', {bookingId: readyToStartJob.id})
          }>
          <LinearGradient
            colors={['#FF9800', '#F57C00'] as [string, string]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.readyJobCard}>
            <View style={styles.readyJobHeader}>
              <View style={styles.readyBadge}>
                <Icon name="time" size={14} color="#FFFFFF" />
                <Text style={styles.readyBadgeText}>Ready to Go</Text>
              </View>
              <TouchableOpacity
                style={styles.activeChatButton}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('Chat', {
                    bookingId: readyToStartJob.id,
                    customerName: `${readyToStartJob.customer?.firstName} ${readyToStartJob.customer?.lastName}`,
                  });
                }}>
                <Icon name="chatbubble-ellipses" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.jobHeader}>
              <View style={styles.jobInfo}>
                <Text style={styles.activeServiceName}>
                  {readyToStartJob.service?.name}
                </Text>
                <Text style={styles.activeCustomerName}>
                  {readyToStartJob.customer?.firstName} {readyToStartJob.customer?.lastName}
                </Text>
              </View>
            </View>
            <View style={styles.activeDetailRow}>
              <Icon name="calendar" size={16} color="#FFFFFF" />
              <Text style={styles.activeDetailText}>
                {format(new Date(readyToStartJob.scheduledAt), 'h:mm a')} • {readyToStartJob.duration}min
              </Text>
            </View>
            <View style={styles.activeDetailRow}>
              <Icon name="location" size={16} color="#FFFFFF" />
              <Text style={styles.activeDetailText}>
                {readyToStartJob.addressText || `${readyToStartJob.address?.street}, ${readyToStartJob.address?.city}`}
                {(readyToStartJob.addressNotes || readyToStartJob.address?.notes) ? `  ${readyToStartJob.addressNotes || readyToStartJob.address?.notes}` : ''}
              </Text>
            </View>
            <View style={styles.readyActionRow}>
              <Icon name="car" size={20} color="#FFFFFF" />
              <Text style={styles.readyActionText}>Tap to start "On My Way"</Text>
              <Icon name="chevron-forward" size={20} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
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
            <View style={styles.activeJobHeader}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {activeJob.status.replace(/_/g, ' ')}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.activeChatButton}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('Chat', {
                    bookingId: activeJob.id,
                    customerName: `${activeJob.customer?.firstName} ${activeJob.customer?.lastName}`,
                  });
                }}>
                <Icon name="chatbubble-ellipses" size={18} color={colors.primary} />
              </TouchableOpacity>
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
                {activeJob.addressText || `${activeJob.address?.street}, ${activeJob.address?.city}`}
                {(activeJob.addressNotes || activeJob.address?.notes) ? `  ${activeJob.addressNotes || activeJob.address?.notes}` : ''}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // Gradient colors based on online status
  const headerGradient = isOnline
    ? ['#6B8E4E', '#C5E1A5', '#FFF8E7'] as [string, string, string]  // Green gradient when online
    : gradients.hero as [string, string, string];  // Purple gradient when offline (same as customer app)

  return (
    <View style={styles.container}>
      {/* Hero Header with Gradient - matches customer app design */}
      <LinearGradient
        colors={headerGradient}
        style={styles.heroGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Hello, {provider?.displayName || user?.firstName || 'Provider'}!</Text>
              <Text style={styles.subtitle}>
                {isOnline ? 'You are online' : 'You are offline'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => (navigation as any).navigate('ProfileTab', { screen: 'Notifications' })}>
              <View style={styles.notificationIconContainer}>
                <Icon name="notifications" size={22} color={colors.text} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.onlineToggle}>
              <View style={[
                styles.onlineIndicator,
                isOnline ? styles.onlineIndicatorActive : styles.onlineIndicatorInactive
              ]}>
                <View style={[
                  styles.onlineDot,
                  isOnline ? styles.onlineDotActive : styles.onlineDotInactive
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
              <Text style={styles.statValue}>{todayJobs.length}</Text>
              <Text style={styles.statLabel}>Today's Jobs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{pendingJobs.length}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }>

        {/* Ready to Start Job (ACCEPTED but time has arrived) */}
        {renderReadyToStartJob()}

        {/* Active Job */}
        {renderActiveJob()}

        {/* Tabs for Pending/History */}
        <View style={styles.tabsSection}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
              onPress={() => setActiveTab('pending')}>
              <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                Pending Requests
              </Text>
              {pendingJobs.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{pendingJobs.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.tabActive]}
              onPress={() => setActiveTab('history')}>
              <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                History
              </Text>
              {rejectedJobs.length > 0 && (
                <View style={[styles.tabBadge, styles.tabBadgeGray]}>
                  <Text style={styles.tabBadgeText}>{rejectedJobs.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'pending' ? (
            pendingJobs.length > 0 ? (
              <View style={styles.tabContent}>
                {pendingJobs.map(renderPendingJob)}
              </View>
            ) : (
              <View style={styles.emptyTabState}>
                <Icon name="documents-outline" size={48} color={colors.textLight} />
                <Text style={styles.emptyTabText}>No pending requests</Text>
                <Text style={styles.emptyTabSubtext}>
                  {isOnline
                    ? 'New booking requests will appear here'
                    : 'Go online to receive booking requests'}
                </Text>
              </View>
            )
          ) : (
            rejectedJobs.length > 0 ? (
              <View style={styles.tabContent}>
                {rejectedJobs.map(renderRejectedJob)}
              </View>
            ) : (
              <View style={styles.emptyTabState}>
                <Icon name="time-outline" size={48} color={colors.textLight} />
                <Text style={styles.emptyTabText}>No history yet</Text>
                <Text style={styles.emptyTabSubtext}>
                  Declined bookings will appear here
                </Text>
              </View>
            )
          )}
        </View>

        {/* Today's Schedule */}
        {todayJobs.length > 0 && !activeJob && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {todayJobs.map((job: Booking) => (
              <Card key={job.id} style={styles.scheduleCard}>
                <TouchableOpacity
                  style={styles.scheduleContent}
                  onPress={() =>
                    navigation.navigate('JobDetail', {bookingId: job.id})
                  }>
                  <View style={styles.scheduleTime}>
                    <Text style={styles.time}>
                      {format(new Date(job.scheduledAt), 'h:mm a')}
                    </Text>
                  </View>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.serviceName}>{job.service?.name}</Text>
                    <Text style={styles.customerName}>
                      {job.customer?.firstName} - {job.duration}min
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.scheduleChatButton}
                  onPress={() => navigation.navigate('Chat', {
                    bookingId: job.id,
                    customerName: `${job.customer?.firstName} ${job.customer?.lastName}`,
                  })}>
                  <Icon name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('JobDetail', {bookingId: job.id})
                  }>
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}
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
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  notificationButton: {
    marginRight: spacing.sm,
  },
  notificationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.card,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    borderWidth: 2,
  },
  onlineIndicatorActive: {
    backgroundColor: colors.card,
    borderColor: colors.success,
  },
  onlineIndicatorInactive: {
    backgroundColor: colors.error + '15',
    borderColor: colors.error,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  onlineDotActive: {
    backgroundColor: colors.success,
  },
  onlineDotInactive: {
    backgroundColor: colors.error,
  },
  onlineLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
  },
  onlineLabelActive: {
    color: colors.success,
  },
  onlineLabelInactive: {
    color: colors.error,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  // Tabs
  tabsSection: {
    padding: spacing.lg,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.card,
    ...shadows.sm,
  },
  tabText: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  tabBadgeGray: {
    backgroundColor: colors.textLight,
  },
  tabBadgeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '600',
  },
  tabContent: {
    gap: spacing.md,
  },
  emptyTabState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTabText: {
    ...typography.body,
    fontWeight: '500',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyTabSubtext: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  // Job cards
  pendingJobCard: {
    borderWidth: 2,
    borderColor: colors.success,
    borderRadius: borderRadius.lg,
  },
  rejectedJobCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    opacity: 0.8,
  },
  activeJobCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    ...shadows.primaryGlow,
  },
  activeJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activeChatButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
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
  activeServiceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textInverse,
  },
  activeCustomerName: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: spacing.xs,
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
  customerName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  price: {
    ...typography.h3,
    color: colors.success,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rejectedBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  rejectedText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
  jobDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  detailText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  locationInfo: {
    flex: 1,
  },
  locationNotes: {
    ...typography.caption,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  tapHint: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  jobActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
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
    marginBottom: spacing.sm,
  },
  scheduleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scheduleTime: {
    marginRight: spacing.md,
  },
  time: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleChatButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  // Ready to Start styles
  readyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  alertPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF9800',
  },
  readyJobCard: {
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    shadowColor: '#FF9800',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  readyJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  readyBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  readyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
    gap: spacing.sm,
  },
  readyActionText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
