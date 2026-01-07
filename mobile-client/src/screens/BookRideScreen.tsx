import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import Header from '../components/Header';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { ridesService } from '../services/ridesService';
import { googleMapsService } from '../services/googleMapsService';
import { pricingService } from '../services/pricingService';
import { formatPrice } from '../utils/priceFormatter';

export default function BookRideScreen({ navigation }: any) {
  const mapRef = useRef<MapView>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupLocation, setPickupLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [vehicleType, setVehicleType] = useState<'ECO' | 'CONFORT'>('ECO');
  const [priceEstimate, setPriceEstimate] = useState<{ distance: number; duration: number; estimatedPrice: number } | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [hasActiveRide, setHasActiveRide] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    checkActiveRide();
  }, []);

  const checkActiveRide = async () => {
    try {
      const activeRide = await ridesService.getActiveRide();
      if (activeRide) {
        setHasActiveRide(true);
        Alert.alert(
          'Course en cours',
          'Vous avez déjà une course en cours. Veuillez l\'annuler ou la terminer avant d\'en créer une nouvelle.',
          [
            {
              text: 'Annuler',
              style: 'cancel',
            },
            {
              text: 'Voir ma course',
              onPress: () => {
                navigation.navigate('RideTracking', { rideId: activeRide.id });
              },
            },
          ],
        );
        // Retourner à l'écran précédent après un court délai
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      }
    } catch (error) {
      // Pas de course active, continuer normalement
      setHasActiveRide(false);
    }
  };

  useEffect(() => {
    if (pickupLocation && dropoffLocation && mapRef.current) {
      const coordinates = [pickupLocation, dropoffLocation];
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
      
      // Calculer le prix estimé
      calculatePriceEstimate();
    }
  }, [pickupLocation, dropoffLocation, vehicleType]);

  const calculatePriceEstimate = async () => {
    if (!pickupLocation || !dropoffLocation) return;
    
    setCalculatingPrice(true);
    try {
      const { distance, duration } = await googleMapsService.calculateDistanceAndDuration(
        pickupLocation,
        dropoffLocation
      );
      
      const estimate = pricingService.calculatePriceEstimate(distance, duration, vehicleType);
      setPriceEstimate({
        distance: estimate.distance,
        duration: estimate.duration,
        estimatedPrice: estimate.estimatedPrice,
      });
    } catch (error) {
      console.error('Error calculating price estimate:', error);
    } finally {
      setCalculatingPrice(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'La localisation est nécessaire');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const region: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setMapRegion(region);
      setPickupLocation({ latitude: region.latitude, longitude: region.longitude });
      
      // Get address from location
      const address = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude,
      });
      if (address && address.length > 0) {
        const addr = address[0];
        setPickupAddress(`${addr.street || ''} ${addr.name || ''}, ${addr.city || ''}`.trim());
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleBookRide = async () => {
    // Vérifier s'il y a déjà une course active
    if (hasActiveRide) {
      Alert.alert(
        'Course en cours',
        'Vous avez déjà une course en cours. Veuillez l\'annuler ou la terminer avant d\'en créer une nouvelle.',
      );
      return;
    }

    if (!pickupAddress || !dropoffAddress) {
      Alert.alert('Erreur', 'Veuillez entrer les adresses de départ et de destination');
      return;
    }

    if (!pickupLocation || !dropoffLocation) {
      Alert.alert('Erreur', 'Veuillez sélectionner des adresses valides');
      return;
    }

    setLoading(true);
    try {
      const ride = await ridesService.createRide({
        pickupLocation: {
          ...pickupLocation,
          address: pickupAddress,
        },
        dropoffLocation: {
          ...dropoffLocation,
          address: dropoffAddress,
        },
        vehicleType: vehicleType,
      });

      navigation.navigate('WaitingRide', {
        rideId: ride.id,
        pickupLocation,
        dropoffLocation,
        pickupAddress,
        dropoffAddress,
        estimatedPrice: priceEstimate?.estimatedPrice,
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de la réservation';
      const buttons: any[] = [
        {
          text: 'OK',
          style: 'cancel' as const,
        },
      ];

      if (errorMessage.includes('déjà une course en cours')) {
        buttons.push({
          text: 'Voir ma course',
          onPress: () => {
            // Naviguer vers l'écran de suivi de course si disponible
            ridesService.getActiveRide()
              .then((activeRide) => {
                if (activeRide) {
                  navigation.navigate('RideTracking', { rideId: activeRide.id });
                }
              })
              .catch(() => {
                // Si erreur, naviguer vers l'historique
                navigation.navigate('History');
              });
          },
        });
      }

      Alert.alert('Erreur', errorMessage, buttons);
    } finally {
      setLoading(false);
    }
  };

  const swapAddresses = () => {
    const tempAddress = pickupAddress;
    const tempLocation = pickupLocation;
    
    setPickupAddress(dropoffAddress);
    setPickupLocation(dropoffLocation);
    setDropoffAddress(tempAddress);
    setDropoffLocation(tempLocation);
  };

  // Région par défaut : Dakar, Sénégal
  const defaultRegion: Region = {
    latitude: 14.7167,
    longitude: -17.4677,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Map View - Full Screen */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion || defaultRegion}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {pickupLocation && (
          <Marker
            coordinate={pickupLocation}
            title="Point de départ"
            pinColor={colors.success}
          />
        )}
        {dropoffLocation && (
          <Marker
            coordinate={dropoffLocation}
            title="Destination"
            pinColor={colors.error}
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
        <Text style={styles.topBarTitle}>Réserver un trajet</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Bottom Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHandle} />

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <View style={[styles.dot, { backgroundColor: colors.success }]} />
                <View style={styles.line} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>De</Text>
                <AddressAutocomplete
                  placeholder="Point de départ"
                  value={pickupAddress}
                  onChangeText={setPickupAddress}
                  onSelectAddress={(address, location) => {
                    setPickupAddress(address);
                    if (location) setPickupLocation(location);
                  }}
                  icon="location"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.swapButton} onPress={swapAddresses}>
              <Ionicons name="swap-vertical-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <View style={[styles.dot, { backgroundColor: colors.error }]} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>À</Text>
                <AddressAutocomplete
                  placeholder="Destination"
                  value={dropoffAddress}
                  onChangeText={setDropoffAddress}
                  onSelectAddress={(address, location) => {
                    setDropoffAddress(address);
                    if (location) setDropoffLocation(location);
                  }}
                  icon="flag"
                />
              </View>
            </View>
          </View>

          {/* Vehicle Type Selection */}
          <View style={styles.vehicleTypeContainer}>
            <Text style={styles.vehicleTypeLabel}>Type de véhicule</Text>
            <View style={styles.vehicleTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.vehicleTypeButton,
                  vehicleType === 'ECO' && styles.vehicleTypeButtonActive,
                ]}
                onPress={() => setVehicleType('ECO')}
              >
                <Ionicons
                  name="car-outline"
                  size={24}
                  color={vehicleType === 'ECO' ? colors.textInverse : colors.text}
                />
                <Text
                  style={[
                    styles.vehicleTypeButtonText,
                    vehicleType === 'ECO' && styles.vehicleTypeButtonTextActive,
                  ]}
                >
                  ECO
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.vehicleTypeButton,
                  vehicleType === 'CONFORT' && styles.vehicleTypeButtonActive,
                ]}
                onPress={() => setVehicleType('CONFORT')}
              >
                <Ionicons
                  name="car-sport-outline"
                  size={24}
                  color={vehicleType === 'CONFORT' ? colors.textInverse : colors.text}
                />
                <Text
                  style={[
                    styles.vehicleTypeButtonText,
                    vehicleType === 'CONFORT' && styles.vehicleTypeButtonTextActive,
                  ]}
                >
                  CONFORT
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Price Estimate */}
          {priceEstimate && (
            <View style={styles.priceContainer}>
              <View style={styles.priceInfo}>
                <View style={styles.priceInfoRow}>
                  <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.priceInfoText}>
                    {priceEstimate.duration} min • {priceEstimate.distance} km
                  </Text>
                </View>
              </View>
              <View style={styles.priceValueContainer}>
                {calculatingPrice ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.priceValue}>
                    {formatPrice(priceEstimate.estimatedPrice)}
                  </Text>
                )}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.bookButton, loading && styles.bookButtonDisabled]}
            onPress={handleBookRide}
            disabled={loading || !priceEstimate}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="car-outline" size={24} color={colors.textInverse} />
                <Text style={styles.bookButtonText}>Réserver un trajet</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  keyboardView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomSheet: {
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
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  inputIconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    ...typography.smallBold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  swapButton: {
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.xs,
    ...shadows.sm,
  },
  bookButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  bookButtonDisabled: {
    opacity: 0.5,
  },
  bookButtonText: {
    ...typography.bodyBold,
    color: colors.textInverse,
    fontSize: 18,
    marginLeft: spacing.sm,
  },
  vehicleTypeContainer: {
    marginBottom: spacing.lg,
  },
  vehicleTypeLabel: {
    ...typography.smallBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  vehicleTypeButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  vehicleTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderWidth: 2,
    borderColor: colors.border,
  },
  vehicleTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  vehicleTypeButtonText: {
    ...typography.bodyBold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  vehicleTypeButtonTextActive: {
    color: colors.textInverse,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.md,
    marginBottom: spacing.lg,
  },
  priceInfo: {
    flex: 1,
  },
  priceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInfoText: {
    ...typography.small,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  priceValueContainer: {
    alignItems: 'flex-end',
  },
  priceValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: 'bold',
  },
});
