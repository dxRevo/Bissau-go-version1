import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { formatPrice } from '../utils/priceFormatter';

export default function EarningsScreen({ navigation }: any) {
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [monthEarnings, setMonthEarnings] = useState(0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Gains" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Ionicons name="today-outline" size={24} color={colors.primary} />
            <Text style={styles.summaryLabel}>Aujourd'hui</Text>
            <Text style={styles.summaryValue}>{formatPrice(todayEarnings)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="calendar-outline" size={24} color={colors.secondary} />
            <Text style={styles.summaryLabel}>Cette semaine</Text>
            <Text style={styles.summaryValue}>{formatPrice(weekEarnings)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="calendar-number-outline" size={24} color={colors.success} />
            <Text style={styles.summaryLabel}>Ce mois</Text>
            <Text style={styles.summaryValue}>{formatPrice(monthEarnings)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détails des gains</Text>
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Aucun gain pour le moment</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  summaryCards: {
    marginBottom: spacing.xl,
  },
  summaryCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  summaryLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.h2,
    color: colors.text,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
