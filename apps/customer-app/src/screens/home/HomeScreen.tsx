import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
  ImageBackground,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import {servicesApi, providersApi} from '@api';
import {useAuthStore, useLocationStore, useNotificationStore} from '@store';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  gradients,
} from '@config/theme';
import {getServiceImageByName} from '../../assets/images/services';
import type {HomeStackParamList} from '@navigation';
import type {Service, Provider} from '@types';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;
const {width} = Dimensions.get('window');

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {user} = useAuthStore();
  const {unreadCount} = useNotificationStore();
  const {requestPermission, getCurrentLocation, latitude, longitude} =
    useLocationStore();

  useEffect(() => {
    const initLocation = async () => {
      await requestPermission();
      await getCurrentLocation();
    };
    initLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    data: services,
    isLoading: servicesLoading,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await servicesApi.getServices();
      return response.data.data;
    },
  });

  const {
    data: featuredProviders,
    isLoading: providersLoading,
    refetch: refetchProviders,
  } = useQuery({
    queryKey: ['featuredProviders', latitude, longitude],
    queryFn: async () => {
      const response = await providersApi.getProviders({
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        limit: 5,
      });
      return response.data.data;
    },
    enabled: true,
  });

  const isLoading = servicesLoading || providersLoading;

  const onRefresh = async () => {
    await Promise.all([refetchServices(), refetchProviders()]);
  };

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

  // Image loading state for fallback
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (serviceId: string) => {
    setImageErrors(prev => ({...prev, [serviceId]: true}));
  };

  return (
    <View style={styles.container}>
      {/* Hero Header with Gradient */}
      <LinearGradient
        colors={gradients.hero as [string, string, string]}
        style={styles.heroGradient}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.greeting}>
                Hello, {user?.firstName || 'there'}!
              </Text>
              <Text style={styles.subtitle}>
                Ready for a relaxing massage?
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => (navigation as any).navigate('InboxTab')}>
              <View style={styles.notificationIconContainer}>
                <Icon name="notifications" size={22} color={colors.text} />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate('ProviderList', {})}>
            <Icon name="search" size={22} color={colors.primary} />
            <Text style={styles.searchPlaceholder}>
              Find your perfect therapist...
            </Text>
            <View style={styles.searchFilter}>
              <Icon name="options-outline" size={18} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        {/* Services Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Our Services</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesScroll}>
            {services?.map((service: Service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate('ProviderList', {serviceId: service.id})
                }>
                <View style={styles.serviceImageContainer}>
                  {!imageErrors[service.id] ? (
                    <Image
                      source={{uri: getServiceImageByName(service.name)}}
                      style={styles.serviceImage}
                      onError={() => handleImageError(service.id)}
                    />
                  ) : (
                    <LinearGradient
                      colors={[colors.primarySoft, colors.surface]}
                      style={styles.serviceImageFallback}>
                      <Icon
                        name={getServiceIcon(service.name)}
                        size={32}
                        color={colors.primary}
                      />
                    </LinearGradient>
                  )}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={styles.serviceImageOverlay}
                  />
                  <View style={styles.servicePriceBadge}>
                    <Text style={styles.servicePriceBadgeText}>
                      ₱{service.basePrice90}
                    </Text>
                  </View>
                </View>
                <View style={styles.serviceCardContent}>
                  <Text style={styles.serviceName} numberOfLines={2}>
                    {service.name}
                  </Text>
                  <Text style={styles.serviceDescription} numberOfLines={1}>
                    90 min session
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Providers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Therapists</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProviderList', {})}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {featuredProviders?.map((provider: Provider) => (
            <TouchableOpacity
              key={provider.id}
              style={styles.providerCard}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('ProviderDetail', {providerId: provider.id})
              }>
              {provider.photoUrl ? (
                <Image
                  source={{uri: provider.photoUrl}}
                  style={styles.providerAvatarImage}
                />
              ) : (
                <View style={styles.providerAvatar}>
                  <Icon name="person" size={28} color={colors.primary} />
                </View>
              )}
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{provider.displayName}</Text>
                <View style={styles.providerMeta}>
                  <View style={styles.ratingBadge}>
                    <Icon name="star" size={12} color={colors.primary} />
                    <Text style={styles.providerRating}>
                      {provider.rating.toFixed(1)}
                    </Text>
                  </View>
                  <Text style={styles.providerReviews}>
                    {provider.totalReviews} reviews
                  </Text>
                </View>
                {(provider as any).services && (provider as any).services.length > 0 && (
                  <Text style={styles.providerServices} numberOfLines={1}>
                    {(provider as any).services
                      .slice(0, 2)
                      .map((s: {service?: {name?: string}}) => s.service?.name)
                      .filter(Boolean)
                      .join(' • ')}
                  </Text>
                )}
              </View>
              <View style={styles.arrowButton}>
                <Icon name="chevron-forward" size={20} color={colors.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Spacer */}
        <View style={{height: spacing.xxl}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroGradient: {
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    ...typography.h2,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  notificationButton: {
    marginLeft: spacing.md,
  },
  notificationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.card,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
    ...shadows.md,
  },
  searchPlaceholder: {
    flex: 1,
    ...typography.body,
    color: colors.textLight,
  },
  searchFilter: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  seeAll: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
  },
  servicesScroll: {
    paddingRight: spacing.lg,
  },
  serviceCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    marginRight: spacing.md,
    width: 160,
    overflow: 'hidden',
    ...shadows.card,
  },
  serviceImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  serviceImageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  servicePriceBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  servicePriceBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  serviceCardContent: {
    padding: spacing.md,
  },
  serviceName: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  serviceDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  providerAvatar: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.xl,
  },
  providerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  providerName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  providerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  providerRating: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  providerReviews: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  providerServices: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
