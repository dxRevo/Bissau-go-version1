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
};





