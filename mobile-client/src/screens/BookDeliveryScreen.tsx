import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import MapView from '../components/MapView';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { deliveriesService } from '../services/deliveriesService';
import * as Location from 'expo-location';

export default function BookDeliveryScreen({ navigation }: any) {
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupLocation, setPickupLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [itemDescription, setItemDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState<any>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'La localisation est nécessaire pour utiliser cette fonctionnalité');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setMapRegion(region);
      setPickupLocation({ latitude: region.latitude, longitude: region.longitude });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleBookDelivery = async () => {
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
      const delivery = await deliveriesService.createDelivery({
        pickupLocation: {
          ...pickupLocation,
          address: pickupAddress,
        },
        dropoffLocation: {
          ...dropoffLocation,
          address: dropoffAddress,
        },
        itemDescription,
      });

      navigation.navigate('DeliveryTracking', { deliveryId: delivery.id });
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.message || 'Erreur lors de la réservation');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Livrer un colis" onBack={() => navigation.goBack()} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.mapContainer}>
            <MapView
              initialRegion={mapRegion || undefined}
              pickupLocation={pickupLocation || undefined}
              dropoffLocation={dropoffLocation || undefined}
            />
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Ionicons name="location-outline" size={20} color={colors.success} />
                <Text style={styles.label}>Point de collecte</Text>
              </View>
              <AddressAutocomplete
                placeholder="Entrez l'adresse de collecte"
                value={pickupAddress}
                onChangeText={setPickupAddress}
                onSelectAddress={(address, location) => {
                  setPickupAddress(address);
                  if (location) setPickupLocation(location);
                }}
                icon="location"
              />
            </View>

            <TouchableOpacity style={styles.swapButton} onPress={swapAddresses}>
              <Ionicons name="swap-vertical-outline" size={24} color={colors.primary} />
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Ionicons name="flag-outline" size={20} color={colors.error} />
                <Text style={styles.label}>Destination</Text>
              </View>
              <AddressAutocomplete
                placeholder="Entrez l'adresse de destination"
                value={dropoffAddress}
                onChangeText={setDropoffAddress}
                onSelectAddress={(address, location) => {
                  setDropoffAddress(address);
                  if (location) setDropoffLocation(location);
                }}
                icon="flag"
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <Ionicons name="cube-outline" size={20} color={colors.secondary} />
                <Text style={styles.label}>Description du colis</Text>
              </View>
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Décrivez le colis (optionnel)"
                  placeholderTextColor={colors.textTertiary}
                  value={itemDescription}
                  onChangeText={setItemDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleBookDelivery}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Ionicons name="cube-outline" size={24} color={colors.textInverse} style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Réserver une livraison</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    height: 300,
    marginBottom: spacing.md,
  },
  form: {
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.smallBold,
    color: colors.text,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  swapButton: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.sm,
    ...shadows.sm,
  },
  textInputContainer: {
    backgroundColor: colors.backgroundLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.md,
    overflow: 'hidden',
  },
  textInput: {
    ...typography.body,
    padding: spacing.md,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.secondary,
    borderRadius: spacing.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  buttonText: {
    ...typography.bodyBold,
    color: colors.textInverse,
    fontSize: 18,
  },
});
