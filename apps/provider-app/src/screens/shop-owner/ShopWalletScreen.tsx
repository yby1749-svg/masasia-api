import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography} from '@config/theme';
import {walletApi, type WalletBalance, type WalletTransaction} from '@api/wallet';

type PaymentMethod = 'gcash' | 'paymaya' | 'card';

export function ShopWalletScreen() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('gcash');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        walletApi.getShopBalance(),
        walletApi.getShopTransactions(),
      ]);
      setBalance(balanceRes.data.data);
      setTransactions(transactionsRes.data.data);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount < 100) {
      Alert.alert('Invalid Amount', 'Minimum top up amount is P100');
      return;
    }

    setIsProcessing(true);
    try {
      await walletApi.topUpShop({
        amount,
        method: selectedPaymentMethod,
        paymentRef: `TOPUP-${Date.now()}`,
      });

      Alert.alert('Success', 'Wallet topped up successfully!');
      setShowTopUpModal(false);
      setTopUpAmount('');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to top up wallet. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `P${amount.toLocaleString('en-PH', {minimumFractionDigits: 0})}`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'TOP_UP':
        return 'add-circle';
      case 'PLATFORM_FEE':
        return 'remove-circle';
      case 'PAYOUT':
        return 'arrow-up-circle';
      case 'EARNING':
        return 'trending-up';
      case 'REFUND':
        return 'refresh-circle';
      default:
        return 'ellipse';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'TOP_UP':
      case 'EARNING':
      case 'REFUND':
        return colors.success;
      case 'PLATFORM_FEE':
      case 'PAYOUT':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const renderTransaction = ({item}: {item: WalletTransaction}) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIcon}>
        <Icon
          name={getTransactionIcon(item.type)}
          size={24}
          color={getTransactionColor(item.type)}
        />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionType}>{item.type.replace('_', ' ')}</Text>
        {item.description && (
          <Text style={styles.transactionDescription}>{item.description}</Text>
        )}
        <Text style={styles.transactionDate}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          {color: getTransactionColor(item.type)},
        ]}>
        {item.type === 'TOP_UP' || item.type === 'EARNING' || item.type === 'REFUND'
          ? '+'
          : '-'}
        {formatCurrency(Math.abs(item.amount))}
      </Text>
    </View>
  );

  const quickAmounts = [1000, 2000, 5000, 10000];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Icon name="business" size={24} color={colors.primary} />
            <Text style={styles.balanceLabel}>Shop Wallet Balance</Text>
          </View>
          <Text style={styles.balanceAmount}>
            {formatCurrency(balance?.balance || 0)}
          </Text>
          <TouchableOpacity
            style={styles.topUpButton}
            onPress={() => setShowTopUpModal(true)}>
            <Icon name="add" size={20} color={colors.textInverse} />
            <Text style={styles.topUpButtonText}>Top Up</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Icon name="information-circle" size={20} color={colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Shop Wallet for Cash Bookings</Text>
            <Text style={styles.infoText}>
              When your therapists accept cash payment bookings, the 8% platform fee
              will be automatically deducted from this wallet. Keep your wallet
              funded to ensure smooth operations.
            </Text>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="receipt-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              renderItem={renderTransaction}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Top Up Modal */}
      <Modal
        visible={showTopUpModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTopUpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Shop Wallet</Text>
              <TouchableOpacity onPress={() => setShowTopUpModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <Text style={styles.inputLabel}>Amount</Text>
            <View style={styles.amountInput}>
              <Text style={styles.currencyPrefix}>P</Text>
              <TextInput
                style={styles.amountTextInput}
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textLight}
              />
            </View>

            {/* Quick Amount Buttons */}
            <View style={styles.quickAmounts}>
              {quickAmounts.map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.quickAmountButton,
                    topUpAmount === amount.toString() && styles.quickAmountSelected,
                  ]}
                  onPress={() => setTopUpAmount(amount.toString())}>
                  <Text
                    style={[
                      styles.quickAmountText,
                      topUpAmount === amount.toString() && styles.quickAmountTextSelected,
                    ]}>
                    P{amount.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment Method */}
            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {(['gcash', 'paymaya', 'card'] as PaymentMethod[]).map(method => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethod,
                    selectedPaymentMethod === method && styles.paymentMethodSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethod(method)}>
                  <Icon
                    name={
                      method === 'card'
                        ? 'card'
                        : method === 'gcash'
                        ? 'phone-portrait'
                        : 'wallet'
                    }
                    size={20}
                    color={
                      selectedPaymentMethod === method
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.paymentMethodText,
                      selectedPaymentMethod === method && styles.paymentMethodTextSelected,
                    ]}>
                    {method === 'gcash'
                      ? 'GCash'
                      : method === 'paymaya'
                      ? 'PayMaya'
                      : 'Card'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
              onPress={handleTopUp}
              disabled={isProcessing}>
              <Text style={styles.submitButtonText}>
                {isProcessing ? 'Processing...' : 'Top Up Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  balanceLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  topUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 24,
    gap: spacing.xs,
  },
  topUpButtonText: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    gap: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  historySection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    ...typography.body,
    fontWeight: '500',
    color: colors.text,
  },
  transactionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionDate: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: 2,
  },
  transactionAmount: {
    ...typography.body,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAmountSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  quickAmountText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  quickAmountTextSelected: {
    color: colors.primary,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentMethod: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethodSelected: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  paymentMethodText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  paymentMethodTextSelected: {
    color: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '600',
  },
});
