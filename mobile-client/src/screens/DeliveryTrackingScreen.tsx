import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import MapView from '../components/MapView';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { deliveriesService } from '../services/deliveriesService';

export default function DeliveryTrackingScreen({ navigation, route }: any) {
  const { deliveryId } = route.params || {};
  const [delivery, setDelivery] = useState<any>(null);

  useEffect(() => {
    if (!deliveryId) return;

    const fetchDelivery = async () => {
      try {
        const deliveryData = await deliveriesService.getDeliveryById(deliveryId);
        setDelivery(deliveryData);
      } catch (error) {
        console.error('Error fetching delivery:', error);
      }
    };

    fetchDelivery();
    const interval = setInterval(fetchDelivery, 5000);

    return () => clearInterval(interval);
  }, [deliveryId]);

  if (!delivery) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Suivi de la livraison" />
        <View style={styles.loading}>
          <Text>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Suivi de la livraison" />
      
      <View style={styles.mapContainer}>
        <MapView
          pickupLocation={delivery.pickupLocation}
          dropoffLocation={delivery.dropoffLocation}
        />
      </View>

      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Statut:</Text>
          <Text style={styles.value}>{delivery.status}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Prix:</Text>
          <Text style={styles.value}>{delivery.price || 0} FCFA</Text>
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  info: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.textSecondary,
  },
  value: {
    ...typography.bodyBold,
    color: colors.text,
  },
});
