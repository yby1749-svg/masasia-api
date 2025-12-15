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
import {colors} from '@config/theme';
import {useShopOwnerStore} from '@store/shopStore';

export function ShopDashboardScreen() {
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
    await Promise.all([fetchShop(), fetchEarningsSummary(), fetchTherapists()]);
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }>
        {/* Shop Info Card */}
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
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <Text style={styles.statLabel}>Balance</Text>
            <Text style={styles.statValue}>
              {formatCurrency(earningsSummary?.balance || 0)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Therapists</Text>
            <Text style={styles.statValue}>{therapists.length}</Text>
          </View>
        </View>

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
            <Text style={styles.viewAll}>View All</Text>
          </View>
          {therapists.length === 0 ? (
            <Text style={styles.emptyText}>
              No therapists yet. Invite your first therapist!
            </Text>
          ) : (
            therapists.slice(0, 3).map(therapist => (
              <View key={therapist.id} style={styles.therapistItem}>
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
                <View
                  style={[
                    styles.onlineIndicator,
                    therapist.onlineStatus === 'ONLINE' && styles.online,
                  ]}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statCardPrimary: {
    backgroundColor: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
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
