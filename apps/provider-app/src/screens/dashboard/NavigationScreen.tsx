import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';

import {Button} from '@components';
import {useJobStore, useStatusStore} from '@store';
import {socketService} from '@services/socket';
import {colors, typography, spacing, borderRadius} from '@config/theme';
import type {DashboardStackParamList} from '@types';

type RouteProps = RouteProp<DashboardStackParamList, 'Navigation'>;
type NavigationProp = NativeStackNavigationProp<DashboardStackParamList, 'Navigation'>;

interface Location {
  latitude: number;
  longitude: number;
}

export function NavigationScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const {bookingId, destination} = route.params;
  const {updateJobStatus, isLoading: isUpdating} = useJobStore();
  const {currentLocation} = useStatusStore();

  const mapRef = useRef<MapView>(null);
  const [providerLocation, setProviderLocation] = useState<Location | null>(
    currentLocation,
  );
  const [routeCoordinates, setRouteCoordinates] = useState<Location[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);

  const destinationLocation: Location = {
    latitude: destination.lat,
    longitude: destination.lng,
  };

  // Join booking room on mount
  useEffect(() => {
    socketService.joinBookingRoom(bookingId);
    return () => {
      socketService.leaveBookingRoom(bookingId);
    };
  }, [bookingId]);

  // Watch provider location and emit via socket
  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      position => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setProviderLocation(newLocation);

        // Emit location to socket for customer tracking
        socketService.emit('location:update', {
          bookingId,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      error => {
        console.error('Location error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 2000,
      },
    );

    return () => {
      Geolocation.clearWatch(watchId);
    };
  }, [bookingId]);

  // Get current location on mount
  useEffect(() => {
    Geolocation.getCurrentPosition(
      position => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setProviderLocation(location);
        calculateRoute(location, destinationLocation);
      },
      error => {
        console.error('Get position error:', error);
        setIsLoadingRoute(false);
        // Use a default or last known location
        if (currentLocation) {
          calculateRoute(currentLocation, destinationLocation);
        }
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  }, []);

  // Fit map to show both markers
  useEffect(() => {
    if (providerLocation && mapRef.current) {
      mapRef.current.fitToCoordinates(
        [providerLocation, destinationLocation],
        {
          edgePadding: {top: 100, right: 50, bottom: 200, left: 50},
          animated: true,
        },
      );
    }
  }, [providerLocation]);

  const calculateRoute = async (origin: Location, dest: Location) => {
    setIsLoadingRoute(true);
    try {
      // Calculate straight-line distance and estimated time
      const distanceKm = getDistanceFromLatLonInKm(
        origin.latitude,
        origin.longitude,
        dest.latitude,
        dest.longitude,
      );

      // Estimate time: assume average speed of 30 km/h in city traffic
      const timeMinutes = Math.ceil((distanceKm / 30) * 60);

      setDistance(distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`);
      setEstimatedTime(timeMinutes);

      // Create simple route line (straight line for now)
      // For actual route, you'd use Google Directions API
      setRouteCoordinates([origin, dest]);
    } catch (error) {
      console.error('Route calculation error:', error);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const getDistanceFromLatLonInKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
  };

  const openGoogleMaps = () => {
    const url = Platform.select({
      ios: `comgooglemaps://?daddr=${destinationLocation.latitude},${destinationLocation.longitude}&directionsmode=driving`,
      android: `google.navigation:q=${destinationLocation.latitude},${destinationLocation.longitude}`,
    });

    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationLocation.latitude},${destinationLocation.longitude}&travelmode=driving`;

    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(webUrl);
        }
      });
    }
  };

  const openAppleMaps = () => {
    const url = `maps://?daddr=${destinationLocation.latitude},${destinationLocation.longitude}&dirflg=d`;
    Linking.openURL(url);
  };

  const openWaze = () => {
    const url = `waze://?ll=${destinationLocation.latitude},${destinationLocation.longitude}&navigate=yes`;
    const webUrl = `https://waze.com/ul?ll=${destinationLocation.latitude},${destinationLocation.longitude}&navigate=yes`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(webUrl);
      }
    });
  };

  const showNavigationOptions = () => {
    const options = Platform.OS === 'ios'
      ? [
          {text: 'Apple Maps', onPress: openAppleMaps},
          {text: 'Google Maps', onPress: openGoogleMaps},
          {text: 'Waze', onPress: openWaze},
          {text: 'Cancel', style: 'cancel' as const},
        ]
      : [
          {text: 'Google Maps', onPress: openGoogleMaps},
          {text: 'Waze', onPress: openWaze},
          {text: 'Cancel', style: 'cancel' as const},
        ];

    Alert.alert('Open Navigation', 'Choose your preferred navigation app', options);
  };

  const handleArrived = async () => {
    try {
      await updateJobStatus(bookingId, 'PROVIDER_ARRIVED');
      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: 'You have arrived at the location',
      });
      navigation.goBack();
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update status',
      });
    }
  };

  const centerOnProvider = () => {
    if (providerLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...providerLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={false}
        showsMyLocationButton={false}
        initialRegion={{
          latitude: destinationLocation.latitude,
          longitude: destinationLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}>
        {/* Provider Marker */}
        {providerLocation && (
          <Marker
            coordinate={providerLocation}
            title="Your Location"
            anchor={{x: 0.5, y: 0.5}}>
            <View style={styles.providerMarker}>
              <Icon name="navigate" size={20} color={colors.card} />
            </View>
          </Marker>
        )}

        {/* Destination Marker */}
        <Marker
          coordinate={destinationLocation}
          title="Customer Location"
          anchor={{x: 0.5, y: 1}}>
          <View style={styles.destinationMarker}>
            <Icon name="location" size={28} color={colors.error} />
          </View>
        </Marker>

        {/* Route Line */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={[1]}
          />
        )}
      </MapView>

      {/* Center Button */}
      <TouchableOpacity style={styles.centerButton} onPress={centerOnProvider}>
        <Icon name="locate" size={24} color={colors.primary} />
      </TouchableOpacity>

      {/* Info Panel */}
      <View style={styles.infoPanel}>
        {isLoadingRoute ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>Calculating route...</Text>
          </View>
        ) : (
          <>
            {/* ETA & Distance */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Icon name="time-outline" size={24} color={colors.primary} />
                <Text style={styles.statValue}>
                  {estimatedTime ? `${estimatedTime} min` : '--'}
                </Text>
                <Text style={styles.statLabel}>ETA</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Icon name="speedometer-outline" size={24} color={colors.primary} />
                <Text style={styles.statValue}>{distance || '--'}</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            </View>

            {/* Navigation Buttons */}
            <View style={styles.navButtonsRow}>
              <TouchableOpacity
                style={styles.navAppButton}
                onPress={showNavigationOptions}>
                <Icon name="navigate-circle" size={28} color={colors.primary} />
                <Text style={styles.navAppText}>Open Navigation</Text>
              </TouchableOpacity>
            </View>

            {/* Arrived Button */}
            <Button
              title="I Have Arrived"
              onPress={handleArrived}
              loading={isUpdating}
              variant="success"
              style={styles.arrivedButton}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  providerMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.card,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  destinationMarker: {
    alignItems: 'center',
  },
  centerButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  infoPanel: {
    backgroundColor: colors.card,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.divider,
  },
  navButtonsRow: {
    marginBottom: spacing.md,
  },
  navAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  navAppText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  arrivedButton: {
    marginTop: spacing.sm,
  },
});
