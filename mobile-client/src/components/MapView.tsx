import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors } from '../theme/colors';

interface MapViewProps {
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  pickupLocation?: { latitude: number; longitude: number };
  dropoffLocation?: { latitude: number; longitude: number };
  driverLocation?: { latitude: number; longitude: number };
  onRegionChangeComplete?: (region: any) => void;
  style?: any;
}

export default function CustomMapView({
  initialRegion,
  pickupLocation,
  dropoffLocation,
  driverLocation,
  onRegionChangeComplete,
  style,
}: MapViewProps) {
  const mapRef = useRef<MapView>(null);
  const driverMarkerRef = useRef<any>(null);
  const [driverRotation, setDriverRotation] = useState(0);
  const previousDriverLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (driverLocation && driverMarkerRef.current) {
      // Calculate bearing (rotation angle) based on movement
      if (previousDriverLocationRef.current) {
        const bearing = calculateBearing(
          previousDriverLocationRef.current,
          driverLocation
        );
        setDriverRotation(bearing);
      }

      // Animate marker to new position
      driverMarkerRef.current.animateToCoordinate(
        {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
        },
        1000 // Animation duration
      );

      previousDriverLocationRef.current = driverLocation;
    }
  }, [driverLocation]);

  const calculateBearing = (
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): number => {
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;

    const x = Math.sin(deltaLon) * Math.cos(lat2);
    const y =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

    const bearing = (Math.atan2(x, y) * 180) / Math.PI;
    return (bearing + 360) % 360;
  };

  // Région par défaut : Dakar, Sénégal
  const defaultRegion = {
    latitude: 14.7167,
    longitude: -17.4677,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion || defaultRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton
      >
        {pickupLocation && (
          <Marker
            coordinate={pickupLocation}
            title="Point de départ"
            pinColor={colors.success}
          />
        )}
        {dropoffLocation && (
          <Marker
            coordinate={dropoffLocation}
            title="Destination"
            pinColor={colors.error}
          />
        )}
        {driverLocation && (
          <Marker
            ref={driverMarkerRef}
            coordinate={driverLocation}
            title="Conducteur"
            rotation={driverRotation}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.driverMarker}>
              <View style={styles.driverIcon} />
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  driverMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverIcon: {
    width: 12,
    height: 12,
    backgroundColor: colors.textInverse,
    borderRadius: 6,
  },
});
