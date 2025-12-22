import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {colors, typography, spacing, borderRadius, gradients, shadows} from '@config/theme';
import {useShopOwnerStore} from '@store/shopStore';
import {useNotificationStore} from '@store';
import type {ShopDashboardStackParamList} from '@types';

type NavigationProp = NativeStackNavigationProp<ShopDashboardStackParamList>;

export function ShopDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {unreadCount, fetchUnreadCount} = useNotificationStore();
  const {
    shop,
    earningsSummary,
    therapists,
    isLoading,
    fetchShop,
    fetchEarningsSummary,
    fetchTherapists,
  } = useShopOwnerStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchShop(), fetchEarningsSummary(), fetchTherapists(), fetchUnreadCount()]);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return colors.success;
      case 'PENDING':
        return colors.warning;
      case 'SUSPENDED':
      case 'REJECTED':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      {/* Hero Header with Gradient - matches provider app design */}
      <LinearGradient
        colors={gradients.hero as [string, string, string]}
        style={styles.heroGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Hello, Shop Owner!</Text>
              <Text style={styles.subtitle}>{shop?.name || 'My Shop'}</Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => (navigation as any).navigate('ShopProfileTab', {screen: 'Notifications'})}>
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
          </View>

          {/* Quick Stats in Header */}
          <View style={styles.headerStatsContainer}>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>
                {formatCurrency(earningsSummary?.balance || 0)}
              </Text>
              <Text style={styles.headerStatLabel}>Balance</Text>
            </View>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>{therapists.length}</Text>
              <Text style={styles.headerStatLabel}>Online</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }>
        {/* Shop Status Card */}
        <View style={styles.card}>
          <View style={styles.shopHeader}>
            <View style={styles.shopLogo}>
              <Text style={styles.shopLogoText}>
                {shop?.name?.charAt(0) || 'S'}
              </Text>
            </View>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName}>{shop?.name || 'My Shop'}</Text>
              <View style={styles.statusBadge}>
                <View
                  style={[
                    styles.statusDot,
                    {backgroundColor: getStatusColor(shop?.status || '')},
                  ]}
                />
                <Text style={styles.statusText}>{shop?.status || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statValue}>
              {formatCurrency(earningsSummary?.todayEarnings || 0)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This Month</Text>
            <Text style={styles.statValue}>
              {formatCurrency(earningsSummary?.monthEarnings || 0)}
            </Text>
          </View>
        </View>

        {/* Total Earnings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total Earnings</Text>
          <Text style={styles.totalEarnings}>
            {formatCurrency(earningsSummary?.totalEarnings || 0)}
          </Text>
          {earningsSummary?.pendingPayout != null && earningsSummary.pendingPayout > 0 ? (
            <Text style={styles.pendingPayout}>
              Pending Payout: {formatCurrency(earningsSummary.pendingPayout)}
            </Text>
          ) : null}
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionLabel}>Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>💵</Text>
              <Text style={styles.actionLabel}>Payout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionLabel}>Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Therapists Preview */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Active Therapists</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TherapistMap')}>
              <Text style={styles.viewAll}>View Map</Text>
            </TouchableOpacity>
          </View>
          {therapists.length === 0 ? (
            <Text style={styles.emptyText}>
              No therapists yet. Invite your first therapist!
            </Text>
          ) : (
            therapists.slice(0, 3).map(therapist => (
              <TouchableOpacity
                key={therapist.id}
                style={styles.therapistItem}
                onPress={() =>
                  navigation.navigate('TherapistActivity', {
                    therapistId: therapist.id,
                    therapistName: `${therapist.user?.firstName} ${therapist.user?.lastName}`,
                  })
                }>
                <View style={styles.therapistAvatar}>
                  <Text style={styles.avatarText}>
                    {therapist.user?.firstName?.charAt(0) || 'T'}
                  </Text>
                </View>
                <View style={styles.therapistInfo}>
                  <Text style={styles.therapistName}>
                    {therapist.user?.firstName} {therapist.user?.lastName}
                  </Text>
                  <Text style={styles.therapistStatus}>
                    {therapist.completedBookings} bookings completed
                  </Text>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textLight} />
                <View
                  style={[
                    styles.onlineIndicator,
                    therapist.onlineStatus === 'ONLINE' && styles.online,
                  ]}
                />
              </TouchableOpacity>
            ))
          )}
        </View>
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
  },
  headerLeft: {
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
  headerStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  headerStatCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  headerStatValue: {
    ...typography.h2,
    color: colors.primary,
  },
  headerStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  shopLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.primary,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  totalEarnings: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },
  pendingPayout: {
    fontSize: 14,
    color: colors.warning,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 14,
    color: colors.primary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  therapistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  therapistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  therapistInfo: {
    flex: 1,
  },
  therapistName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  therapistStatus: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textSecondary,
  },
  online: {
    backgroundColor: colors.success,
  },
});
