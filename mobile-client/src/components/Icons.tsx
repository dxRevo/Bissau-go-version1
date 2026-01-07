import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export function CarIcon({ size = 24, color = colors.text }: { size?: number; color?: string }) {
  return (
    <View style={[styles.icon, { width: size, height: size }]}>
      <View style={[styles.carBody, { backgroundColor: color }]} />
    </View>
  );
}

export function LocationIcon({ size = 24, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <View style={[styles.icon, { width: size, height: size }]}>
      <View style={[styles.locationPin, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  carBody: {
    width: '80%',
    height: '60%',
    borderRadius: 4,
  },
  locationPin: {
    width: '60%',
    height: '60%',
    borderRadius: 12,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
});
