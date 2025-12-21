import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, RefreshControl, Image} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';

import {Card} from '@components';
import {providersApi} from '@api';
import {colors, typography, spacing, borderRadius} from '@config/theme';
import {getServiceImageByName} from '../../assets/images/services';
import type {ProviderService} from '@types';

const getServiceIcon = (serviceName: string) => {
  const name = serviceName.toLowerCase();
  if (name.includes('thai')) return 'body-outline';
  if (name.includes('swedish')) return 'leaf-outline';
  if (name.includes('deep')) return 'fitness-outline';
  if (name.includes('hot stone')) return 'flame-outline';
  if (name.includes('aromatherapy')) return 'flower-outline';
  if (name.includes('foot') || name.includes('reflexology')) return 'footsteps-outline';
  return 'hand-left-outline';
};

export function ServicesScreen() {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const {
    data: services,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['providerServices'],
    queryFn: async () => {
      const response = await providersApi.getServices();
      return response.data.data;
    },
  });

  const handleImageError = (serviceId: string) => {
    setImageErrors(prev => ({...prev, [serviceId]: true}));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }>
        <View style={styles.header}>
          <Text style={styles.title}>Services You Offer</Text>
          <Text style={styles.subtitle}>
            Manage the services and pricing you offer to customers
          </Text>
        </View>

        {services?.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="briefcase-outline" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No services added yet</Text>
            <Text style={styles.emptySubtext}>
              Contact support to add services to your profile
            </Text>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {services?.map((service: ProviderService) => (
              <Card key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceIcon}>
                    {!imageErrors[service.id] ? (
                      <Image
                        source={{uri: getServiceImageByName(service.service.name)}}
                        style={styles.serviceImage}
                        onError={() => handleImageError(service.id)}
                      />
                    ) : (
                      <Icon
                        name={getServiceIcon(service.service.name)}
                        size={24}
                        color={colors.primary}
                      />
                    )}
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>
                      {service.service.name}
                    </Text>
                    <Text style={styles.serviceDesc}>
                      {service.service.description}
                    </Text>
                  </View>
                </View>

                <View style={styles.pricesContainer}>
                  <View style={styles.priceRow}>
                    <Text style={styles.durationLabel}>90 minutes</Text>
                    <Text style={styles.priceValue}>
                      P{service.price90 || service.price60}
                    </Text>
                  </View>
                  {service.price120 && (
                    <View style={styles.priceRow}>
                      <Text style={styles.durationLabel}>120 minutes</Text>
                      <Text style={styles.priceValue}>P{service.price120}</Text>
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    service.isActive
                      ? styles.activeBadge
                      : styles.inactiveBadge,
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      service.isActive
                        ? styles.activeText
                        : styles.inactiveText,
                    ]}>
                    {service.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  servicesList: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
  },
  serviceCard: {},
  serviceHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  serviceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  serviceDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  pricesContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  durationLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  priceValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.success,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  activeBadge: {
    backgroundColor: colors.success + '20',
  },
  inactiveBadge: {
    backgroundColor: colors.textLight + '20',
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  activeText: {
    color: colors.success,
  },
  inactiveText: {
    color: colors.textLight,
  },
});
