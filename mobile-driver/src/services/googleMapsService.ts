import Constants from 'expo-constants';

// Récupérer la clé API depuis app.json ou .env
const GOOGLE_MAPS_API_KEY = 
  Constants.expoConfig?.extra?.googleMapsApiKey || 
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 
  '';

// Log pour débogage (sans exposer la clé complète)
if (!GOOGLE_MAPS_API_KEY) {
  console.warn('⚠️ Google Maps API Key is missing!');
  console.warn('Please set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env file or googleMapsApiKey in app.json');
} else {
  console.log('✅ Google Maps API Key loaded');
}

export const googleMapsService = {
  /**
   * Obtenir les directions/itinéraire entre deux points
   * Retourne les coordonnées de la polyline pour afficher le trajet sur la carte
   */
  async getDirections(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ): Promise<{ latitude: number; longitude: number }[]> {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API Key is missing!');
      // Fallback: retourner une ligne droite simple
      return [origin, destination];
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}&mode=driving&language=fr`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        // Décoder la polyline
        const encodedPolyline = data.routes[0].overview_polyline.points;
        return this.decodePolyline(encodedPolyline);
      } else {
        console.warn('Directions API error:', data.status, data.error_message);
        // Fallback: retourner une ligne droite simple
        return [origin, destination];
      }
    } catch (error) {
      console.error('Error getting directions:', error);
      // Fallback: retourner une ligne droite simple
      return [origin, destination];
    }
  },

  /**
   * Décoder une polyline encodée de Google Maps
   * Algorithme: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
   */
  decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
    const poly: { latitude: number; longitude: number }[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        latitude: lat * 1e-5,
        longitude: lng * 1e-5,
      });
    }

    return poly;
  },

  /**
   * Obtenir le nom de la rue à partir de coordonnées (reverse geocoding)
   */
  async getStreetName(latitude: number, longitude: number): Promise<string> {
    if (!GOOGLE_MAPS_API_KEY) {
      return '';
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=fr`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        // Chercher le nom de la rue dans les résultats
        for (const result of data.results) {
          const addressComponents = result.address_components;
          for (const component of addressComponents) {
            if (component.types.includes('route')) {
              return component.long_name;
            }
          }
        }
        // Fallback: utiliser le formatted_address
        return data.results[0].formatted_address.split(',')[0];
      }
      return '';
    } catch (error) {
      console.error('Error getting street name:', error);
      return '';
    }
  },

  /**
   * Calculer la distance et le temps restant jusqu'à la destination
   */
  async getRouteInfo(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ): Promise<{ distance: number; duration: number } | null> {
    if (!GOOGLE_MAPS_API_KEY) {
      return null;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}&mode=driving&language=fr`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        let totalDistance = 0;
        let totalDuration = 0;

        route.legs.forEach((leg: any) => {
          totalDistance += leg.distance.value; // en mètres
          totalDuration += leg.duration.value; // en secondes
        });

        return {
          distance: totalDistance / 1000, // convertir en km
          duration: totalDuration / 60, // convertir en minutes
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting route info:', error);
      return null;
    }
  },
};





