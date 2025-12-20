import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useQueryClient} from '@tanstack/react-query';

import {Button, Card} from '@components';
import {useAuthStore} from '@store';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@config/theme';

const BID_PRESETS = [
  {value: 0, label: 'Free', description: 'Standard listing based on rating'},
  {value: 50, label: '₱50/day', description: 'Boost visibility slightly'},
  {value: 100, label: '₱100/day', description: 'Higher visibility in search'},
  {value: 200, label: '₱200/day', description: 'Top placement in search'},
  {value: 500, label: '₱500/day', description: 'Maximum visibility'},
];

export function PromotionScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const {provider, updateProfile} = useAuthStore();

  const [bidAmount, setBidAmount] = useState(provider?.promotionBid || 0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({promotionBid: bidAmount});
      queryClient.invalidateQueries({queryKey: ['provider']});
      Alert.alert(
        'Success',
        bidAmount > 0
          ? `Your promotion bid is set to ₱${bidAmount}/day. You will be charged daily while active.`
          : 'Promotion removed. Your listing will be ranked by rating only.',
      );
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update promotion');
    } finally {
      setSaving(false);
    }
  };

  const selectedPreset = BID_PRESETS.find(p => p.value === bidAmount);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Info */}
      <View style={styles.infoCard}>
        <Icon name="trending-up" size={48} color={colors.primary} />
        <Text style={styles.infoTitle}>Boost Your Visibility</Text>
        <Text style={styles.infoText}>
          Set a daily bid to appear higher in customer search results. Higher bids mean more visibility and potential bookings.
        </Text>
      </View>

      {/* Current Bid Display */}
      <Card style={styles.bidCard}>
        <Text style={styles.bidLabel}>Your Current Bid</Text>
        <Text style={styles.bidAmount}>
          {bidAmount > 0 ? `₱${bidAmount}` : 'Free'}
        </Text>
        <Text style={styles.bidFrequency}>
          {bidAmount > 0 ? 'per day' : 'Ranked by rating only'}
        </Text>
      </Card>

      {/* Custom Bid Input */}
      <View style={styles.customBidContainer}>
        <Text style={styles.sliderLabel}>Custom Amount</Text>
        <View style={styles.bidInputRow}>
          <TouchableOpacity
            style={styles.bidButton}
            onPress={() => setBidAmount(Math.max(0, bidAmount - 10))}>
            <Icon name="remove" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.bidInputWrapper}>
            <Text style={styles.currencyPrefix}>₱</Text>
            <TextInput
              style={styles.bidInput}
              value={String(bidAmount)}
              onChangeText={text => {
                const val = parseInt(text) || 0;
                setBidAmount(Math.min(500, Math.max(0, val)));
              }}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          <TouchableOpacity
            style={styles.bidButton}
            onPress={() => setBidAmount(Math.min(500, bidAmount + 10))}>
            <Icon name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.bidRangeHint}>Range: Free - ₱500/day</Text>
      </View>

      {/* Preset Options */}
      <Text style={styles.presetsTitle}>Quick Select</Text>
      <View style={styles.presets}>
        {BID_PRESETS.map(preset => (
          <TouchableOpacity
            key={preset.value}
            style={[
              styles.presetButton,
              bidAmount === preset.value && styles.presetButtonActive,
            ]}
            onPress={() => setBidAmount(preset.value)}>
            <Text
              style={[
                styles.presetLabel,
                bidAmount === preset.value && styles.presetLabelActive,
              ]}>
              {preset.label}
            </Text>
            <Text
              style={[
                styles.presetDesc,
                bidAmount === preset.value && styles.presetDescActive,
              ]}>
              {preset.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* How It Works */}
      <View style={styles.howItWorks}>
        <Text style={styles.howItWorksTitle}>How It Works</Text>
        <View style={styles.howItWorksItem}>
          <Icon name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.howItWorksText}>
            Higher bids appear first in search results
          </Text>
        </View>
        <View style={styles.howItWorksItem}>
          <Icon name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.howItWorksText}>
            Charged daily from your wallet balance
          </Text>
        </View>
        <View style={styles.howItWorksItem}>
          <Icon name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.howItWorksText}>
            Change or cancel anytime
          </Text>
        </View>
        <View style={styles.howItWorksItem}>
          <Icon name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.howItWorksText}>
            Rating still matters for tie-breakers
          </Text>
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          title={bidAmount > 0 ? `Set Bid: ₱${bidAmount}/day` : 'Remove Promotion'}
          onPress={handleSave}
          loading={saving}
        />
      </View>
    </ScrollView>
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
  infoCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bidCard: {
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  bidLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bidAmount: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '700',
  },
  bidFrequency: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  customBidContainer: {
    marginBottom: spacing.xl,
  },
  sliderLabel: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  bidInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  bidButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  bidInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  currencyPrefix: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '600',
  },
  bidInput: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  bidRangeHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  presetsTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  presets: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  presetButton: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.divider,
    ...shadows.sm,
  },
  presetButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  presetLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  presetLabelActive: {
    color: colors.primary,
  },
  presetDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  presetDescActive: {
    color: colors.primaryDark,
  },
  howItWorks: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  howItWorksTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  howItWorksText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  footer: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
