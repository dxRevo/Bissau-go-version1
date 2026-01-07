import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region, Polyline } from 'react-native-maps';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { ridesService } from '../services/ridesService';
import { googleMapsService } from '../services/googleMapsService';
import { formatPrice } from '../utils/priceFormatter';

const { width } = Dimensions.get('window');

export default function RideTrackingScreen({ navigation, route }: any) {
  const { rideId } = route.params || {};
  const mapRef = useRef<MapView>(null);
  const [ride, setRide] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

  useEffect(() => {
    if (!rideId) return;

    const fetchRide = async () => {
      try {
        const rideData = await ridesService.getRideById(rideId);
        setRide(rideData);
        
        if (rideData.driver?.location) {
          setDriverLocation(rideData.driver.location);
        }

        // Obtenir l'itinéraire (polyline) entre pickup et dropoff
        if (rideData.pickupLocation && rideData.dropoffLocation) {
          try {
            const route = await googleMapsService.getDirections(
              rideData.pickupLocation,
              rideData.dropoffLocation
            );
            setRouteCoordinates(route);
          } catch (error) {
            console.error('Error getting directions:', error);
            // Fallback: ligne droite simple
            setRouteCoordinates([rideData.pickupLocation, rideData.dropoffLocation]);
          }

          // Fit map to show both pickup and dropoff
          if (mapRef.current) {
            const coordinatesToFit = [
              rideData.pickupLocation,
              rideData.dropoffLocation,
              ...(rideData.driver?.location ? [rideData.driver.location] : []),
            ];
            mapRef.current.fitToCoordinates(coordinatesToFit, {
              edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
              animated: true,
            });
          }
        }

        if (rideData.status === 'COMPLETED') {
          navigation.replace('RateRide', { rideId: rideData.id });
        } else if (rideData.status === 'CANCELLED') {
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching ride:', error);
      }
    };

    fetchRide();
    const interval = setInterval(fetchRide, 5000);

    return () => clearInterval(interval);
  }, [rideId, navigation]);

  const handleCancel = () => {
    Alert.alert(
      'Annuler la course',
      'Êtes-vous sûr de vouloir annuler cette course ?',
      [
        {
          text: 'Non',
          style: 'cancel',
        },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await ridesService.cancelRide(rideId);
              Alert.alert('Succès', 'La course a été annulée');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert(
                'Erreur',
                error.response?.data?.message || 'Impossible d\'annuler la course'
              );
            }
          },
        },
      ]
    );
  };

  const canCancel = ride && ['PENDING', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(ride.status);

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
      
      {/* Map View - Full Screen */}
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
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            title="Conducteur"
            pinColor={colors.primary}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.driverMarker}>
              <Ionicons name="car" size={32} color={colors.primary} />
            </View>
          </Marker>
        )}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineDashPattern={ride?.status === 'IN_PROGRESS' ? undefined : [5, 5]}
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
        <Text style={styles.topBarTitle}>Suivi du trajet</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHandle} />

        <View style={styles.driverInfo}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person-outline" size={32} color={colors.primary} />
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>
              {ride.driver?.firstName} {ride.driver?.lastName}
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

        <View style={styles.rideInfo}>
          <View style={styles.rideInfoRow}>
            <Ionicons name="location-outline" size={20} color={colors.success} />
            <View style={styles.rideInfoText}>
              <Text style={styles.rideInfoLabel}>Départ</Text>
              <Text style={styles.rideInfoValue} numberOfLines={1}>
                {ride.pickupLocation?.address || 'Point de départ'}
              </Text>
            </View>
          </View>
          <View style={styles.rideInfoRow}>
            <Ionicons name="flag-outline" size={20} color={colors.error} />
            <View style={styles.rideInfoText}>
              <Text style={styles.rideInfoLabel}>Destination</Text>
              <Text style={styles.rideInfoValue} numberOfLines={1}>
                {ride.dropoffLocation?.address || 'Destination'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Prix total</Text>
          <Text style={styles.priceValue}>
            {ride.totalPrice ? formatPrice(ride.totalPrice) : 'Calcul en cours...'}
          </Text>
        </View>
        {ride.distance && ride.duration && (
          <View style={styles.rideDetails}>
            <Text style={styles.rideDetailsText}>
              {ride.distance} km • {ride.duration} min
            </Text>
          </View>
        )}

        {/* Bouton d'annulation */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Ionicons name="close-outline" size={20} color={colors.error} />
            <Text style={styles.cancelButtonText}>Annuler la course</Text>
          </TouchableOpacity>
        )}
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
  driverMarker: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.md,
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
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
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
  rideInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  rideInfoText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  rideInfoLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  rideInfoValue: {
    ...typography.body,
    color: colors.text,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  priceValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: 'bold',
  },
  rideDetails: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  rideDetailsText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: spacing.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  cancelButtonText: {
    ...typography.bodyBold,
    color: colors.error,
  },
});
