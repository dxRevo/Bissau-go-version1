import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Alert, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region, Polyline, Camera } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { ridesService } from '../services/ridesService';
import { googleMapsService } from '../services/googleMapsService';
import { driversService } from '../services/driversService';
import { formatPrice } from '../utils/priceFormatter';
import DraggableBottomSheet from '../components/DraggableBottomSheet';

const { width, height } = Dimensions.get('window');

export default function ActiveRideScreen({ navigation, route }: any) {
  const { rideId } = route.params || {};
  const mapRef = useRef<MapView>(null);
  const [ride, setRide] = useState<any>(null);
  const [status, setStatus] = useState('ACCEPTED');
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [driverHeading, setDriverHeading] = useState<number>(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [navigationMode, setNavigationMode] = useState(true); // Mode navigation GPS activé par défaut
  const [currentStreetName, setCurrentStreetName] = useState<string>('');
  const [nextTurn, setNextTurn] = useState<{ distance: number; instruction: string; street: string } | null>(null);
  const [arrivalInfo, setArrivalInfo] = useState<{ time: string; minutes: number; distance: number } | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const previousLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const routeInfoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculer le bearing (direction) entre deux points
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    return bearing;
  };

  // Fonction pour recalculer l'itinéraire depuis la position actuelle
  const updateRouteFromCurrentPosition = async (latitude: number, longitude: number) => {
    if (!ride) return;

    try {
      let destination;
      if (status === 'ACCEPTED' || status === 'DRIVER_ARRIVED') {
        destination = ride.pickupLocation;
      } else if (status === 'IN_PROGRESS') {
        destination = ride.dropoffLocation;
      } else {
        return;
      }

      if (destination) {
        const newRoute = await googleMapsService.getDirections(
          { latitude, longitude },
          destination
        );
        
        if (newRoute && newRoute.length > 0) {
          setRouteCoordinates(newRoute);
          console.log('🔄 Route recalculée depuis la position actuelle');
        }
      }
    } catch (error) {
      console.error('Error recalculating route:', error);
      // Ne pas bloquer l'application si le recalcul échoue
    }
  };

  // Mettre à jour la caméra en mode navigation GPS (vue écran voiture)
  const updateNavigationCamera = (latitude: number, longitude: number, heading: number) => {
    if (!mapRef.current) return;

    // Calculer un offset vers l'avant pour mieux voir la route devant la voiture
    // Offset de ~100m vers l'avant basé sur le heading (comme GPS voiture)
    const offsetDistance = 0.001; // ~100 mètres en degrés (amélioré pour meilleure visibilité)
    const headingRad = (heading * Math.PI) / 180;
    const offsetLat = offsetDistance * Math.cos(headingRad);
    const offsetLon = offsetDistance * Math.sin(headingRad);

    mapRef.current.animateCamera({
      center: {
        latitude: latitude + offsetLat,
        longitude: longitude + offsetLon,
      },
      pitch: 60, // Inclinaison 3D optimisée comme écran voiture (60°)
      heading: heading, // Orientation selon la direction de déplacement
      altitude: 180, // Altitude optimisée pour vue voiture (180m)
      zoom: 18, // Zoom proche pour voir la route clairement (18)
    }, { duration: 500 }); // Animation fluide et rapide (500ms)
  };

  // Mise à jour GPS en temps réel
  useEffect(() => {
    if (!ride || status === 'COMPLETED') return;

    const startLocationTracking = async () => {
      try {
        const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
        if (permissionStatus !== 'granted') {
          console.warn('Location permission not granted');
          return;
        }

        // Démarrer le suivi GPS en temps réel avec heading (comme système embarqué voiture)
        locationSubscriptionRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation, // Précision maximale pour navigation
            timeInterval: 1000, // Mise à jour toutes les 1 seconde pour navigation ultra-fluide
            distanceInterval: 3, // Ou tous les 3 mètres pour suivi précis
          },
          async (location) => {
            const { latitude, longitude, heading } = location.coords;
            const newLocation = { latitude, longitude };
            setDriverLocation(newLocation);

            // Calculer le heading (direction) basé sur le mouvement
            if (previousLocationRef.current) {
              const prev = previousLocationRef.current;
              const bearing = calculateBearing(
                prev.latitude,
                prev.longitude,
                latitude,
                longitude
              );
              setDriverHeading(bearing);
            } else if (heading !== null && heading !== -1) {
              setDriverHeading(heading);
            }

            previousLocationRef.current = newLocation;

            // Mettre à jour la position sur le backend
            try {
              await driversService.updateLocation(latitude, longitude);
              
              // Obtenir le nom de la rue actuelle (toutes les 5 secondes pour éviter trop d'appels API)
              if (!previousLocationRef.current || 
                  calculateDistance(
                    previousLocationRef.current.latitude,
                    previousLocationRef.current.longitude,
                    latitude,
                    longitude
                  ) > 0.05) { // Mettre à jour si déplacement > 50m
                googleMapsService.getStreetName(latitude, longitude).then((streetName) => {
                  if (streetName) {
                    setCurrentStreetName(streetName);
                  }
                }).catch((error) => {
                  console.error('Error getting street name:', error);
                });
              }
              
              // Mettre à jour la caméra en mode navigation GPS (comme écran voiture)
              if (mapRef.current && navigationMode && status === 'IN_PROGRESS') {
                // Utiliser le heading calculé ou celui du GPS
                const currentHeading = driverHeading || heading || 0;
                updateNavigationCamera(latitude, longitude, currentHeading);
                
                // Recalculer l'itinéraire depuis la position actuelle toutes les 30 secondes
                // pour s'assurer que le véhicule suit toujours la route optimale
                const now = Date.now();
                const lastRouteUpdate = (global as any).lastRouteUpdate || 0;
                if (now - lastRouteUpdate > 30000 && ride) { // Toutes les 30 secondes
                  (global as any).lastRouteUpdate = now;
                  updateRouteFromCurrentPosition(latitude, longitude);
                }
              } else if (mapRef.current && driverLocation && status !== 'IN_PROGRESS') {
                // Mode normal : centrer sur la position sans 3D
                mapRef.current.animateToRegion({
                  latitude: driverLocation.latitude,
                  longitude: driverLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }, 500);
              }
            } catch (error) {
              console.error('Error updating location:', error);
            }
          }
        );
      } catch (error) {
        console.error('Error starting location tracking:', error);
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
  }, [ride, status, navigationMode]);

  useEffect(() => {
    if (!rideId) return;

    const fetchRide = async () => {
      try {
        const rideData = await ridesService.getActiveRide();
        setRide(rideData);
        setStatus(rideData.status);

        // Obtenir l'itinéraire selon le statut
        // Si ACCEPTED ou DRIVER_ARRIVED: itinéraire vers le client (pickupLocation)
        // Si IN_PROGRESS: itinéraire vers la destination (dropoffLocation)
        if (rideData.pickupLocation && rideData.dropoffLocation) {
          try {
            let route;
            let coordinatesToFit = [];

            // Recalculer l'itinéraire depuis la position actuelle du chauffeur (comme GPS voiture)
            if (rideData.status === 'ACCEPTED' || rideData.status === 'DRIVER_ARRIVED') {
              // Aller chercher le client - itinéraire vers pickupLocation depuis position actuelle
              if (driverLocation) {
                route = await googleMapsService.getDirections(
                  driverLocation,
                  rideData.pickupLocation
                );
                coordinatesToFit = [driverLocation, rideData.pickupLocation];
              } else {
                // Attendre la position GPS avant de calculer l'itinéraire
                console.log('⏳ En attente de la position GPS pour calculer l\'itinéraire...');
                return;
              }
            } else if (rideData.status === 'IN_PROGRESS') {
              // Aller vers la destination - itinéraire vers dropoffLocation depuis position actuelle
              if (driverLocation) {
                route = await googleMapsService.getDirections(
                  driverLocation,
                  rideData.dropoffLocation
                );
                coordinatesToFit = [driverLocation, rideData.dropoffLocation];
              } else {
                // Utiliser pickupLocation comme point de départ si pas de position GPS
                route = await googleMapsService.getDirections(
                  rideData.pickupLocation,
                  rideData.dropoffLocation
                );
                coordinatesToFit = [rideData.pickupLocation, rideData.dropoffLocation];
              }
            } else {
              // Par défaut: itinéraire complet
              route = await googleMapsService.getDirections(
                rideData.pickupLocation,
                rideData.dropoffLocation
              );
              coordinatesToFit = [rideData.pickupLocation, rideData.dropoffLocation];
            }

            setRouteCoordinates(route);

            // En mode navigation GPS, ne pas fit la carte automatiquement
            // La caméra suivra automatiquement le véhicule
            if (mapRef.current && route.length > 0 && coordinatesToFit.length > 0) {
              // Seulement si pas en mode navigation ou pas en cours de trajet
              if (!navigationMode || status !== 'IN_PROGRESS') {
                mapRef.current.fitToCoordinates(coordinatesToFit, {
                  edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                  animated: true,
                });
              }
            }
          } catch (error) {
            console.error('Error getting directions:', error);
            // Fallback: ligne droite simple
            if (rideData.status === 'ACCEPTED' || rideData.status === 'DRIVER_ARRIVED') {
              if (driverLocation) {
                setRouteCoordinates([driverLocation, rideData.pickupLocation]);
              } else {
                setRouteCoordinates([rideData.pickupLocation, rideData.pickupLocation]);
              }
            } else {
              setRouteCoordinates([rideData.pickupLocation, rideData.dropoffLocation]);
            }
          }
        }

        if (rideData.status === 'COMPLETED') {
          // Arrêter le suivi GPS
          if (locationSubscriptionRef.current) {
            locationSubscriptionRef.current.remove();
            locationSubscriptionRef.current = null;
          }
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

  // Mettre à jour les informations de navigation (arrivée, prochain virage)
  useEffect(() => {
    if (!driverLocation || !ride || status !== 'IN_PROGRESS') {
      return;
    }

    const updateRouteInfo = async () => {
      try {
        // Calculer les infos d'arrivée
        if (ride.dropoffLocation) {
          const routeInfo = await googleMapsService.getRouteInfo(
            driverLocation,
            ride.dropoffLocation
          );

          if (routeInfo) {
            const now = new Date();
            const arrivalTime = new Date(now.getTime() + routeInfo.duration * 60 * 1000);
            const timeString = arrivalTime.toLocaleTimeString('fr-FR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });

            setArrivalInfo({
              time: timeString,
              minutes: Math.round(routeInfo.duration),
              distance: Math.round(routeInfo.distance * 10) / 10, // Arrondir à 1 décimale
            });
          }
        }

        // Calculer le prochain virage (simplifié - utiliser le premier point de la route)
        if (routeCoordinates.length > 0) {
          const nextPoint = routeCoordinates.find(
            (point, index) => {
              const distance = calculateDistance(
                driverLocation.latitude,
                driverLocation.longitude,
                point.latitude,
                point.longitude
              );
              return distance > 0.1 && distance < 2; // Entre 100m et 2km
            }
          );

          if (nextPoint) {
            const distance = calculateDistance(
              driverLocation.latitude,
              driverLocation.longitude,
              nextPoint.latitude,
              nextPoint.longitude
            );
            setNextTurn({
              distance: Math.round(distance * 10) / 10,
              instruction: 'Continuez tout droit',
              street: currentStreetName || 'Route',
            });
          }
        }
      } catch (error) {
        console.error('Error updating route info:', error);
      }
    };

    updateRouteInfo();
    routeInfoIntervalRef.current = setInterval(updateRouteInfo, 10000); // Mise à jour toutes les 10 secondes

    return () => {
      if (routeInfoIntervalRef.current) {
        clearInterval(routeInfoIntervalRef.current);
      }
    };
  }, [driverLocation, ride, status, routeCoordinates, currentStreetName]);

  // Fonction pour calculer la distance entre deux points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const updateStatus = async (newStatus: string) => {
    try {
      console.log(`🔄 Updating ride ${rideId} status to ${newStatus}`);
      const updatedRide = await ridesService.updateRideStatus(rideId, newStatus);
      console.log('✅ Status updated successfully:', updatedRide);
      setStatus(updatedRide.status);
      setRide(updatedRide);
    } catch (error: any) {
      console.error('❌ Error updating status:', error);
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Erreur lors de la mise à jour';
      Alert.alert('Erreur', errorMessage);
      throw error; // Re-throw pour que l'appelant puisse gérer
    }
  };

  const handleCancelRide = () => {
    if (!ride) return;

    // Vérifier si l'annulation est possible pour le driver
    const canCancel = ['ACCEPTED', 'DRIVER_ARRIVED'].includes(status);
    
    if (!canCancel) {
      let message = '';
      switch (status) {
        case 'PENDING':
          message = 'Cette course n\'a pas encore été acceptée.';
          break;
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
      'Êtes-vous sûr de vouloir annuler cette course ? Le client sera notifié et pourra commander un autre véhicule.',
      [
        {
          text: 'Non, continuer',
          style: 'cancel',
        },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              await ridesService.updateRideStatus(rideId, 'CANCELLED');
              Alert.alert(
                'Course annulée',
                'La course a été annulée. Vous pouvez maintenant accepter d\'autres courses.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
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
        style={isFullScreen ? StyleSheet.absoluteFillObject : styles.map}
        initialRegion={defaultRegion}
        showsUserLocation={false} // Désactivé car on utilise un marker personnalisé
        showsMyLocationButton={false}
        toolbarEnabled={false}
        followsUserLocation={false} // Désactivé car on contrôle manuellement la caméra
        pitchEnabled={navigationMode && status === 'IN_PROGRESS'}
        rotateEnabled={navigationMode && status === 'IN_PROGRESS'}
        scrollEnabled={!navigationMode || status !== 'IN_PROGRESS'}
        zoomEnabled={!navigationMode || status !== 'IN_PROGRESS'}
        mapType="standard"
        loadingEnabled={true}
        loadingIndicatorColor={colors.primary}
        showsCompass={false} // Compass désactivé car on utilise le heading
        showsScale={false}
        showsBuildings={true} // Afficher les bâtiments 3D pour meilleure immersion
        showsTraffic={false}
        showsIndoors={false}
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
            strokeWidth={status === 'IN_PROGRESS' ? 6 : 4}
            lineDashPattern={status === 'IN_PROGRESS' ? undefined : [5, 5]}
            zIndex={1}
          />
        )}
        {driverLocation && (
          <Marker
            coordinate={driverLocation}
            title="Votre position"
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={status === 'IN_PROGRESS' ? driverHeading : undefined}
            flat={status === 'IN_PROGRESS'} // Flat en mode navigation pour suivre la route
            zIndex={10}
          >
            <View style={[
              styles.driverMarker,
              status === 'IN_PROGRESS' && styles.driverMarkerActive
            ]}>
              <Ionicons 
                name={status === 'IN_PROGRESS' ? "car" : "car-outline"} 
                size={status === 'IN_PROGRESS' ? 40 : 32} 
                color={status === 'IN_PROGRESS' ? colors.primary : colors.textSecondary} 
              />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Panneau Navigation GPS (haut gauche) - Style écran voiture */}
      {navigationMode && status === 'IN_PROGRESS' && !isFullScreen && nextTurn && (
        <View style={styles.navigationPanel}>
          <View style={styles.nextTurnContainer}>
            <Ionicons name="arrow-forward" size={32} color={colors.background} />
            <View style={styles.nextTurnInfo}>
              <Text style={styles.nextTurnDistance}>{nextTurn.distance} km</Text>
              <Text style={styles.nextTurnStreet}>{nextTurn.street}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Nom de la rue actuelle (sous le marker) - Style GPS voiture */}
      {currentStreetName && status === 'IN_PROGRESS' && !isFullScreen && (
        <View style={styles.streetNameContainer}>
          <Text style={styles.streetName}>{currentStreetName}</Text>
        </View>
      )}

      {/* Panneau Informations Arrivée (bas gauche) - Style écran voiture */}
      {navigationMode && status === 'IN_PROGRESS' && !isFullScreen && arrivalInfo && (
        <View style={styles.arrivalPanel}>
          <View style={styles.arrivalItem}>
            <Text style={styles.arrivalValue}>{arrivalInfo.time}</Text>
            <Text style={styles.arrivalLabel}>arrivée</Text>
          </View>
          <View style={styles.arrivalItem}>
            <Text style={styles.arrivalValue}>{arrivalInfo.minutes}</Text>
            <Text style={styles.arrivalLabel}>min</Text>
          </View>
          <View style={styles.arrivalItem}>
            <Text style={styles.arrivalValue}>{arrivalInfo.distance}</Text>
            <Text style={styles.arrivalLabel}>km</Text>
          </View>
        </View>
      )}

      {/* Boutons de contrôle */}
      {!isFullScreen && (
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setIsFullScreen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="expand-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          {status === 'IN_PROGRESS' && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => {
                setNavigationMode(!navigationMode);
                if (!navigationMode && driverLocation) {
                  // Réactiver le mode navigation
                  updateNavigationCamera(driverLocation.latitude, driverLocation.longitude, driverHeading);
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={navigationMode ? "navigate" : "navigate-outline"} 
                size={24} 
                color={navigationMode ? colors.primary : colors.text} 
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Overlay plein écran avec bouton retour */}
      {isFullScreen && (
        <View style={styles.fullScreenOverlay}>
          <TouchableOpacity
            style={styles.exitFullScreenButton}
            onPress={() => setIsFullScreen(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="contract-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Top Bar - Masqué en plein écran */}
      {!isFullScreen && (
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Retourner à l'écran Home au lieu de goBack pour éviter les problèmes de navigation
              navigation.navigate('MainTabs', { screen: 'Home' });
            }}
          >
            <Ionicons name="arrow-back-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>
            {status === 'ACCEPTED' || status === 'DRIVER_ARRIVED' ? 'Aller chercher le client' : 'Trajet en cours'}
          </Text>
          <TouchableOpacity
            style={styles.cancelButtonTop}
            onPress={handleCancelRide}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="close-circle-outline" 
              size={24} 
              color={colors.error} 
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Sheet Draggable - Masqué en plein écran */}
      {!isFullScreen && (
        <DraggableBottomSheet
          initialHeight={height * 0.4}
          minHeight={120}
          maxHeight={height * 0.85}
          snapPoints={[120, height * 0.4, height * 0.7]}
        >

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
              onPress={async () => {
                try {
                  await updateStatus('DRIVER_ARRIVED');
                  Alert.alert('Succès', 'Le client a été notifié de votre arrivée');
                } catch (error: any) {
                  Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le statut');
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color={colors.textInverse} />
              <Text style={styles.actionButtonText}>J'arrive</Text>
            </TouchableOpacity>
          )}
          {status === 'DRIVER_ARRIVED' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={async () => {
                try {
                  await updateStatus('IN_PROGRESS');
                  // Activer le mode navigation GPS
                  if (driverLocation) {
                    updateNavigationCamera(driverLocation.latitude, driverLocation.longitude, driverHeading);
                  }
                  Alert.alert('Succès', 'Le trajet a démarré. Le client peut maintenant vous suivre en temps réel.');
                } catch (error: any) {
                  Alert.alert('Erreur', error.message || 'Impossible de démarrer le trajet');
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="play-circle-outline" size={24} color={colors.textInverse} />
              <Text style={styles.actionButtonText}>Démarrer le trajet</Text>
            </TouchableOpacity>
          )}
          {status === 'IN_PROGRESS' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={async () => {
                try {
                  await updateStatus('COMPLETED');
                  // La navigation vers RateRide se fera automatiquement via useEffect
                } catch (error: any) {
                  Alert.alert('Erreur', error.message || 'Impossible de terminer le trajet');
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={24} color={colors.textInverse} />
              <Text style={styles.actionButtonText}>Terminer le trajet</Text>
            </TouchableOpacity>
          )}
        </View>
        </DraggableBottomSheet>
      )}
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
  cancelButtonTop: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  cancelActionButton: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 1.5,
    borderColor: colors.error,
    marginTop: spacing.md,
  },
  cancelActionButtonText: {
    ...typography.bodyBold,
    color: colors.error,
  },
  clientMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
    ...shadows.lg,
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
  driverMarker: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.md,
  },
  driverMarkerActive: {
    backgroundColor: colors.primary + '20', // Légère transparence
    borderRadius: 22,
    padding: 6,
    borderWidth: 3,
    borderColor: colors.primary,
    ...shadows.lg,
  },
  mapControls: {
    position: 'absolute',
    top: 100,
    right: spacing.md,
    gap: spacing.sm,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
    marginBottom: spacing.sm,
  },
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  exitFullScreenButton: {
    position: 'absolute',
    top: 50,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  navigationIndicator: {
    position: 'absolute',
    top: 100,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
    gap: spacing.xs,
    ...shadows.md,
  },
  navigationText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  // Panneau Navigation GPS (style écran voiture)
  navigationPanel: {
    position: 'absolute',
    top: 60,
    left: spacing.md,
    backgroundColor: '#2C2C2E', // Gris foncé comme GPS voiture
    borderRadius: 12,
    padding: spacing.md,
    minWidth: 200,
    ...shadows.lg,
  },
  nextTurnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nextTurnInfo: {
    flex: 1,
  },
  nextTurnDistance: {
    ...typography.h3,
    color: colors.background,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  nextTurnStreet: {
    ...typography.body,
    color: '#AEAEB2', // Gris clair
    fontSize: 14,
  },
  // Nom de la rue actuelle (style GPS voiture)
  streetNameContainer: {
    position: 'absolute',
    bottom: 200,
    left: '50%',
    transform: [{ translateX: -100 }],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    ...shadows.md,
  },
  streetName: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Panneau Arrivée (style écran voiture)
  arrivalPanel: {
    position: 'absolute',
    bottom: 120,
    left: spacing.md,
    backgroundColor: '#2C2C2E', // Gris foncé comme GPS voiture
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    gap: spacing.lg,
    ...shadows.lg,
  },
  arrivalItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  arrivalValue: {
    ...typography.h2,
    color: colors.background,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  arrivalLabel: {
    ...typography.small,
    color: '#AEAEB2', // Gris clair
    fontSize: 12,
  },
});
