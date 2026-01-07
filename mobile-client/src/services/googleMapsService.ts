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

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  name?: string;
}

export const googleMapsService = {
  async getPlacePredictions(query: string): Promise<PlacePrediction[]> {
    if (!query || query.length < 3) {
      return [];
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API Key is missing! Please set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env or googleMapsApiKey in app.json');
      return [];
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&components=country:sn&language=fr`;
      console.log('Fetching place predictions:', url.replace(GOOGLE_MAPS_API_KEY, '***'));
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Place predictions response:', data.status, data.error_message || 'OK');
      
      if (data.status === 'OK' && data.predictions) {
        return data.predictions;
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('Google Maps API Error:', data.error_message);
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('No results found for query:', query);
      }
      return [];
    } catch (error) {
      console.error('Error fetching place predictions:', error);
      return [];
    }
  },

  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API Key is missing!');
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}&fields=place_id,formatted_address,geometry,name&language=fr`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        return data.result;
      } else {
        console.error('Place details error:', data.status, data.error_message);
      }
      return null;
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  },

  async geocodeAddress(address: string) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&components=country:sn&language=fr`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng,
          address: data.results[0].formatted_address,
        };
      }
      throw new Error('Address not found');
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw error;
    }
  },

  async reverseGeocode(latitude: number, longitude: number) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&components=country:sn&language=fr`
      );
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Filtrer les résultats pour ne garder que ceux du Sénégal
        const senegalResult = data.results.find((result: any) => 
          result.address_components.some((component: any) => 
            component.short_name === 'SN' || component.long_name === 'Sénégal'
          )
        ) || data.results[0];
        
        return senegalResult.formatted_address;
      }
      return 'Localisation inconnue';
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return 'Localisation inconnue';
    }
  },

  async calculateDistanceAndDuration(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ): Promise<{ distance: number; duration: number; durationInTraffic?: number }> {
    try {
      // Inclure le trafic réel dans le calcul
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.latitude},${origin.longitude}&destinations=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}&units=metric&language=fr&departure_time=now&traffic_model=best_guess`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
        const element = data.rows[0].elements[0];
        if (element.status === 'OK') {
          // Distance en km
          const distance = element.distance.value / 1000; // Convertir mètres en km
          // Durée en minutes (sans trafic)
          const duration = element.duration.value / 60; // Convertir secondes en minutes
          // Durée avec trafic si disponible
          const durationInTraffic = element.duration_in_traffic 
            ? element.duration_in_traffic.value / 60 
            : duration;
          
          return {
            distance: Math.round(distance * 100) / 100, // Arrondir à 2 décimales
            duration: Math.round(duration),
            durationInTraffic: Math.round(durationInTraffic),
          };
        }
      }
      
      // Fallback: calcul approximatif avec Haversine
      return this.calculateDistanceAndDurationHaversine(origin, destination);
    } catch (error) {
      console.error('Error calculating distance and duration:', error);
      // Fallback: calcul approximatif avec Haversine
      return this.calculateDistanceAndDurationHaversine(origin, destination);
    }
  },

  calculateDistanceAndDurationHaversine(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ): { distance: number; duration: number } {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(destination.latitude - origin.latitude);
    const dLon = this.toRad(destination.longitude - origin.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(origin.latitude)) *
        Math.cos(this.toRad(destination.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Estimation de la durée en minutes (vitesse moyenne de 30 km/h en ville)
    const averageSpeed = 30; // km/h
    const duration = (distance / averageSpeed) * 60; // en minutes

    return {
      distance: Math.round(distance * 100) / 100,
      duration: Math.round(duration),
    };
  },

  toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  },

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
