import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { useAuthStore } from '../store/authStore';
import { driversService } from '../services/driversService';
import { websocketService } from '../services/websocketService';
import { notificationsService } from '../services/notificationsService';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    // Mettre le driver hors ligne avant de se déconnecter
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
              // Nettoyer les services avant la déconnexion
              websocketService.disconnect();
              try {
                await notificationsService.unregisterToken();
              } catch (error) {
                console.warn('⚠️ Could not unregister FCM token:', error);
              }

              // Mettre le driver hors ligne avant de se déconnecter
              if (user?.id) {
                try {
                  await driversService.updateOnlineStatus(false);
                  console.log('✅ Driver set to offline');
                } catch (error) {
                  console.warn('⚠️ Could not update online status:', error);
                  // Continue with logout even if this fails
                }
              }
              
              // Déconnexion
              await logout();
              console.log('✅ Logout successful');
              // Navigation will happen automatically when isAuthenticated changes
            } catch (error) {
              console.error('❌ Error during logout:', error);
              Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Profil" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={48} color={colors.primary} />
          </View>
          <Text style={styles.name}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.phone}>{user?.phoneNumber}</Text>
        </View>

        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('Earnings')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="wallet-outline" size={24} color={colors.primary} />
            </View>
            <Text style={styles.menuText}>Gains</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('History')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.secondary + '15' }]}>
              <Ionicons name="time-outline" size={24} color={colors.secondary} />
            </View>
            <Text style={styles.menuText}>Historique</Text>
            <Ionicons name="chevron-forward-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.error + '15' }]}>
              <Ionicons name="log-out-outline" size={24} color={colors.error} />
            </View>
            <Text style={[styles.menuText, { color: colors.error }]}>Déconnexion</Text>
          </TouchableOpacity>
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
  profileHeader: {
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  phone: {
    ...typography.body,
    color: colors.textSecondary,
  },
  menu: {
    padding: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.backgroundLight,
    borderRadius: spacing.md,
    marginBottom: spacing.md,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
});
