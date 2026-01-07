import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { ridesService } from '../services/ridesService';
import { formatPrice } from '../utils/priceFormatter';

const { width, height } = Dimensions.get('window');

export default function WaitingRideScreen({ navigation, route }: any) {
  const { rideId, pickupLocation, dropoffLocation, pickupAddress, dropoffAddress, estimatedPrice } = route.params || {};
  const [status, setStatus] = useState('PENDING');
  const [searchTime, setSearchTime] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Animation de pulsation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    // Animation de rotation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, []);

  // Timer de recherche
  useEffect(() => {
    const timer = setInterval(() => {
      setSearchTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Vérification du statut de la course
  useEffect(() => {
    if (!rideId) return;

    const checkRideStatus = async () => {
      try {
        const ride = await ridesService.getRideById(rideId);
        setStatus(ride.status);

        if (ride.status === 'ACCEPTED') {
          navigation.replace('RideTracking', { rideId: ride.id });
        } else if (ride.status === 'CANCELLED') {
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error checking ride status:', error);
      }
    };

    const interval = setInterval(checkRideStatus, 2000);
    checkRideStatus();

    return () => clearInterval(interval);
  }, [rideId, navigation]);

  const handleCancel = () => {
    if (rideId) {
      ridesService.cancelRide(rideId).catch(console.error);
    }
    navigation.goBack();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Région par défaut : Dakar
  const defaultRegion = {
    latitude: 14.7167,
    longitude: -17.4677,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const mapRegion = pickupLocation
    ? {
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : defaultRegion;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* Map Background */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
      >
        {pickupLocation && (
          <Marker
            coordinate={pickupLocation}
            title="Point de départ"
            pinColor={colors.primary}
          />
        )}
        {dropoffLocation && (
          <Marker
            coordinate={dropoffLocation}
            title="Destination"
            pinColor={colors.success}
          />
        )}
        {pickupLocation && dropoffLocation && (
          <Polyline
            coordinates={[pickupLocation, dropoffLocation]}
            strokeColor={colors.primary}
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      {/* Overlay Gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
        style={styles.overlay}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back-outline" size={24} color={colors.textInverse} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Recherche en cours</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Animation de recherche */}
        <View style={styles.animationContainer}>
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.rotatingCircle,
              {
                transform: [{ rotate: rotateInterpolate }],
              },
            ]}
          >
            <Ionicons name="car-outline" size={60} color={colors.textInverse} />
          </Animated.View>
        </View>

        {/* Titre principal */}
        <Text style={styles.mainTitle}>Recherche d'un conducteur</Text>
        <Text style={styles.subtitle}>
          Nous trouvons le meilleur conducteur{'\n'}dans votre zone
        </Text>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={20} color={colors.textInverse} />
          <Text style={styles.timerText}>{formatTime(searchTime)}</Text>
        </View>

        {/* Informations de la course */}
        <View style={styles.rideInfoCard}>
          <View style={styles.rideInfoRow}>
            <View style={styles.rideInfoIcon}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.rideInfoContent}>
              <Text style={styles.rideInfoLabel}>Départ</Text>
              <Text style={styles.rideInfoText} numberOfLines={1}>
                {pickupAddress || 'Adresse de départ'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.rideInfoRow}>
            <View style={[styles.rideInfoIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="flag-outline" size={20} color={colors.success} />
            </View>
            <View style={styles.rideInfoContent}>
              <Text style={styles.rideInfoLabel}>Destination</Text>
              <Text style={styles.rideInfoText} numberOfLines={1}>
                {dropoffAddress || 'Adresse de destination'}
              </Text>
            </View>
          </View>

          {estimatedPrice && (
            <>
              <View style={styles.divider} />
              <View style={styles.rideInfoRow}>
                <View style={[styles.rideInfoIcon, { backgroundColor: colors.info + '20' }]}>
                  <Ionicons name="cash-outline" size={20} color={colors.info} />
                </View>
                <View style={styles.rideInfoContent}>
                  <Text style={styles.rideInfoLabel}>Prix estimé</Text>
                  <Text style={styles.rideInfoPrice}>
                    {estimatedPrice ? formatPrice(estimatedPrice) : 'Calcul en cours...'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Bouton d'annulation */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <Ionicons name="close-outline" size={24} color={colors.error} />
          <Text style={styles.cancelButtonText}>Annuler la recherche</Text>
        </TouchableOpacity>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  topBarTitle: {
    ...typography.h3,
    color: colors.textInverse,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    zIndex: 10,
  },
  animationContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  pulseCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  rotatingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  mainTitle: {
    ...typography.h1,
    color: colors.textInverse,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textInverse,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: spacing.lg,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginBottom: spacing.xl,
  },
  timerText: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  rideInfoCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  rideInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rideInfoContent: {
    flex: 1,
  },
  rideInfoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  rideInfoText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  rideInfoPrice: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    ...shadows.sm,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
