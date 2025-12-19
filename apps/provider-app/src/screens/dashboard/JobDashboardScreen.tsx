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
import Icon from 'react-native-vector-icons/Ionicons';
import {format} from 'date-fns';

import {Button, Card} from '@components';
import {useAuthStore, useJobStore, useStatusStore} from '@store';
import {colors, typography, spacing, borderRadius} from '@config/theme';
import type {DashboardStackParamList, Booking} from '@types';

type NavigationProp = NativeStackNavigationProp<
  DashboardStackParamList,
  'JobDashboard'
>;

export function JobDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {provider, user} = useAuthStore();
  const {
    pendingJobs,
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
    <Card key={job.id} style={styles.jobCard}>
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
            <Text style={styles.price}>P{job.totalAmount || job.price}</Text>
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
          {/* Location with label (building/hotel name) */}
          <View style={styles.detailRow}>
            <Icon
              name="location"
              size={16}
              color={colors.primary}
            />
            <View style={styles.locationInfo}>
              {job.address?.label && (
                <Text style={styles.locationLabel}>{job.address.label}</Text>
              )}
              <Text style={styles.detailText} numberOfLines={2}>
                {job.address?.street}, {job.address?.city}
              </Text>
              {job.address?.notes && (
                <Text style={styles.locationNotes} numberOfLines={1}>
                  {job.address.notes}
                </Text>
              )}
            </View>
          </View>
        </View>
        <Text style={styles.tapHint}>Tap for details & map</Text>
      </TouchableOpacity>
      <View style={styles.jobActions}>
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

  const renderActiveJob = () => {
    if (!activeJob) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Job</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('JobDetail', {bookingId: activeJob.id})
          }>
          <Card style={styles.activeJobCard}>
            <View style={styles.activeJobStatus}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {activeJob.status.replace(/_/g, ' ')}
                </Text>
              </View>
            </View>
            <View style={styles.jobHeader}>
              <View style={styles.jobInfo}>
                <Text style={styles.serviceName}>
                  {activeJob.service?.name}
                </Text>
                <Text style={styles.customerName}>
                  {activeJob.customer?.firstName} {activeJob.customer?.lastName}
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </View>
            <View style={styles.detailRow}>
              <Icon
                name="location-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.detailText}>
                {activeJob.address?.street}, {activeJob.address?.city}
              </Text>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }>
        {/* Header with Online Toggle */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {provider?.displayName || user?.firstName || 'Provider'}!</Text>
            <Text style={styles.subtitle}>
              {isOnline ? 'You are online' : 'You are offline'}
            </Text>
          </View>
          <View style={styles.onlineToggle}>
            <Text style={styles.onlineLabel}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              disabled={isUpdating}
              trackColor={{false: colors.border, true: colors.success + '80'}}
              thumbColor={isOnline ? colors.success : colors.textLight}
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

        {/* Active Job */}
        {renderActiveJob()}

        {/* Pending Jobs */}
        {pendingJobs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
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
                onPress={() =>
                  navigation.navigate('JobDetail', {bookingId: job.id})
                }>
                <Card style={styles.scheduleCard}>
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
                  <Icon
                    name="chevron-forward"
                    size={20}
                    color={colors.textLight}
                  />
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {pendingJobs.length === 0 && todayJobs.length === 0 && !activeJob && (
          <View style={styles.emptyState}>
            <Icon name="calendar-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No Jobs Yet</Text>
            <Text style={styles.emptySubtitle}>
              {isOnline
                ? 'New booking requests will appear here'
                : 'Go online to receive booking requests'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
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
    alignItems: 'center',
  },
  onlineLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
  jobCard: {
    marginBottom: spacing.md,
  },
  activeJobCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  activeJobStatus: {
    marginBottom: spacing.sm,
  },
  statusBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    ...typography.caption,
    color: colors.primary,
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
  locationLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
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
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
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
  },
});
