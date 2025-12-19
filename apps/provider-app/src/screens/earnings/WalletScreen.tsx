import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {format} from 'date-fns';

import {walletApi, WalletBalance, WalletTransaction} from '@api';
import {colors, typography, spacing} from '@config/theme';

type PaymentMethod = 'GCASH' | 'PAYMAYA' | 'CARD';

export function WalletScreen() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTopUpLoading, setIsTopUpLoading] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpMethod, setTopUpMethod] = useState<PaymentMethod>('GCASH');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        walletApi.getProviderBalance(),
        walletApi.getProviderTransactions(),
      ]);
      setBalance(balanceRes.data.data);
      setTransactions(transactionsRes.data.data);
    } catch (error) {
      console.error('Failed to fetch wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount < 100) {
      Alert.alert('Error', 'Minimum top-up amount is P100');
      return;
    }

    setIsTopUpLoading(true);
    try {
      await walletApi.topUpProvider({
        amount,
        paymentMethod: topUpMethod,
        paymentRef: `TOP-${Date.now()}`,
      });
      Alert.alert('Success', `Wallet topped up with P${amount.toLocaleString()}`);
      setShowTopUp(false);
      setTopUpAmount('');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to top up wallet');
    } finally {
      setIsTopUpLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'TOP_UP':
        return {name: 'add-circle', color: colors.success};
      case 'PLATFORM_FEE':
        return {name: 'remove-circle', color: colors.error};
      case 'EARNING':
        return {name: 'cash', color: colors.success};
      case 'PAYOUT':
        return {name: 'arrow-up-circle', color: colors.warning};
      default:
        return {name: 'swap-horizontal', color: colors.textSecondary};
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'TOP_UP':
        return 'Wallet Top-up';
      case 'PLATFORM_FEE':
        return 'Platform Fee (8%)';
      case 'EARNING':
        return 'Booking Earning';
      case 'PAYOUT':
        return 'Payout';
      case 'REFUND':
        return 'Refund';
      case 'ADJUSTMENT':
        return 'Adjustment';
      default:
        return type;
    }
  };

  const renderTransaction = ({item}: {item: WalletTransaction}) => {
    const icon = getTransactionIcon(item.type);
    const isPositive = item.amount > 0;

    return (
      <View style={styles.transactionItem}>
        <View style={[styles.transactionIcon, {backgroundColor: icon.color + '20'}]}>
          <Icon name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionLabel}>{getTransactionLabel(item.type)}</Text>
          <Text style={styles.transactionDate}>
            {format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}
          </Text>
          {item.description && (
            <Text style={styles.transactionDesc}>{item.description}</Text>
          )}
        </View>
        <Text style={[styles.transactionAmount, isPositive ? styles.positive : styles.negative]}>
          {isPositive ? '+' : ''}P{Math.abs(item.amount).toLocaleString()}
        </Text>
      </View>
    );
  };

  if (isLoading && !balance) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchData} />
        }>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balanceAmount}>
            P{balance?.balance.toLocaleString() || '0'}
          </Text>
          <View style={styles.balanceInfo}>
            <View style={styles.infoItem}>
              <Icon name="information-circle" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.infoText}>
                Platform fee: {balance?.platformFeePercentage || 8}% deducted for cash bookings
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.topUpButton}
            onPress={() => setShowTopUp(true)}>
            <Icon name="add-circle" size={20} color={colors.primary} />
            <Text style={styles.topUpButtonText}>Top Up Wallet</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Earnings</Text>
            <Text style={styles.statValue}>
              P{balance?.totalEarnings.toLocaleString() || '0'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending Top-ups</Text>
            <Text style={styles.statValue}>
              P{balance?.pendingTopUps.toLocaleString() || '0'}
            </Text>
          </View>
        </View>

        {/* How it Works */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>How Wallet Works</Text>
          <View style={styles.infoRow}>
            <Icon name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.infoRowText}>
              For CASH bookings, 8% platform fee is deducted from your wallet when you accept
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.infoRowText}>
              Top up your wallet via GCash, PayMaya, or Card to accept cash bookings
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.infoRowText}>
              Online payments (GCash/Card) don't require wallet balance
            </Text>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="receipt-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map(item => (
              <View key={item.id}>{renderTransaction({item})}</View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Top Up Modal */}
      {showTopUp && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Wallet</Text>
              <TouchableOpacity onPress={() => setShowTopUp(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>P</Text>
              <TextInput
                style={styles.amountInput}
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.quickAmounts}>
              {[500, 1000, 2000, 5000].map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => setTopUpAmount(amount.toString())}>
                  <Text style={styles.quickAmountText}>P{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.methodsContainer}>
              {(['GCASH', 'PAYMAYA', 'CARD'] as PaymentMethod[]).map(method => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodButton,
                    topUpMethod === method && styles.methodButtonActive,
                  ]}
                  onPress={() => setTopUpMethod(method)}>
                  <Icon
                    name={method === 'CARD' ? 'card' : 'phone-portrait'}
                    size={20}
                    color={topUpMethod === method ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.methodText,
                      topUpMethod === method && styles.methodTextActive,
                    ]}>
                    {method === 'CARD' ? 'Card' : method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, isTopUpLoading && styles.confirmButtonDisabled]}
              onPress={handleTopUp}
              disabled={isTopUpLoading}>
              {isTopUpLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Top Up</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    backgroundColor: colors.primary,
    margin: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
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
    marginBottom: spacing.md,
  },
  balanceInfo: {
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  topUpButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    marginTop: 0,
    borderRadius: 12,
    padding: spacing.md,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  infoRowText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  transactionsSection: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: spacing.md,
    marginLeft: spacing.sm,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  methodsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  methodText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  methodTextActive: {
    color: colors.primary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
