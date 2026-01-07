import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { ridesService } from '../services/ridesService';
import { formatPrice } from '../utils/priceFormatter';

export default function HistoryScreen({ navigation }: any) {
  const [rides, setRides] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await ridesService.getRides();
      setRides(data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIconContainer}>
          <Ionicons name="car-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemDate}>
            {new Date(item.createdAt).toLocaleDateString('fr-FR')}
          </Text>
          <Text style={styles.itemAddress} numberOfLines={1}>
            {item.pickupLocation?.address || 'Point de départ'}
          </Text>
          <Text style={styles.itemAddress} numberOfLines={1}>
            → {item.dropoffLocation?.address || 'Destination'}
          </Text>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.itemPrice}>{formatPrice(item.price || 0)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return colors.success;
      case 'CANCELLED': return colors.error;
      case 'IN_PROGRESS': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Terminé';
      case 'CANCELLED': return 'Annulé';
      case 'IN_PROGRESS': return 'En cours';
      default: return status;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Historique" />
      
      <FlatList
        data={rides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Aucun historique</Text>
          </View>
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
  },
  item: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  itemHeader: {
    flexDirection: 'row',
  },
  itemIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  itemAddress: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    ...typography.bodyBold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
