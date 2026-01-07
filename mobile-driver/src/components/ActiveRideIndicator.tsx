import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, shadows } from '../theme/spacing';
import { ridesService } from '../services/ridesService';

interface ActiveRideIndicatorProps {
  navigation: any;
  onPress?: () => void;
}

export default function ActiveRideIndicator({ navigation, onPress }: ActiveRideIndicatorProps) {
  const [activeRide, setActiveRide] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(100)).current;

  useEffect(() => {
    checkActiveRide();
    
    // Vérifier périodiquement s'il y a un trajet actif
    const interval = setInterval(checkActiveRide, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Animer l'apparition/disparition
    Animated.spring(slideAnim, {
      toValue: isVisible ? 0 : 100,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [isVisible]);

  const checkActiveRide = async () => {
    try {
      const ride = await ridesService.getActiveRide();
      if (ride && ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'].includes(ride.status)) {
        setActiveRide(ride);
        setIsVisible(true);
      } else {
        setActiveRide(null);
        setIsVisible(false);
      }
    } catch (error) {
      // Pas de trajet actif
      setActiveRide(null);
      setIsVisible(false);
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (activeRide) {
      navigation.navigate('ActiveRide', { rideId: activeRide.id });
    }
  };

  if (!isVisible || !activeRide) {
    return null;
  }

  const getStatusInfo = () => {
    switch (activeRide.status) {
      case 'ACCEPTED':
        return { text: 'Aller chercher le client', color: colors.primary, icon: 'car-outline' };
      case 'DRIVER_ARRIVED':
        return { text: 'Client à récupérer', color: colors.success, icon: 'location-outline' };
      case 'IN_PROGRESS':
        return { text: 'Trajet en cours', color: colors.warning, icon: 'navigate-outline' };
      default:
        return { text: 'Trajet actif', color: colors.primary, icon: 'car-outline' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.indicator, { backgroundColor: statusInfo.color }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <Ionicons name={statusInfo.icon as any} size={20} color={colors.background} />
          <View style={styles.textContainer}>
            <Text style={styles.statusText}>{statusInfo.text}</Text>
            {activeRide.client && (
              <Text style={styles.clientName} numberOfLines={1}>
                {activeRide.client.firstName} {activeRide.client.lastName}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color={colors.background} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 240, // Au-dessus de la bottom sheet (qui fait ~140px) et de la tab bar (60px)
    left: spacing.md,
    right: spacing.md,
    zIndex: 1000,
  },
  indicator: {
    borderRadius: spacing.lg,
    padding: spacing.md,
    ...shadows.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    ...typography.bodyBold,
    color: colors.background,
    fontSize: 14,
    marginBottom: 2,
  },
  clientName: {
    ...typography.small,
    color: colors.background,
    opacity: 0.9,
  },
});

