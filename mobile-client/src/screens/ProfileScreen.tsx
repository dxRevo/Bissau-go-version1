import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../components/Header';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { useAuthStore } from '../store/authStore';
import { ridesService } from '../services/ridesService';

const { width } = Dimensions.get('window');

interface UserStats {
  totalRides: number;
  completedRides: number;
  averageRating: number;
}

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      const rides = await ridesService.getRides();
      const completedRides = rides.filter((ride: any) => ride.status === 'COMPLETED');
      const ratings = completedRides
        .map((ride: any) => ride.clientRating)
        .filter((rating: any) => rating !== null && rating !== undefined);
      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length
          : 0;

      setStats({
        totalRides: rides.length,
        completedRides: completedRides.length,
        averageRating: Math.round(averageRating * 10) / 10,
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              console.log('✅ Logout successful');
            } catch (error) {
              console.error('❌ Error during logout:', error);
            }
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (!user) return 'U';
    const first = user.firstName?.[0]?.toUpperCase() || '';
    const last = user.lastName?.[0]?.toUpperCase() || '';
    return first + last || 'U';
  };

  const menuItems = [
    {
      id: 'settings',
      icon: 'settings-outline',
      label: 'Paramètres',
      color: colors.primary,
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'history',
      icon: 'time-outline',
      label: 'Historique des courses',
      color: colors.secondary,
      onPress: () => navigation.navigate('History'),
    },
    {
      id: 'help',
      icon: 'help-circle-outline',
      label: 'Aide et Support',
      color: colors.info,
      onPress: () => navigation.navigate('HelpSupport'),
    },
    {
      id: 'about',
      icon: 'information-circle-outline',
      label: 'À propos',
      color: colors.textSecondary,
      onPress: () => {
        Alert.alert(
          'Bissau Go',
          'Application de transport et livraison\nVersion 1.0.0',
          [{ text: 'OK' }]
        );
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Mon Profil" />
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header with Gradient */}
        <LinearGradient
          colors={[colors.primary, colors.primary + 'DD']}
          style={styles.profileHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="camera-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.phone}>
            <Ionicons name="call-outline" size={14} color={colors.textInverse} /> {user?.phoneNumber}
          </Text>
        </LinearGradient>

        {/* Statistics Cards */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, shadows.small]}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="car-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.statValue}>{stats?.totalRides || 0}</Text>
              <Text style={styles.statLabel}>Courses totales</Text>
            </View>

            <View style={[styles.statCard, shadows.small]}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
              </View>
              <Text style={styles.statValue}>{stats?.completedRides || 0}</Text>
              <Text style={styles.statLabel}>Courses terminées</Text>
            </View>

            <View style={[styles.statCard, shadows.small]}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.warning + '15' }]}>
                <Ionicons name="star-outline" size={24} color={colors.warning} />
              </View>
              <Text style={styles.statValue}>
                {stats?.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
              </Text>
              <Text style={styles.statLabel}>Note moyenne</Text>
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Compte</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, shadows.small]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.menuText}>{item.label}</Text>
              <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, shadows.small]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: colors.error + '15' }]}>
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
          </View>
          <Text style={[styles.menuText, { color: colors.error, flex: 1 }]}>Déconnexion</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Bissau Go v1.0.0</Text>
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
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.background,
    ...shadows.medium,
  },
  avatarText: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: 'bold',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.small,
  },
  name: {
    ...typography.h2,
    color: colors.textInverse,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  phone: {
    ...typography.body,
    color: colors.textInverse + 'CC',
    fontSize: 14,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: spacing.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h2,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 11,
  },
  menuSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    fontSize: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: spacing.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  footerText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 12,
  },
});
