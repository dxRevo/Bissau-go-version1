import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { ridesService } from '../services/ridesService';
import { deliveriesService } from '../services/deliveriesService';
import { formatPrice } from '../utils/priceFormatter';

export default function HistoryScreen({ navigation }: any) {
  const [rides, setRides] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'rides' | 'deliveries'>('rides');

  useEffect(() => {
    loadHistory();
  }, [activeTab]);

  const loadHistory = async () => {
    try {
      if (activeTab === 'rides') {
        const data = await ridesService.getRides();
        setRides(data);
      } else {
        const data = await deliveriesService.getDeliveries();
        setDeliveries(data);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>
          {item.pickupLocation?.address || 'Point de départ'}
        </Text>
        <Text style={styles.itemStatus}>{item.status}</Text>
      </View>
      <Text style={styles.itemSubtitle}>
        → {item.dropoffLocation?.address || 'Destination'}
      </Text>
      <View style={styles.itemFooter}>
        <Text style={styles.itemPrice}>
          {item.totalPrice ? formatPrice(item.totalPrice) : 'Prix non disponible'}
        </Text>
        {item.distance && item.duration && (
          <Text style={styles.itemDetails}>
            {item.distance} km • {item.duration} min
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const data = activeTab === 'rides' ? rides : deliveries;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Historique" />
      
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rides' && styles.tabActive]}
          onPress={() => setActiveTab('rides')}
        >
          <Text style={[styles.tabText, activeTab === 'rides' && styles.tabTextActive]}>
            Trajets
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'deliveries' && styles.tabActive]}
          onPress={() => setActiveTab('deliveries')}
        >
          <Text style={[styles.tabText, activeTab === 'deliveries' && styles.tabTextActive]}>
            Livraisons
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  tabTextActive: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  list: {
    padding: spacing.lg,
  },
  item: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  itemTitle: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
  },
  itemStatus: {
    ...typography.small,
    color: colors.textSecondary,
  },
  itemSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  itemPrice: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 18,
  },
  itemDetails: {
    ...typography.small,
    color: colors.textSecondary,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
