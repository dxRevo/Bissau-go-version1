import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { ridesService } from '../services/ridesService';
import { deliveriesService } from '../services/deliveriesService';
import { driversService } from '../services/driversService';
import { useAuthStore } from '../store/authStore';
import { notificationsService } from '../services/notificationsService';
import { websocketService } from '../services/websocketService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [availableRides, setAvailableRides] = useState<any[]>([]);
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    // Vérifier l'auth si user est null
    if (!user) {
      checkAuth();
    }
  }, [user, checkAuth]);

  useEffect(() => {
    // Ne pas mettre à jour le statut si l'utilisateur n'est pas connecté
    if (!user) {
      return;
    }

    // Mettre à jour le statut en ligne dans la base de données
    if (user.id) {
      console.log(`🔄 Updating online status: isOnline=${isOnline}, hasLocation=${!!userLocation}, userId=${user.id}`);
      driversService.updateOnlineStatus(isOnline, userLocation || undefined)
        .then(() => {
          console.log(`✅ Online status updated successfully: isOnline=${isOnline}`);
        })
        .catch((error: any) => {
          // Ne pas bloquer l'application si la mise à jour du statut échoue
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.warn('⚠️ Authentication error - user may have logged out');
          } else if (error.response?.status === 404) {
            console.warn('⚠️ Endpoint /drivers/online-status not found. Backend may need to be restarted.');
          } else if (error.message === 'Network Error' || !error.response) {
            console.warn('⚠️ Network error updating online status. Backend may not be accessible.');
            console.warn('   This is not critical - rides can still be checked.');
          } else {
            console.error('❌ Error updating online status:', error.response?.status, error.response?.data || error.message);
          }
        });
    } else {
      console.log('⚠️ Cannot update online status: no user ID');
    }
  }, [isOnline, userLocation, user]);

  // Initialiser FCM et WebSocket
  useEffect(() => {
    const initRealtime = async () => {
      const currentUser = user || useAuthStore.getState().user;
      const token = await AsyncStorage.getItem('authToken');
      
      if (!currentUser || !token) return;

      // Enregistrer FCM
      try {
        await notificationsService.registerForPushNotifications();
      } catch (error) {
        console.error('Failed to register FCM:', error);
      }

      // Configurer les listeners de notifications
      const cleanupNotifications = notificationsService.setupNotificationListeners(
        (notification) => {
          console.log('📱 Notification received:', notification);
          // Rafraîchir les courses disponibles quand une notification est reçue
          if (isOnline) {
            checkAvailableRides();
          }
        },
        (response) => {
          console.log('📱 Notification tapped:', response);
          const data = response.notification.request.content.data;
          if (data?.type === 'NEW_RIDE' && data?.rideId) {
            navigation.navigate('RideRequest', { rideId: data.rideId });
          }
        },
      );

      // Connecter WebSocket
      try {
        await websocketService.connect(token);
        
        // Écouter les nouvelles courses via WebSocket
        websocketService.on('new_ride', (data: any) => {
          console.log('🚗 New ride via WebSocket:', data);
          if (isOnline) {
            checkAvailableRides();
          }
        });

        websocketService.on('new_delivery', (data: any) => {
          console.log('📦 New delivery via WebSocket:', data);
          if (isOnline && user?.role === 'DELIVERY') {
            checkAvailableRides();
          }
        });
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
      }

      return () => {
        cleanupNotifications();
        websocketService.disconnect();
      };
    };

    initRealtime();
  }, [user]);

  // Polling optimisé avec intervalle plus long (10s) car WebSocket est la source principale
  useEffect(() => {
    // Ne pas démarrer le polling si l'utilisateur n'est pas connecté
    if (!user) {
      console.log('🔴 User not authenticated, stopping ride checking');
      setAvailableRides([]);
      setCurrentRideId(null);
      websocketService.disconnect();
      return;
    }

    if (isOnline) {
      console.log('🟢 Driver is online, starting ride checking...');
      checkAvailableRides();
      
      // Polling de secours toutes les 10 secondes (WebSocket est la source principale)
      const interval = setInterval(() => {
        // Vérifier que l'utilisateur est toujours connecté
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          console.log('🔴 User logged out, stopping polling');
          clearInterval(interval);
          return;
        }

        if (websocketService.isConnected()) {
          console.log('⏰ Polling (backup) for available rides...');
        } else {
          console.log('⏰ Polling (WebSocket disconnected) for available rides...');
        }
        checkAvailableRides();
      }, 10000); // 10 secondes au lieu de 3
      
      return () => {
        console.log('🔴 Driver went offline or logged out, stopping ride checking');
        clearInterval(interval);
      };
    } else {
      console.log('🔴 Driver is offline, clearing available rides');
      setAvailableRides([]);
      setCurrentRideId(null);
      websocketService.disconnect();
    }
  }, [isOnline, user]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      const region: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      const newLocation = { latitude: region.latitude, longitude: region.longitude };
      setUserLocation(newLocation);
      setMapRegion(region);
      
      // Mettre à jour la position dans la base de données si le driver est en ligne
      if (isOnline && user?.id) {
        driversService.updateOnlineStatus(true, newLocation).catch(console.error);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Mettre à jour la position périodiquement quand le driver est en ligne
  useEffect(() => {
    if (isOnline) {
      const locationInterval = setInterval(() => {
        getCurrentLocation();
      }, 10000); // Mettre à jour la position toutes les 10 secondes
      return () => clearInterval(locationInterval);
    }
  }, [isOnline]);

  const checkAvailableRides = async () => {
    // Vérifier que l'utilisateur est connecté
    const currentUser = user || useAuthStore.getState().user;
    if (!currentUser) {
      console.log('⚠️ User is not authenticated, skipping ride check');
      return;
    }

    if (!isOnline) {
      console.log('⚠️ Cannot check rides: driver is offline (isOnline=false)');
      return;
    }

    console.log(`🔍 Checking available rides - User ID: ${currentUser.id}, Role: ${currentUser.role}, isOnline: ${isOnline}`);
    
    try {

      // Seuls les DRIVER peuvent voir les courses
      if (currentUser.role === 'DRIVER') {
        console.log('🔍 Calling getAvailableRides API...');
        const rides = await ridesService.getAvailableRides();
        console.log(`📋 Available rides found: ${rides.length}`);
        
        if (rides.length > 0) {
          console.log(`📋 Rides details:`, rides.map(r => ({ id: r.id, status: r.status, driverId: r.driverId })));
        }
        
        setAvailableRides(rides);
        
        // Naviguer vers la nouvelle course seulement si c'est une nouvelle course
        if (rides.length > 0) {
          const newRide = rides[0];
          console.log(`✅ New ride found: ${newRide.id}, Current rideId: ${currentRideId}`);
          // Ne naviguer que si c'est une nouvelle course (pas celle déjà affichée)
          if (newRide.id !== currentRideId) {
            setCurrentRideId(newRide.id);
            console.log(`🚗 Navigating to RideRequest with ride: ${newRide.id}`);
            navigation.navigate('RideRequest', { ride: newRide });
          } else {
            console.log(`⏸️ Ride ${newRide.id} already displayed, skipping navigation`);
          }
        } else {
          // Plus de courses disponibles, réinitialiser
          if (currentRideId) {
            console.log('🔄 No rides available, resetting currentRideId');
            setCurrentRideId(null);
          }
        }
      } else if (currentUser.role === 'DELIVERY') {
        // Les DELIVERY voient les livraisons
        console.log('🔍 Calling getAvailableDeliveries API...');
        const deliveries = await deliveriesService.getAvailableDeliveries();
        console.log(`📋 Available deliveries found: ${deliveries.length}`);
        
        if (deliveries.length > 0) {
          // Navigation vers l'écran de demande de livraison (à créer)
          // navigation.navigate('DeliveryRequest', { delivery: deliveries[0] });
        }
      } else {
        console.log(`⚠️ User role is '${currentUser.role}', not 'DRIVER' or 'DELIVERY'. Cannot view requests.`);
      }
    } catch (error: any) {
      console.error('❌ Error checking available requests:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Si l'erreur indique que l'utilisateur n'a pas le bon rôle ou n'est pas en ligne, afficher un message
      if (error.response?.status === 400) {
        console.warn('⚠️ Driver not online or wrong role');
        return;
      }
    }
  };

  const toggleOnlineStatus = () => {
    setIsOnline(!isOnline);
  };

  // Région par défaut : Dakar, Sénégal
  const defaultRegion: Region = {
    latitude: 14.7167,
    longitude: -17.4677,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Map View */}
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
            pinColor={isOnline ? colors.success : colors.textSecondary}
          />
        )}
      </MapView>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="menu-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.textSecondary }]} />
          <Text style={styles.statusText}>{isOnline ? 'En ligne' : 'Hors ligne'}</Text>
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person-circle-outline" size={32} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHandle} />
        
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="car-outline" size={24} color={colors.primary} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Trajets aujourd'hui</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="wallet-outline" size={24} color={colors.success} />
            <Text style={styles.statValue}>0 FCFA</Text>
            <Text style={styles.statLabel}>Gains aujourd'hui</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.onlineButton, isOnline && styles.onlineButtonActive]}
          onPress={toggleOnlineStatus}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isOnline ? "radio-button-on" : "radio-button-off"} 
            size={24} 
            color={isOnline ? colors.textInverse : colors.text} 
          />
          <Text style={[styles.onlineButtonText, isOnline && styles.onlineButtonTextActive]}>
            {isOnline ? 'Mettre hors ligne' : 'Mettre en ligne'}
          </Text>
        </TouchableOpacity>

        {availableRides.length > 0 && (
          <View style={styles.ridesNotification}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            <Text style={styles.ridesNotificationText}>
              {availableRides.length} trajet{availableRides.length > 1 ? 's' : ''} disponible{availableRides.length > 1 ? 's' : ''}
            </Text>
          </View>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    ...shadows.md,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.lg,
    ...shadows.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    ...typography.smallBold,
    color: colors.text,
  },
  profileButton: {
    width: 44,
    height: 44,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    padding: spacing.md,
    borderRadius: spacing.md,
    marginHorizontal: spacing.xs,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  onlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  onlineButtonActive: {
    backgroundColor: colors.primary,
  },
  onlineButtonText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  onlineButtonTextActive: {
    color: colors.textInverse,
  },
  ridesNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    padding: spacing.md,
    borderRadius: spacing.md,
    gap: spacing.sm,
  },
  ridesNotificationText: {
    ...typography.body,
    color: colors.primary,
    flex: 1,
  },
});
