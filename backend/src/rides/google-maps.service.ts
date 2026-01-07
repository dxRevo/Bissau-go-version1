import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GoogleMapsService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ Google Maps API Key is missing! Using Haversine fallback.');
    }
  }

  async calculateDistanceAndDuration(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    includeTraffic: boolean = true,
  ): Promise<{ distance: number; duration: number; durationInTraffic?: number }> {
    if (!this.apiKey) {
      // Fallback vers Haversine si pas de clé API
      return this.calculateDistanceAndDurationHaversine(origin, destination);
    }

    try {
      const url = `${this.baseUrl}/distancematrix/json`;
      const params: any = {
        origins: `${origin.latitude},${origin.longitude}`,
        destinations: `${destination.latitude},${destination.longitude}`,
        key: this.apiKey,
        units: 'metric',
        language: 'fr',
        departure_time: includeTraffic ? 'now' : undefined, // Utiliser le trafic réel si demandé
        traffic_model: includeTraffic ? 'best_guess' : undefined, // Modèle de trafic optimal
      };

      // Retirer les paramètres undefined
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await axios.get(url, { params });

      if (
        response.data.status === 'OK' &&
        response.data.rows &&
        response.data.rows[0] &&
        response.data.rows[0].elements &&
        response.data.rows[0].elements[0]
      ) {
        const element = response.data.rows[0].elements[0];
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

      // Fallback vers Haversine si erreur API
      return this.calculateDistanceAndDurationHaversine(origin, destination);
    } catch (error) {
      console.error('Error calculating distance with Google Maps API:', error);
      // Fallback vers Haversine en cas d'erreur
      return this.calculateDistanceAndDurationHaversine(origin, destination);
    }
  }

  private calculateDistanceAndDurationHaversine(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
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
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}







