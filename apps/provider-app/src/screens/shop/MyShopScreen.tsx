import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import {Card} from '@components';
import {useProviderShopStore} from '@store';
import {colors, typography, spacing, borderRadius} from '@config/theme';

export function MyShopScreen() {
  const navigation = useNavigation();
  const {myShop, invitations, isLoading, fetchMyShop, fetchInvitations, leaveShop} =
    useProviderShopStore();

  useEffect(() => {
    fetchMyShop();
    fetchInvitations();
  }, [fetchMyShop, fetchInvitations]);

  const handleLeaveShop = () => {
    Alert.alert(
      'Leave Shop',
      'Are you sure you want to leave this shop? Your earnings will be managed individually after leaving.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveShop();
              Alert.alert('Success', 'You have left the shop');
            } catch {
              Alert.alert('Error', 'Failed to leave shop');
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Shop Info or No Shop */}
      {myShop ? (
        <Card style={styles.shopCard}>
          <View style={styles.shopHeader}>
            <View style={styles.shopIcon}>
              <Icon name="storefront" size={32} color={colors.primary} />
            </View>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName}>{myShop.name}</Text>
              <Text style={styles.shopOwner}>
                Owner: {myShop.owner?.firstName} {myShop.owner?.lastName}
              </Text>
            </View>
          </View>

          {myShop.description && (
            <Text style={styles.description}>{myShop.description}</Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{myShop._count?.therapists || 0}</Text>
              <Text style={styles.statLabel}>Therapists</Text>
            </View>
          </View>

          <View style={styles.infoNote}>
            <Icon name="information-circle" size={20} color={colors.info} />
            <Text style={styles.infoText}>
              Your earnings are managed by the shop owner. Contact your shop for
              payment details.
            </Text>
          </View>

          <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveShop}>
            <Icon name="exit-outline" size={20} color={colors.error} />
            <Text style={styles.leaveButtonText}>Leave Shop</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <Card style={styles.noShopCard}>
          <Icon name="storefront-outline" size={48} color={colors.textLight} />
          <Text style={styles.noShopTitle}>Not Part of a Shop</Text>
          <Text style={styles.noShopText}>
            You're currently working as an independent provider. If you receive an
            invitation from a shop, you can join and have your earnings managed by
            the shop owner.
          </Text>
        </Card>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <View style={styles.invitationsSection}>
          <Text style={styles.sectionTitle}>Pending Invitations</Text>
          {invitations.map(invitation => (
            <TouchableOpacity
              key={invitation.id}
              onPress={() =>
                (navigation as any).navigate('ShopInvitations')
              }>
              <Card style={styles.invitationCard}>
                <View style={styles.invitationInfo}>
                  <Text style={styles.invitationShopName}>
                    {invitation.shop?.name}
                  </Text>
                  <Text style={styles.invitationExpiry}>
                    Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textLight} />
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  shopCard: {
    padding: spacing.lg,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shopIcon: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    ...typography.h2,
    color: colors.text,
  },
  shopOwner: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.info,
    flex: 1,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  leaveButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  noShopCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  noShopTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  noShopText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  invitationsSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  invitationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationShopName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  invitationExpiry: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
