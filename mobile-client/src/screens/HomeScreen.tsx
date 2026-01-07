import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { notificationsService } from '../services/notificationsService';
import { ridesService } from '../services/ridesService';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<any>(null);

  useEffect(() => {
    getCurrentLocation();
    
    // Configurer les listeners de notifications
    const cleanup = notificationsService.setupNotificationListeners(
      (notification) => {
        console.log('📱 Notification received:', notification);
      },
      (response) => {
        console.log('📱 Notification tapped:', response);
        const data = response.notification.request.content.data;
        
        // Naviguer vers l'écran de suivi si c'est une notification de course
        if (data?.type === 'RIDE_ACCEPTED' || data?.type === 'RIDE_STATUS_CHANGED' || data?.rideId) {
          const rideId = data.rideId;
          if (rideId) {
            // Utiliser replace pour éviter les problèmes de stack
            navigation.replace('RideTracking', { rideId });
          }
        }
      },
    );

    return cleanup;
  }, [navigation]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setUserLocation({ latitude: region.latitude, longitude: region.longitude });
      setMapRegion(region);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Région par défaut : Dakar, Sénégal
  const defaultRegion = {
    latitude: 14.7167,
    longitude: -17.4677,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Map View - Full Screen */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapRegion || defaultRegion}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Votre position"
            pinColor={colors.primary}
          />
        )}
      </MapView>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="menu-outline" size={28} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <Text style={styles.searchText}>Où allez-vous ?</Text>
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.profileAvatar}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHandle} />
        
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('BookRide')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="car-outline" size={24} color={colors.textInverse} />
            </View>
            <Text style={styles.quickActionLabel}>Trajet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('BookDelivery')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.secondary }]}>
              <Ionicons name="cube-outline" size={24} color={colors.textInverse} />
            </View>
            <Text style={styles.quickActionLabel}>Livraison</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.info }]}>
              <Ionicons name="time-outline" size={24} color={colors.textInverse} />
            </View>
            <Text style={styles.quickActionLabel}>Historique</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.textSecondary }]}>
              <Ionicons name="settings-outline" size={24} color={colors.textInverse} />
            </View>
            <Text style={styles.quickActionLabel}>Paramètres</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Places */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Destinations récentes</Text>
          <TouchableOpacity
            style={styles.recentItem}
            onPress={() => navigation.navigate('BookRide')}
            activeOpacity={0.7}
          >
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={styles.recentItemText}>Maison</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.recentItem}
            onPress={() => navigation.navigate('BookRide')}
            activeOpacity={0.7}
          >
            <Ionicons name="briefcase-outline" size={20} color={colors.secondary} />
            <Text style={styles.recentItemText}>Travail</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: 'transparent',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    ...shadows.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    ...shadows.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  profileButton: {
    width: 44,
    height: 44,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
    maxHeight: height * 0.5,
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  quickActionLabel: {
    ...typography.small,
    color: colors.text,
    textAlign: 'center',
  },
  recentSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.md,
    marginBottom: spacing.sm,
  },
  recentItemText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
});
