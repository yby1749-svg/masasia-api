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
import Icon from 'react-native-vector-icons/Ionicons';

import {Card} from '@components';
import {useProviderShopStore} from '@store';
import {colors, typography, spacing, borderRadius} from '@config/theme';

export function ShopInvitationsScreen() {
  const {
    invitations,
    isLoading,
    fetchInvitations,
    acceptInvitation,
    rejectInvitation,
  } = useProviderShopStore();

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleAccept = async (invitationId: string, shopName: string) => {
    Alert.alert(
      'Accept Invitation',
      `Join ${shopName}? Your earnings will be managed by the shop owner.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await acceptInvitation(invitationId);
              Alert.alert('Success', `You have joined ${shopName}`);
            } catch {
              Alert.alert('Error', 'Failed to accept invitation');
            }
          },
        },
      ],
    );
  };

  const handleReject = async (invitationId: string) => {
    try {
      await rejectInvitation(invitationId);
    } catch {
      Alert.alert('Error', 'Failed to reject invitation');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (invitations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="mail-outline" size={64} color={colors.textLight} />
        <Text style={styles.emptyTitle}>No Invitations</Text>
        <Text style={styles.emptyText}>
          You don't have any pending shop invitations.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerText}>
        Shop owners can invite you to join their shop. When you join, your
        earnings from bookings will be managed by the shop.
      </Text>

      {invitations.map(invitation => (
        <Card key={invitation.id} style={styles.invitationCard}>
          <View style={styles.shopHeader}>
            <View style={styles.shopIcon}>
              <Icon name="storefront" size={24} color={colors.primary} />
            </View>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName}>{invitation.shop?.name}</Text>
              <Text style={styles.shopOwner}>
                by {invitation.shop?.owner?.firstName}{' '}
                {invitation.shop?.owner?.lastName}
              </Text>
            </View>
          </View>

          {invitation.message && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageLabel}>Message from owner:</Text>
              <Text style={styles.messageText}>{invitation.message}</Text>
            </View>
          )}

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Icon name="people-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                {invitation.shop?._count?.therapists || 0} therapists
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                Expires {new Date(invitation.expiresAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => handleReject(invitation.id)}>
              <Text style={styles.rejectButtonText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() =>
                handleAccept(invitation.id, invitation.shop?.name || 'Shop')
              }>
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  headerText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  invitationCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shopIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    ...typography.h3,
    color: colors.text,
  },
  shopOwner: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  messageContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  messageLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  messageText: {
    ...typography.body,
    color: colors.text,
  },
  metaInfo: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  rejectButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  acceptButtonText: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '600',
  },
});
