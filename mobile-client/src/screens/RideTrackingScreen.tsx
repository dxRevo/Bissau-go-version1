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
import { websocketService } from '../services/websocketService';
import DraggableBottomSheet from '../components/DraggableBottomSheet';

const { width } = Dimensions.get('window');

export default function RideTrackingScreen({ navigation, route }: any) {
  const { rideId } = route.params || {};
  const mapRef = useRef<MapView>(null);
  const [ride, setRide] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);

  useEffect(() => {
    if (!rideId) {
      // Si pas de rideId, vérifier s'il y a une course active
      const checkActiveRide = async () => {
        try {
          const activeRide = await ridesService.getActiveRide();
          if (activeRide) {
            // Naviguer vers la course active
            navigation.replace('RideTracking', { rideId: activeRide.id });
          } else {
            // Pas de course active, retourner à l'accueil
            navigation.replace('MainTabs', { screen: 'Home' });
          }
        } catch (error) {
          console.error('Error checking active ride:', error);
          navigation.replace('MainTabs', { screen: 'Home' });
        }
      };
      checkActiveRide();
      return;
    }

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

        // Gérer les changements de statut
        if (rideData.status === 'COMPLETED') {
          navigation.replace('RateRide', { rideId: rideData.id });
        } else if (rideData.status === 'CANCELLED') {
          Alert.alert(
            'Course annulée',
            'La course a été annulée.',
            [
              {
                text: 'OK',
                onPress: () => navigation.replace('MainTabs', { screen: 'Home' }),
              },
            ]
          );
        }
      } catch (error: any) {
        console.error('Error fetching ride:', error);
        // Si la course n'existe plus, retourner à l'accueil
        if (error.response?.status === 404) {
          Alert.alert(
            'Course introuvable',
            'Cette course n\'existe plus ou a été supprimée.',
            [
              {
                text: 'OK',
                onPress: () => navigation.replace('MainTabs', { screen: 'Home' }),
              },
            ]
          );
        }
      }
    };

    fetchRide();
    
    // Écouter les mises à jour WebSocket
    const handleStatusChange = (data: any) => {
      if (data.rideId === rideId) {
        console.log('🔄 Ride status changed via WebSocket:', data);
        fetchRide(); // Rafraîchir les données
      }
    };

    // Écouter les mises à jour de position GPS du driver
    const handleDriverLocationUpdate = (data: any) => {
      if (data.rideId === rideId && data.location) {
        console.log('📍 Driver location updated via WebSocket:', data.location);
        setDriverLocation(data.location);
        
        // Centrer la carte sur le driver si le trajet est en cours
        if (ride?.status === 'IN_PROGRESS' && mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 1000);
        }
      }
    };

    websocketService.on('ride_status_changed', handleStatusChange);
    websocketService.on('driver_location_update', handleDriverLocationUpdate);

    // Polling pour les mises à jour en temps réel
    const interval = setInterval(fetchRide, 3000);

    return () => {
      clearInterval(interval);
      websocketService.off('ride_status_changed', handleStatusChange);
      websocketService.off('driver_location_update', handleDriverLocationUpdate);
    };
  }, [rideId, navigation]);

  const handleCancel = () => {
    if (!ride) return;

    // Vérifier si l'annulation est possible
    const canCancel = ['PENDING', 'ACCEPTED', 'DRIVER_ARRIVED'].includes(ride.status);
    
    if (!canCancel) {
      // Afficher un message explicatif selon le statut
      let message = '';
      switch (ride.status) {
        case 'IN_PROGRESS':
          message = 'La course est en cours. Vous ne pouvez plus l\'annuler. Contactez le support si nécessaire.';
          break;
        case 'COMPLETED':
          message = 'Cette course est déjà terminée.';
          break;
        case 'CANCELLED':
          message = 'Cette course a déjà été annulée.';
          break;
        default:
          message = 'Cette course ne peut pas être annulée dans son état actuel.';
      }
      
      Alert.alert(
        'Annulation impossible',
        message,
        [{ text: 'OK' }]
      );
      return;
    }

    // Confirmation d'annulation
    Alert.alert(
      'Annuler la course',
      'Êtes-vous sûr de vouloir annuler cette course ? Cette action est irréversible.',
      [
        {
          text: 'Non, garder',
          style: 'cancel',
        },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await ridesService.cancelRide(rideId);
              Alert.alert(
                'Course annulée',
                'Votre course a été annulée avec succès.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert(
                'Erreur',
                error.response?.data?.message || 'Impossible d\'annuler la course. Veuillez réessayer.',
                [{ text: 'OK' }]
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
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={0}
          >
            <View style={styles.driverMarker}>
              <Ionicons name="car" size={36} color={colors.primary} />
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

      {/* Bottom Sheet Draggable */}
      <DraggableBottomSheet
        initialHeight={Dimensions.get('window').height * 0.4}
        minHeight={120}
        maxHeight={Dimensions.get('window').height * 0.85}
        snapPoints={[120, Dimensions.get('window').height * 0.4, Dimensions.get('window').height * 0.7]}
      >
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

        {/* Statut de la course */}
        <View style={styles.statusContainer}>
          {ride.status === 'PENDING' && (
            <View style={styles.statusBadge}>
              <Ionicons name="time-outline" size={16} color={colors.warning} />
              <Text style={styles.statusText}>En attente d'un conducteur...</Text>
            </View>
          )}
          {ride.status === 'ACCEPTED' && (
            <View style={styles.statusBadge}>
              <Ionicons name="car-outline" size={16} color={colors.primary} />
              <Text style={styles.statusText}>Conducteur en route</Text>
            </View>
          )}
          {ride.status === 'DRIVER_ARRIVED' && (
            <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.statusText, { color: colors.success }]}>Conducteur arrivé</Text>
            </View>
          )}
          {ride.status === 'IN_PROGRESS' && (
            <View style={[styles.statusBadge, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="play-circle" size={16} color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.primary }]}>Trajet en cours</Text>
            </View>
          )}
        </View>

        {/* Bouton d'annulation - Toujours visible */}
        <TouchableOpacity
          style={[
            styles.cancelButton,
            !canCancel && styles.cancelButtonDisabled
          ]}
          onPress={handleCancel}
          activeOpacity={0.8}
          disabled={!canCancel}
        >
          <Ionicons 
            name={canCancel ? "close-circle" : "close-circle-outline"} 
            size={20} 
            color={canCancel ? colors.error : colors.textSecondary} 
          />
          <Text style={[
            styles.cancelButtonText,
            !canCancel && styles.cancelButtonTextDisabled
          ]}>
            {canCancel ? 'Annuler la course' : 'Annulation non disponible'}
          </Text>
        </TouchableOpacity>
      </DraggableBottomSheet>
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
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: spacing.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
    minHeight: 52,
  },
  cancelButtonDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
    opacity: 0.6,
  },
  cancelButtonText: {
    ...typography.bodyBold,
    color: colors.error,
    fontSize: 16,
  },
  cancelButtonTextDisabled: {
    color: colors.textSecondary,
  },
  statusContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    padding: spacing.md,
    borderRadius: spacing.md,
    gap: spacing.sm,
  },
  statusText: {
    ...typography.bodyBold,
    color: colors.text,
  },
});
