import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography} from '@config/theme';
import {useShopOwnerStore} from '@store/shopStore';
import {shopOwnerApi, type ShopEarning, type ShopPayout} from '@api/shops';
import {Button} from '@components/ui';
import type {ShopEarningsStackParamList} from '@types';

type NavigationProp = NativeStackNavigationProp<ShopEarningsStackParamList>;

export function ShopEarningsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {earningsSummary, payouts, isLoading, fetchEarningsSummary, fetchPayouts} =
    useShopOwnerStore();

  const [activeTab, setActiveTab] = useState<'earnings' | 'payouts'>('earnings');
  const [earnings, setEarnings] = useState<ShopEarning[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([fetchEarningsSummary(), fetchPayouts(), loadEarnings()]);
  };

  const loadEarnings = async () => {
    setEarningsLoading(true);
    try {
      const response = await shopOwnerApi.getEarnings();
      setEarnings(response.data.data);
    } catch {
      // Handle error silently
    } finally {
      setEarningsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', {minimumFractionDigits: 0})}`;
  };

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return colors.success;
      case 'PROCESSING':
        return colors.primary;
      case 'PENDING':
        return colors.warning;
      case 'FAILED':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const renderEarning = ({item}: {item: ShopEarning}) => (
    <View style={styles.itemCard}>
      <View style={styles.itemMain}>
        <Text style={styles.itemTitle}>{item.service?.name}</Text>
        <Text style={styles.itemSubtitle}>
          {item.provider?.displayName} • {item.customer?.firstName}{' '}
          {item.customer?.lastName}
        </Text>
        <Text style={styles.itemDate}>
          {new Date(item.completedAt).toLocaleString()}
        </Text>
        {/* Breakdown */}
        <View style={styles.breakdownContainer}>
          <Text style={styles.breakdownText}>
            Service: {formatCurrency(item.serviceAmount)}
          </Text>
          <Text style={styles.breakdownText}>
            Platform ({earningsSummary?.platformPercentage || 8}%): -{formatCurrency(item.platformFee)}
          </Text>
          <Text style={styles.breakdownText}>
            Therapist ({earningsSummary?.therapistPercentage || 55}%): -{formatCurrency(item.providerEarning)}
          </Text>
        </View>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemAmount}>{formatCurrency(item.shopEarning)}</Text>
        <Text style={styles.itemPercentage}>({earningsSummary?.shopPercentage || 37}%)</Text>
      </View>
    </View>
  );

  const renderPayout = ({item}: {item: ShopPayout}) => (
    <View style={styles.itemCard}>
      <View style={styles.itemMain}>
        <Text style={styles.itemTitle}>{formatCurrency(item.netAmount)}</Text>
        <Text style={styles.itemSubtitle}>
          {item.method} • Fee: {formatCurrency(item.fee)}
        </Text>
        <Text style={styles.itemDate}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
      <View
        style={[
          styles.statusBadge,
          {backgroundColor: getPayoutStatusColor(item.status) + '20'},
        ]}>
        <Text
          style={[styles.statusText, {color: getPayoutStatusColor(item.status)}]}>
          {item.status}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Shop Owner Badge */}
      <TouchableOpacity
        style={styles.badgeContainer}
        onPress={() => setShowBreakdown(true)}>
        <View style={styles.badge}>
          <Icon name="business" size={16} color={colors.primary} />
          <Text style={styles.badgeText}>
            {earningsSummary?.shopName || 'Shop Owner'}
          </Text>
          <View style={styles.percentageBadge}>
            <Text style={styles.percentageText}>
              {earningsSummary?.shopPercentage || 37}%
            </Text>
          </View>
          <Icon name="information-circle-outline" size={16} color={colors.textSecondary} />
        </View>
        <Text style={styles.therapistCount}>
          {earningsSummary?.therapistCount || 0} therapists
        </Text>
      </TouchableOpacity>

      {/* Wallet Button */}
      <TouchableOpacity
        style={styles.walletButton}
        onPress={() => navigation.navigate('ShopWallet')}>
        <View style={styles.walletButtonContent}>
          <Icon name="wallet" size={24} color={colors.primary} />
          <View style={styles.walletButtonText}>
            <Text style={styles.walletButtonTitle}>Shop Wallet</Text>
            <Text style={styles.walletButtonSubtitle}>
              Top up for cash bookings
            </Text>
          </View>
        </View>
        <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(earningsSummary?.balance || 0)}
          </Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(earningsSummary?.todayEarnings || 0)}
            </Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(earningsSummary?.weekEarnings || 0)}
            </Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(earningsSummary?.monthEarnings || 0)}
            </Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'earnings' && styles.activeTab]}
          onPress={() => setActiveTab('earnings')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'earnings' && styles.activeTabText,
            ]}>
            Earnings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payouts' && styles.activeTab]}
          onPress={() => setActiveTab('payouts')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'payouts' && styles.activeTabText,
            ]}>
            Payouts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'earnings' ? (
        <FlatList
          data={earnings}
          renderItem={renderEarning}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isLoading || earningsLoading}
              onRefresh={loadData}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="wallet-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Earnings Yet</Text>
              <Text style={styles.emptyText}>
                Earnings from your therapists will appear here
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={payouts}
          renderItem={renderPayout}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadData} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="cash-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Payouts Yet</Text>
              <Text style={styles.emptyText}>
                Request a payout when you have earnings
              </Text>
            </View>
          }
        />
      )}

      {/* Payout Button */}
      {earningsSummary && earningsSummary.balance > 0 && (
        <View style={styles.footer}>
          <Button
            title="Request Payout"
            onPress={() => navigation.navigate('ShopPayoutRequest')}
          />
        </View>
      )}

      {/* Earnings Breakdown Modal */}
      <Modal
        visible={showBreakdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBreakdown(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBreakdown(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Revenue Split</Text>

            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownLabel}>Your Shop</Text>
              <View style={styles.statusRow}>
                <Icon name="business" size={24} color={colors.primary} />
                <Text style={styles.statusText2}>
                  {earningsSummary?.shopName || 'Shop'}
                </Text>
              </View>
              <Text style={styles.therapistInfo}>
                {earningsSummary?.therapistCount || 0} therapists enrolled
              </Text>
            </View>

            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownLabel}>Revenue Split Per Booking</Text>
              <View style={styles.splitRow}>
                <View style={styles.splitItem}>
                  <Text style={styles.splitPercentage}>
                    {earningsSummary?.platformPercentage || 8}%
                  </Text>
                  <Text style={styles.splitLabel}>Platform</Text>
                </View>
                <View style={[styles.splitItem, styles.splitItemHighlight]}>
                  <Text style={[styles.splitPercentage, styles.splitPercentageHighlight]}>
                    {earningsSummary?.shopPercentage || 37}%
                  </Text>
                  <Text style={[styles.splitLabel, styles.splitLabelHighlight]}>You</Text>
                </View>
                <View style={styles.splitItem}>
                  <Text style={styles.splitPercentage}>
                    {earningsSummary?.therapistPercentage || 55}%
                  </Text>
                  <Text style={styles.splitLabel}>Therapist</Text>
                </View>
              </View>
            </View>

            <View style={styles.exampleSection}>
              <Text style={styles.breakdownLabel}>Example (₱1,000 service)</Text>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleText}>Platform Fee:</Text>
                <Text style={styles.exampleAmount}>
                  -₱{(1000 * (earningsSummary?.platformPercentage || 8) / 100).toFixed(0)}
                </Text>
              </View>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleText}>Therapist:</Text>
                <Text style={styles.exampleAmount}>
                  -₱{(1000 * (earningsSummary?.therapistPercentage || 55) / 100).toFixed(0)}
                </Text>
              </View>
              <View style={[styles.exampleRow, styles.exampleRowTotal]}>
                <Text style={styles.exampleTextTotal}>Your Earnings:</Text>
                <Text style={styles.exampleAmountTotal}>
                  ₱{(1000 * (earningsSummary?.shopPercentage || 37) / 100).toFixed(0)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowBreakdown(false)}>
              <Text style={styles.modalCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  badgeContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeText: {
    ...typography.body,
    color: colors.primary,
    flex: 1,
  },
  percentageBadge: {
    backgroundColor: colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  percentageText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
  therapistCount: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 4,
  },
  // Wallet Button
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletButtonText: {
    flex: 1,
  },
  walletButtonTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  walletButtonSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    flexGrow: 1,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  itemMain: {
    flex: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  itemSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  breakdownContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breakdownText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  itemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  itemPercentage: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  breakdownSection: {
    marginBottom: spacing.lg,
  },
  breakdownLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText2: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  therapistInfo: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  splitItem: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  splitItemHighlight: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  splitPercentage: {
    ...typography.h2,
    color: colors.textSecondary,
  },
  splitPercentageHighlight: {
    color: colors.primary,
  },
  splitLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  splitLabelHighlight: {
    color: colors.primary,
  },
  exampleSection: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  exampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  exampleRowTotal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exampleText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  exampleAmount: {
    ...typography.body,
    color: colors.error,
  },
  exampleTextTotal: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  exampleAmountTotal: {
    ...typography.body,
    color: colors.success,
    fontWeight: '700',
  },
  modalCloseButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '600',
  },
});
