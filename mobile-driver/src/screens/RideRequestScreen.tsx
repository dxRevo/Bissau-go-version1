import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region, Polyline } from 'react-native-maps';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { ridesService } from '../services/ridesService';
import { googleMapsService } from '../services/googleMapsService';
import { formatPrice } from '../utils/priceFormatter';

const { width, height } = Dimensions.get('window');

export default function RideRequestScreen({ navigation, route }: any) {
  const { ride } = route.params || {};
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

  useEffect(() => {
    if (ride?.pickupLocation) {
      const region: Region = {
        latitude: ride.pickupLocation.latitude,
        longitude: ride.pickupLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(region);

      // Obtenir l'itinéraire (polyline) entre pickup et dropoff
      if (ride.pickupLocation && ride.dropoffLocation) {
        googleMapsService.getDirections(ride.pickupLocation, ride.dropoffLocation)
          .then((route) => {
            setRouteCoordinates(route);
          })
          .catch((error) => {
            console.error('Error getting directions:', error);
            // Fallback: ligne droite simple
            setRouteCoordinates([ride.pickupLocation, ride.dropoffLocation]);
          });
      }
    }
  }, [ride]);

  const handleAccept = async () => {
    try {
      await ridesService.acceptRide(ride.id);
      navigation.replace('ActiveRide', { rideId: ride.id });
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || 'Erreur lors de l\'acceptation');
    }
  };

  const handleDecline = async () => {
    // Quand le driver refuse, retourner à l'écran d'accueil
    // Le système vérifiera automatiquement s'il y a d'autres courses
    navigation.goBack();
  };

  if (!ride) {
    return null;
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
      <StatusBar barStyle="light-content" />
      
      {/* Map View */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion || defaultRegion}
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
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHandle} />
        
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.rideInfo}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                {ride.totalPrice ? formatPrice(ride.totalPrice) : 'Prix non disponible'}
              </Text>
              {ride.distance && ride.duration && (
                <Text style={styles.distance}>
                  {ride.distance} km • {ride.duration} min
                </Text>
              )}
            </View>

            <View style={styles.locationContainer}>
              <View style={styles.locationRow}>
                <View style={[styles.locationDot, { backgroundColor: colors.success }]} />
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationLabel}>Départ</Text>
                  <Text style={styles.locationValue} numberOfLines={2}>
                    {ride.pickupLocation?.address || 'Point de départ'}
                  </Text>
                </View>
              </View>
              <View style={styles.locationRow}>
                <View style={[styles.locationDot, { backgroundColor: colors.error }]} />
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationLabel}>Destination</Text>
                  <Text style={styles.locationValue} numberOfLines={2}>
                    {ride.dropoffLocation?.address || 'Destination'}
                  </Text>
                </View>
              </View>
            </View>

            {ride.client && (
              <View style={styles.clientInfo}>
                <Ionicons name="person-circle-outline" size={32} color={colors.textSecondary} />
                <View style={styles.clientDetails}>
                  <Text style={styles.clientName}>
                    {ride.client.firstName} {ride.client.lastName}
                  </Text>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star-outline" size={16} color={colors.warning} />
                    <Text style={styles.rating}>4.8</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Actions toujours visibles en bas */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={handleDecline}
            activeOpacity={0.8}
          >
            <Ionicons name="close-outline" size={24} color={colors.error} />
            <Text style={styles.declineButtonText}>Refuser</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-outline" size={24} color={colors.textInverse} />
            <Text style={styles.acceptButtonText}>Accepter</Text>
          </TouchableOpacity>
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
    maxHeight: height * 0.75,
    ...shadows.lg,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  scrollContent: {
    flex: 1,
    maxHeight: height * 0.5,
  },
  scrollContentContainer: {
    paddingBottom: spacing.md,
  },
  rideInfo: {
    marginBottom: spacing.md,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.lg,
  },
  price: {
    ...typography.h1,
    color: colors.text,
    marginRight: spacing.sm,
  },
  distance: {
    ...typography.body,
    color: colors.textSecondary,
  },
  locationContainer: {
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
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: spacing.md,
    borderRadius: spacing.md,
  },
  clientDetails: {
    flex: 1,
    marginLeft: spacing.md,
  },
  clientName: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    ...typography.small,
    color: colors.text,
    marginLeft: spacing.xs,
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
    padding: spacing.lg,
    borderRadius: spacing.lg,
    gap: spacing.sm,
  },
  declineButton: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  declineButtonText: {
    ...typography.bodyBold,
    color: colors.error,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  acceptButtonText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
});
