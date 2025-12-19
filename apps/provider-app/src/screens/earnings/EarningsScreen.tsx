import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import {format} from 'date-fns';

import {Button, Card} from '@components';
import {useEarningsStore} from '@store';
import {colors, typography, spacing} from '@config/theme';
import {MIN_PAYOUT_AMOUNT} from '@config/constants';
import type {EarningsStackParamList, Earning} from '@types';

type NavigationProp = NativeStackNavigationProp<
  EarningsStackParamList,
  'Earnings'
>;

export function EarningsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {summary, earnings, isLoading, fetchSummary, fetchEarnings} =
    useEarningsStore();
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    fetchSummary();
    fetchEarnings();
  }, [fetchSummary, fetchEarnings]);

  const onRefresh = async () => {
    await Promise.all([fetchSummary(), fetchEarnings()]);
  };

  const canRequestPayout =
    summary && summary.availableBalance >= MIN_PAYOUT_AMOUNT;

  const isIndependent = summary?.providerType === 'independent';

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }>
        {/* Provider Type Badge */}
        <TouchableOpacity
          style={styles.providerTypeBadge}
          onPress={() => setShowBreakdown(true)}>
          <View style={[
            styles.badgeContainer,
            isIndependent ? styles.badgeIndependent : styles.badgeShop
          ]}>
            <Icon
              name={isIndependent ? 'person' : 'business'}
              size={16}
              color={isIndependent ? colors.success : colors.primary}
            />
            <Text style={[
              styles.badgeText,
              isIndependent ? styles.badgeTextIndependent : styles.badgeTextShop
            ]}>
              {isIndependent ? 'Independent' : summary?.shopName || 'Shop'}
            </Text>
            <View style={[
              styles.percentageBadge,
              isIndependent ? styles.percentageIndependent : styles.percentageShop
            ]}>
              <Text style={styles.percentageText}>
                {summary?.earningsPercentage || (isIndependent ? 92 : 55)}%
              </Text>
            </View>
            <Icon name="information-circle-outline" size={16} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Today</Text>
              <Text style={styles.summaryValue}>
                P{summary?.today?.toLocaleString() || '0'}
              </Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>This Week</Text>
              <Text style={styles.summaryValue}>
                P{summary?.thisWeek?.toLocaleString() || '0'}
              </Text>
            </Card>
          </View>
          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>This Month</Text>
              <Text style={styles.summaryValue}>
                P{summary?.thisMonth?.toLocaleString() || '0'}
              </Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Earned</Text>
              <Text style={styles.summaryValue}>
                P{summary?.totalEarned?.toLocaleString() || '0'}
              </Text>
            </Card>
          </View>
        </View>

        {/* Available Balance */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceValue}>
                P{summary?.availableBalance?.toLocaleString() || '0'}
              </Text>
            </View>
            <Button
              title="Request Payout"
              size="sm"
              disabled={!canRequestPayout}
              onPress={() => navigation.navigate('PayoutRequest')}
            />
          </View>
          {!canRequestPayout && (
            <Text style={styles.minPayoutNote}>
              Minimum payout amount: P{MIN_PAYOUT_AMOUNT}
            </Text>
          )}
        </Card>

        {/* Pending Balance */}
        {summary?.pendingBalance !== undefined &&
          summary.pendingBalance > 0 && (
            <Card style={styles.pendingCard}>
              <Icon name="time-outline" size={20} color={colors.warning} />
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingLabel}>Pending Balance</Text>
                <Text style={styles.pendingValue}>
                  P{summary.pendingBalance.toLocaleString()}
                </Text>
              </View>
            </Card>
          )}

        {/* Wallet Button */}
        <TouchableOpacity
          style={styles.walletButton}
          onPress={() => navigation.navigate('Wallet')}>
          <View style={styles.walletButtonContent}>
            <Icon name="wallet" size={24} color={colors.primary} />
            <View style={styles.walletButtonText}>
              <Text style={styles.walletButtonTitle}>My Wallet</Text>
              <Text style={styles.walletButtonSubtitle}>
                Top up for cash bookings
              </Text>
            </View>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Earnings History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Earnings</Text>

          {earnings.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="wallet-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No earnings yet</Text>
            </View>
          ) : (
            earnings.map((earning: Earning) => (
              <Card key={earning.id} style={styles.earningCard}>
                <View style={styles.earningInfo}>
                  <Text style={styles.earningService}>
                    {earning.booking?.service?.name || 'Service'}
                  </Text>
                  <Text style={styles.earningDate}>
                    {earning.createdAt ? format(new Date(earning.createdAt), 'MMM d, yyyy') : 'N/A'}
                  </Text>
                  {/* Show breakdown */}
                  <View style={styles.earningBreakdown}>
                    <Text style={styles.breakdownText}>
                      Service: P{earning.amount?.toLocaleString()}
                    </Text>
                    <Text style={styles.breakdownText}>
                      Platform ({summary?.platformPercentage || 8}%): -P{earning.platformFee?.toLocaleString() || '0'}
                    </Text>
                    {!isIndependent && earning.shopFee ? (
                      <Text style={styles.breakdownText}>
                        Shop ({summary?.shopPercentage || 37}%): -P{earning.shopFee?.toLocaleString()}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.earningAmounts}>
                  <Text style={styles.earningGross}>
                    P{earning.netAmount?.toLocaleString()}
                  </Text>
                  <Text style={styles.earningPercentage}>
                    ({summary?.earningsPercentage || (isIndependent ? 92 : 55)}%)
                  </Text>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

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
            <Text style={styles.modalTitle}>Earnings Breakdown</Text>

            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownLabel}>Your Status</Text>
              <View style={styles.statusRow}>
                <Icon
                  name={isIndependent ? 'person' : 'business'}
                  size={24}
                  color={isIndependent ? colors.success : colors.primary}
                />
                <Text style={styles.statusText}>
                  {isIndependent ? 'Independent Therapist' : `${summary?.shopName || 'Shop'} Therapist`}
                </Text>
              </View>
            </View>

            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownLabel}>Revenue Split</Text>
              <View style={styles.splitRow}>
                <View style={styles.splitItem}>
                  <Text style={styles.splitPercentage}>{summary?.platformPercentage || 8}%</Text>
                  <Text style={styles.splitLabel}>Platform</Text>
                </View>
                {!isIndependent && (
                  <View style={styles.splitItem}>
                    <Text style={styles.splitPercentage}>{summary?.shopPercentage || 37}%</Text>
                    <Text style={styles.splitLabel}>Shop</Text>
                  </View>
                )}
                <View style={[styles.splitItem, styles.splitItemHighlight]}>
                  <Text style={[styles.splitPercentage, styles.splitPercentageHighlight]}>
                    {summary?.earningsPercentage || (isIndependent ? 92 : 55)}%
                  </Text>
                  <Text style={[styles.splitLabel, styles.splitLabelHighlight]}>You</Text>
                </View>
              </View>
            </View>

            <View style={styles.exampleSection}>
              <Text style={styles.breakdownLabel}>Example (P1,000 service)</Text>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleText}>Platform Fee:</Text>
                <Text style={styles.exampleAmount}>-P{(1000 * (summary?.platformPercentage || 8) / 100).toFixed(0)}</Text>
              </View>
              {!isIndependent && (
                <View style={styles.exampleRow}>
                  <Text style={styles.exampleText}>Shop Fee:</Text>
                  <Text style={styles.exampleAmount}>-P{(1000 * (summary?.shopPercentage || 37) / 100).toFixed(0)}</Text>
                </View>
              )}
              <View style={[styles.exampleRow, styles.exampleRowTotal]}>
                <Text style={styles.exampleTextTotal}>Your Earnings:</Text>
                <Text style={styles.exampleAmountTotal}>
                  P{(1000 * (summary?.earningsPercentage || (isIndependent ? 92 : 55)) / 100).toFixed(0)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summaryContainer: {
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xs,
  },
  balanceCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.primary,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    ...typography.body,
    color: colors.textInverse,
    opacity: 0.8,
  },
  balanceValue: {
    ...typography.h1,
    color: colors.textInverse,
    marginTop: spacing.xs,
  },
  minPayoutNote: {
    ...typography.caption,
    color: colors.textInverse,
    opacity: 0.7,
    marginTop: spacing.sm,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  pendingInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  pendingLabel: {
    ...typography.bodySmall,
    color: colors.warning,
  },
  pendingValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  // Wallet Button
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  historySection: {
    padding: spacing.lg,
  },
  sectionTitle: {
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
  earningCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  earningInfo: {
    flex: 1,
  },
  earningService: {
    ...typography.body,
    fontWeight: '500',
    color: colors.text,
  },
  earningDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  earningAmounts: {
    alignItems: 'flex-end',
  },
  earningGross: {
    ...typography.body,
    fontWeight: '600',
    color: colors.success,
  },
  earningNet: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  // Provider Type Badge
  providerTypeBadge: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  badgeIndependent: {
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  badgeShop: {
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  badgeText: {
    ...typography.body,
    flex: 1,
  },
  badgeTextIndependent: {
    color: colors.success,
  },
  badgeTextShop: {
    color: colors.primary,
  },
  percentageBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
  },
  percentageIndependent: {
    backgroundColor: colors.success,
  },
  percentageShop: {
    backgroundColor: colors.primary,
  },
  percentageText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '700',
  },
  // Earnings breakdown in card
  earningBreakdown: {
    marginTop: spacing.xs,
  },
  breakdownText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  earningPercentage: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
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
  statusText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
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
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  splitPercentage: {
    ...typography.h2,
    color: colors.textSecondary,
  },
  splitPercentageHighlight: {
    color: colors.success,
  },
  splitLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  splitLabelHighlight: {
    color: colors.success,
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
