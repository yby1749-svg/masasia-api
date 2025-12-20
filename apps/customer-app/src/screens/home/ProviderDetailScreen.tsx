import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  Linking,
  TouchableOpacity,
  Modal,
  StatusBar,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useQuery} from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/Ionicons';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';

import {providersApi} from '@api';
import {Button} from '@components';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@config/theme';
import type {HomeStackParamList} from '@navigation';
import type {ProviderService, Review} from '@types';

const {width} = Dimensions.get('window');
const MAP_HEIGHT = 180;

type RouteProps = RouteProp<HomeStackParamList, 'ProviderDetail'>;
type NavigationProps = NativeStackNavigationProp<HomeStackParamList, 'ProviderDetail'>;

export function ProviderDetailScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const {providerId} = route.params;
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const {data: provider, isLoading} = useQuery({
    queryKey: ['provider', providerId],
    queryFn: async () => {
      const response = await providersApi.getProvider(providerId);
      return response.data.data;
    },
  });

  const {data: reviews} = useQuery({
    queryKey: ['providerReviews', providerId],
    queryFn: async () => {
      const response = await providersApi.getProviderReviews(providerId);
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Provider not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Photo Fullscreen Modal */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowPhotoModal(false)}>
            <Icon name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {provider.photoUrl && (
            <Image
              source={{uri: provider.photoUrl}}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
          <View style={styles.modalInfo}>
            <Text style={styles.modalName}>{provider.displayName}</Text>
            <View style={styles.modalRating}>
              <Icon name="star" size={16} color={colors.warning} />
              <Text style={styles.modalRatingText}>
                {provider.rating.toFixed(1)} ({provider.totalReviews} reviews)
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          {provider.photoUrl ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setShowPhotoModal(true)}>
              <Image
                source={{uri: provider.photoUrl}}
                style={styles.avatarImage}
              />
              <View style={styles.zoomBadge}>
                <Icon name="expand-outline" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.avatar}>
              <Icon name="person" size={48} color={colors.textLight} />
            </View>
          )}
          <Text style={styles.name}>{provider.displayName}</Text>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={18} color={colors.warning} />
            <Text style={styles.rating}>{provider.rating.toFixed(1)}</Text>
            <Text style={styles.reviews}>
              ({provider.totalReviews} reviews)
            </Text>
          </View>
          {provider.bio && <Text style={styles.bio}>{provider.bio}</Text>}
        </View>

        {/* Location Map */}
        {provider.lastLatitude && provider.lastLongitude && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={{
                  latitude: provider.lastLatitude,
                  longitude: provider.lastLongitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}>
                <Marker
                  coordinate={{
                    latitude: provider.lastLatitude,
                    longitude: provider.lastLongitude,
                  }}
                  title={provider.displayName}
                  description="Therapist location">
                  <View style={styles.markerContainer}>
                    <View style={styles.marker}>
                      <Icon name="person" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                </Marker>
              </MapView>
              <TouchableOpacity
                style={styles.directionsButton}
                onPress={() => {
                  const lat = provider.lastLatitude!;
                  const lng = provider.lastLongitude!;
                  const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
                  const url =
                    Platform.OS === 'ios'
                      ? `${scheme}?daddr=${lat},${lng}`
                      : `${scheme}${lat},${lng}?q=${lat},${lng}`;
                  Linking.openURL(url);
                }}>
                <Icon name="navigate" size={18} color={colors.primary} />
                <Text style={styles.directionsText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          {provider.services?.map((ps: ProviderService) => (
            <View key={ps.id} style={styles.serviceCard}>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{ps.service.name}</Text>
                <Text style={styles.serviceDesc}>{ps.service.description}</Text>
              </View>
              <View style={styles.servicePrices}>
                <Text style={styles.priceLabel}>
                  90 min: ₱{ps.price90 || ps.price60}
                </Text>
                {ps.price120 && (
                  <Text style={styles.priceLabel}>120 min: ₱{ps.price120}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Reviews */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          {reviews?.slice(0, 5).map((review: Review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>
                  {review.author.firstName}
                </Text>
                <View style={styles.reviewRating}>
                  <Icon name="star" size={14} color={colors.warning} />
                  <Text style={styles.reviewScore}>{review.rating}</Text>
                </View>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
            </View>
          ))}
          {(!reviews || reviews.length === 0) && (
            <Text style={styles.noReviews}>No reviews yet</Text>
          )}
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={styles.footer}>
        <Button
          title="Book Now"
          onPress={() => {
            navigation.navigate('BookingFlow', {providerId});
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  header: {
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    color: colors.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  rating: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  reviews: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  bio: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  serviceDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  servicePrices: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    ...typography.bodySmall,
    color: colors.text,
  },
  reviewCard: {
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reviewScore: {
    ...typography.bodySmall,
    color: colors.text,
  },
  reviewComment: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  noReviews: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  mapContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  map: {
    width: '100%',
    height: MAP_HEIGHT,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadows.md,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  directionsText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
  },
  zoomBadge: {
    position: 'absolute',
    bottom: spacing.md + 4,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalImage: {
    width: width - 40,
    height: width - 40,
    borderRadius: borderRadius.xl,
  },
  modalInfo: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  modalName: {
    ...typography.h2,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  modalRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modalRatingText: {
    ...typography.body,
    color: '#FFFFFF',
  },
});
