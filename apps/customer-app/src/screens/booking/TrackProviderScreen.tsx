import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import {useRoute, RouteProp} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/Ionicons';
import {showLocation} from 'react-native-map-link';

import {bookingsApi} from '@api';
import {socketService} from '@services/socket';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@config/theme';
import type {BookingsStackParamList} from '@navigation';

type RouteProps = RouteProp<BookingsStackParamList, 'TrackProvider'>;

interface ProviderLocation {
  latitude: number;
  longitude: number;
  eta: number;
  updatedAt: string;
}

export function TrackProviderScreen() {
  const route = useRoute<RouteProps>();
  const {bookingId} = route.params;
  const mapRef = useRef<MapView>(null);

  const [providerLocation, setProviderLocation] = useState<ProviderLocation | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const {data: booking, isLoading} = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await bookingsApi.getBooking(bookingId);
      return response.data.data;
    },
  });

  // Connect to socket and join booking room
  useEffect(() => {
    const setupSocket = async () => {
      await socketService.connect();
      socketService.joinBooking(bookingId);
      setIsConnected(true);

      // Listen for provider location updates
      socketService.onProviderLocation((data) => {
        console.log('[Track] Provider location update:', data);
        setProviderLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          eta: (data as any).eta || 15,
          updatedAt: (data as any).updatedAt || new Date().toISOString(),
        });
      });
    };

    setupSocket();

    return () => {
      socketService.leaveBooking(bookingId);
      socketService.offProviderLocation();
    };
  }, [bookingId]);

  // Fit map to show both markers when provider location is available
  useEffect(() => {
    if (providerLocation && booking && mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          {latitude: providerLocation.latitude, longitude: providerLocation.longitude},
          {latitude: booking.latitude, longitude: booking.longitude},
        ],
        {
          edgePadding: {top: 100, right: 50, bottom: 200, left: 50},
          animated: true,
        },
      );
    }
  }, [providerLocation, booking]);

  const openInMaps = () => {
    if (!booking) return;

    showLocation({
      latitude: booking.latitude,
      longitude: booking.longitude,
      title: booking.addressText || 'Your Location',
      googleForceLatLon: true,
      alwaysIncludeGoogle: true,
      appsWhiteList: ['google-maps'],
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  const customerLocation = {
    latitude: booking.latitude,
    longitude: booking.longitude,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: customerLocation.latitude,
          longitude: customerLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        showsMyLocationButton={false}>
        {/* Customer/Destination Marker */}
        <Marker
          coordinate={customerLocation}
          title="Your Location"
          description={booking.addressText}>
          <View style={styles.destinationMarker}>
            <Icon name="home" size={20} color={colors.textInverse} />
          </View>
        </Marker>

        {/* Provider Marker */}
        {providerLocation && (
          <Marker
            coordinate={{
              latitude: providerLocation.latitude,
              longitude: providerLocation.longitude,
            }}
            title={booking.provider?.displayName || 'Therapist'}
            description={`ETA: ${providerLocation.eta} mins`}>
            <View style={styles.providerMarker}>
              <Icon name="person" size={20} color={colors.textInverse} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.providerInfo}>
          <View style={styles.providerAvatar}>
            <Icon name="person" size={24} color={colors.textLight} />
          </View>
          <View style={styles.providerDetails}>
            <Text style={styles.providerName}>
              {booking.provider?.displayName || 'Therapist'}
            </Text>
            <Text style={styles.serviceName}>{booking.service?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => {
              // TODO: Implement call functionality
            }}>
            <Icon name="call" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Status */}
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <View style={styles.statusIconContainer}>
              {providerLocation ? (
                <Icon name="navigate" size={24} color={colors.primary} />
              ) : (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>
                {providerLocation ? 'Therapist is on the way' : 'Waiting for location...'}
              </Text>
              {providerLocation ? (
                <Text style={styles.etaText}>
                  Arriving in approximately {providerLocation.eta} minutes
                </Text>
              ) : (
                <Text style={styles.etaText}>
                  {isConnected ? 'Connected, waiting for updates' : 'Connecting...'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={openInMaps}>
            <Icon name="map-outline" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
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
  map: {
    flex: 1,
  },
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.textInverse,
    ...shadows.md,
  },
  providerMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.textInverse,
    ...shadows.md,
  },
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  providerName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  serviceName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  statusSection: {
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  statusTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  etaText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  actionText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '500',
  },
});
