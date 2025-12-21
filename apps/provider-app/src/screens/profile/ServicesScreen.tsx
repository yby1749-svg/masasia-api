import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';

import {Card, Button} from '@components';
import {providersApi} from '@api';
import {colors, typography, spacing, borderRadius, shadows} from '@config/theme';
import {getServiceImageByName} from '../../assets/images/services';
import type {ProviderService} from '@types';

interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  baseDuration: number;
}

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
  const queryClient = useQueryClient();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [price90, setPrice90] = useState('');
  const [price120, setPrice120] = useState('');

  // Fetch provider's current services
  const {
    data: myServices,
    isLoading: isLoadingMyServices,
    refetch: refetchMyServices,
  } = useQuery({
    queryKey: ['providerServices'],
    queryFn: async () => {
      const response = await providersApi.getServices();
      return response.data.data;
    },
  });

  // Fetch all available services
  const {data: allServices, isLoading: isLoadingAllServices} = useQuery({
    queryKey: ['allServices'],
    queryFn: async () => {
      const response = await providersApi.getAllServices();
      return response.data.data;
    },
  });

  // Add service mutation
  const addServiceMutation = useMutation({
    mutationFn: async (data: {serviceId: string; price60: number; price90?: number; price120?: number}) => {
      return providersApi.addService(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['providerServices']});
      setShowPriceModal(false);
      setSelectedService(null);
      setPrice90('');
      setPrice120('');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add service');
    },
  });

  // Remove service mutation
  const removeServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      return providersApi.removeService(serviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['providerServices']});
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to remove service');
    },
  });

  const handleImageError = (serviceId: string) => {
    setImageErrors(prev => ({...prev, [serviceId]: true}));
  };

  const isServiceEnabled = (serviceId: string) => {
    return myServices?.some((s: ProviderService) => s.serviceId === serviceId);
  };

  const getMyServiceData = (serviceId: string): ProviderService | undefined => {
    return myServices?.find((s: ProviderService) => s.serviceId === serviceId);
  };

  const handleToggleService = (service: Service) => {
    if (isServiceEnabled(service.id)) {
      // Remove service
      Alert.alert(
        'Remove Service',
        `Are you sure you want to remove "${service.name}" from your services?`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeServiceMutation.mutate(service.id),
          },
        ],
      );
    } else {
      // Add service - show price modal
      setSelectedService(service);
      setPrice90(service.basePrice.toString());
      setPrice120('');
      setShowPriceModal(true);
    }
  };

  const handleAddService = () => {
    if (!selectedService) return;

    const priceValue = parseInt(price90, 10);
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price for 90 minutes');
      return;
    }

    const price120Value = price120 ? parseInt(price120, 10) : undefined;

    addServiceMutation.mutate({
      serviceId: selectedService.id,
      price60: priceValue,
      price90: priceValue,
      price120: price120Value,
    });
  };

  const isLoading = isLoadingMyServices || isLoadingAllServices;

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetchMyServices} />
        }>
        <View style={styles.header}>
          <Text style={styles.title}>My Services</Text>
          <Text style={styles.subtitle}>
            Select the services you want to offer to customers
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.servicesList}>
            {allServices?.map((service: Service) => {
              const isEnabled = isServiceEnabled(service.id);
              const myServiceData = getMyServiceData(service.id);

              return (
                <Card
                  key={service.id}
                  style={[
                    styles.serviceCard,
                    isEnabled && styles.serviceCardEnabled,
                  ]}>
                  <View style={styles.serviceHeader}>
                    <View style={styles.serviceIcon}>
                      {!imageErrors[service.id] ? (
                        <Image
                          source={{uri: getServiceImageByName(service.name)}}
                          style={styles.serviceImage}
                          onError={() => handleImageError(service.id)}
                        />
                      ) : (
                        <Icon
                          name={getServiceIcon(service.name)}
                          size={24}
                          color={colors.primary}
                        />
                      )}
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.serviceDesc} numberOfLines={2}>
                        {service.description}
                      </Text>
                    </View>
                    <Switch
                      value={isEnabled}
                      onValueChange={() => handleToggleService(service)}
                      trackColor={{false: colors.border, true: colors.success}}
                      thumbColor={colors.card}
                      ios_backgroundColor={colors.border}
                      disabled={addServiceMutation.isPending || removeServiceMutation.isPending}
                    />
                  </View>

                  {isEnabled && myServiceData && (
                    <View style={styles.pricesContainer}>
                      <View style={styles.priceRow}>
                        <Text style={styles.durationLabel}>90 minutes</Text>
                        <Text style={styles.priceValue}>
                          ₱{myServiceData.price90 || myServiceData.price60}
                        </Text>
                      </View>
                      {myServiceData.price120 && (
                        <View style={styles.priceRow}>
                          <Text style={styles.durationLabel}>120 minutes</Text>
                          <Text style={styles.priceValue}>
                            ₱{myServiceData.price120}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.editPriceButton}
                        onPress={() => {
                          setSelectedService(service);
                          setPrice90((myServiceData.price90 || myServiceData.price60).toString());
                          setPrice120(myServiceData.price120?.toString() || '');
                          setShowPriceModal(true);
                        }}>
                        <Icon name="pencil-outline" size={14} color={colors.primary} />
                        <Text style={styles.editPriceText}>Edit Prices</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!isEnabled && (
                    <View style={styles.basePrice}>
                      <Text style={styles.basePriceLabel}>Base price from</Text>
                      <Text style={styles.basePriceValue}>₱{service.basePrice}</Text>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {myServices && myServices.length > 0 && (
          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <Icon name="checkmark-circle" size={24} color={colors.success} />
              <Text style={styles.summaryText}>
                You are offering {myServices.length} service{myServices.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Price Modal */}
      <Modal
        visible={showPriceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPriceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isServiceEnabled(selectedService?.id || '') ? 'Update' : 'Set'} Your Prices
              </Text>
              <TouchableOpacity
                onPress={() => setShowPriceModal(false)}
                style={styles.modalCloseButton}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedService && (
              <>
                <View style={styles.modalServiceInfo}>
                  <View style={styles.serviceIcon}>
                    <Image
                      source={{uri: getServiceImageByName(selectedService.name)}}
                      style={styles.serviceImage}
                    />
                  </View>
                  <Text style={styles.modalServiceName}>{selectedService.name}</Text>
                </View>

                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceInputLabel}>Price for 90 minutes *</Text>
                  <View style={styles.priceInputWrapper}>
                    <Text style={styles.currencySymbol}>₱</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={price90}
                      onChangeText={setPrice90}
                      keyboardType="numeric"
                      placeholder="Enter price"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>

                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceInputLabel}>Price for 120 minutes (optional)</Text>
                  <View style={styles.priceInputWrapper}>
                    <Text style={styles.currencySymbol}>₱</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={price120}
                      onChangeText={setPrice120}
                      keyboardType="numeric"
                      placeholder="Enter price"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setShowPriceModal(false)}
                    style={styles.modalButton}
                  />
                  <Button
                    title={isServiceEnabled(selectedService.id) ? 'Update' : 'Add Service'}
                    onPress={handleAddService}
                    loading={addServiceMutation.isPending}
                    style={styles.modalButton}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  servicesList: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
  },
  serviceCard: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  serviceCardEnabled: {
    borderColor: colors.success,
    backgroundColor: colors.success + '08',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: spacing.sm,
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
    marginTop: spacing.md,
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
  editPriceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  editPriceText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  basePrice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  basePriceLabel: {
    ...typography.bodySmall,
    color: colors.textLight,
  },
  basePriceValue: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summarySection: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  summaryText: {
    ...typography.body,
    color: colors.success,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalServiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  modalServiceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  priceInputContainer: {
    marginBottom: spacing.lg,
  },
  priceInputLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    ...typography.h3,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  priceInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});
