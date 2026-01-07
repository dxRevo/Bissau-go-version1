import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region, Polyline } from 'react-native-maps';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { ridesService } from '../services/ridesService';
import { googleMapsService } from '../services/googleMapsService';
import { formatPrice } from '../utils/priceFormatter';

export default function ActiveRideScreen({ navigation, route }: any) {
  const { rideId } = route.params || {};
  const mapRef = useRef<MapView>(null);
  const [ride, setRide] = useState<any>(null);
  const [status, setStatus] = useState('ACCEPTED');
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

  useEffect(() => {
    if (!rideId) return;

    const fetchRide = async () => {
      try {
        const rideData = await ridesService.getActiveRide();
        setRide(rideData);
        setStatus(rideData.status);

        // Obtenir l'itinéraire (polyline) entre pickup et dropoff
        if (rideData.pickupLocation && rideData.dropoffLocation && routeCoordinates.length === 0) {
          try {
            const route = await googleMapsService.getDirections(
              rideData.pickupLocation,
              rideData.dropoffLocation
            );
            setRouteCoordinates(route);

            // Fit map to show route
            if (mapRef.current && route.length > 0) {
              mapRef.current.fitToCoordinates(route, {
                edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                animated: true,
              });
            }
          } catch (error) {
            console.error('Error getting directions:', error);
            // Fallback: ligne droite simple
            setRouteCoordinates([rideData.pickupLocation, rideData.dropoffLocation]);
          }
        }

        if (rideData.status === 'COMPLETED') {
          navigation.replace('RateRide', { rideId: rideData.id, client: rideData.client });
        }
      } catch (error) {
        console.error('Error fetching ride:', error);
      }
    };

    fetchRide();
    const interval = setInterval(fetchRide, 5000);
    return () => clearInterval(interval);
  }, [rideId, navigation]);

  const updateStatus = async (newStatus: string) => {
    try {
      await ridesService.updateRideStatus(rideId, newStatus);
      setStatus(newStatus);
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  if (!ride) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loading}>
          <Text>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Région par défaut : Dakar, Sénégal
  const defaultRegion: Region = {
    latitude: ride.pickupLocation?.latitude || 14.7167,
    longitude: ride.pickupLocation?.longitude || -17.4677,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Map View */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {ride.pickupLocation && (
          <Marker
            coordinate={ride.pickupLocation}
            title="Point de départ"
            pinColor={colors.success}
          />
        )}
        {ride.dropoffLocation && (
          <Marker
            coordinate={ride.dropoffLocation}
            title="Destination"
            pinColor={colors.error}
          />
        )}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={status === 'IN_PROGRESS' ? undefined : [5, 5]}
          />
        )}
      </MapView>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Trajet en cours</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHandle} />

        {ride.client && (
          <View style={styles.clientInfo}>
            <Ionicons name="person-circle-outline" size={48} color={colors.primary} />
            <View style={styles.clientDetails}>
              <Text style={styles.clientName}>
                {ride.client.firstName} {ride.client.lastName}
              </Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star-outline" size={16} color={colors.warning} />
                <Text style={styles.rating}>4.8</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.callButton}>
              <Ionicons name="call-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.rideInfo}>
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: colors.success }]} />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>Départ</Text>
              <Text style={styles.locationValue} numberOfLines={1}>
                {ride.pickupLocation?.address || 'Point de départ'}
              </Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, { backgroundColor: colors.error }]} />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={styles.locationValue} numberOfLines={1}>
                {ride.dropoffLocation?.address || 'Destination'}
              </Text>
            </View>
          </View>
        </View>

        {ride.totalPrice && (
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Prix total</Text>
            <Text style={styles.priceValue}>
              {formatPrice(ride.totalPrice)}
            </Text>
            {ride.driverEarnings && (
              <Text style={styles.earningsText}>
                Vos gains: {formatPrice(ride.driverEarnings)}
              </Text>
            )}
          </View>
        )}

        <View style={styles.actions}>
          {status === 'ACCEPTED' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => updateStatus('ARRIVED')}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color={colors.textInverse} />
              <Text style={styles.actionButtonText}>J'arrive</Text>
            </TouchableOpacity>
          )}
          {status === 'ARRIVED' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => updateStatus('IN_PROGRESS')}
              activeOpacity={0.8}
            >
              <Ionicons name="play-circle-outline" size={24} color={colors.textInverse} />
              <Text style={styles.actionButtonText}>Démarrer le trajet</Text>
            </TouchableOpacity>
          )}
          {status === 'IN_PROGRESS' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={() => updateStatus('COMPLETED')}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color={colors.textInverse} />
              <Text style={styles.actionButtonText}>Terminer le trajet</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  topBarTitle: {
    ...typography.h3,
    color: colors.text,
  },
  placeholder: {
    width: 44,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: spacing.xl,
    borderTopRightRadius: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    ...shadows.lg,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  clientDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  clientName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rideInfo: {
    marginBottom: spacing.lg,
  },
  locationRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  locationValue: {
    ...typography.body,
    color: colors.text,
  },
  actions: {
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  actionButtonText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  priceContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.md,
  },
  priceLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  earningsText: {
    ...typography.small,
    color: colors.success,
  },
});
