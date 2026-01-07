import { Injectable } from '@nestjs/common';
import { VehicleCategory } from '@prisma/client';
import { GoogleMapsService } from './google-maps.service';

export interface PricingResult {
  distance: number; // in km
  duration: number; // in minutes
  basePrice: number;
  distancePrice: number;
  durationPrice: number;
  totalPrice: number;
  commission: number; // 20% of totalPrice
  driverEarnings: number; // 80% of totalPrice
}

@Injectable()
export class PricingService {
  constructor(private readonly googleMapsService: GoogleMapsService) {}

  // Tarifs de base en FCFA (Sénégal) - Style Yango
  private readonly BASE_PRICE_ECO = 500; // Prix de départ pour ECO (comme Yango)
  private readonly BASE_PRICE_CONFORT = 700; // Prix de départ pour CONFORT
  
  private readonly PRICE_PER_KM_ECO = 200; // Prix par km pour ECO (comme Yango)
  private readonly PRICE_PER_KM_CONFORT = 250; // Prix par km pour CONFORT
  
  private readonly PRICE_PER_MINUTE_ECO = 50; // Prix par minute pour ECO (comme Yango)
  private readonly PRICE_PER_MINUTE_CONFORT = 60; // Prix par minute pour CONFORT
  
  private readonly MIN_DISTANCE_KM = 2; // Distance minimale en km
  private readonly MIN_PRICE_ECO = 1000; // Prix minimum pour ECO
  private readonly MIN_PRICE_CONFORT = 1500; // Prix minimum pour CONFORT
  
  private readonly COMMISSION_RATE = 0.20; // 20% de commission

  /**
   * Calculer le multiplicateur selon l'heure de la journée
   */
  private getTimeMultiplier(): number {
    const now = new Date();
    const hour = now.getHours();
    
    // Heures de pointe (7h-9h et 17h-19h) : +20%
    if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
      return 1.2;
    }
    
    // Nuit (22h-6h) : +30%
    if (hour >= 22 || hour < 6) {
      return 1.3;
    }
    
    // Heures normales
    return 1.0;
  }

  /**
   * Calculer le multiplicateur selon la demande (surge pricing simplifié)
   * Basé sur la distance et la durée pour simuler la demande
   */
  private getDemandMultiplier(distance: number, duration: number): number {
    // Plus la distance/durée est longue, plus la demande est élevée (simulation)
    // Zones populaires = trajets plus courts mais plus fréquents
    
    // Trajets très courts (< 2km) = forte demande = +15%
    if (distance < 2) {
      return 1.15;
    }
    
    // Trajets moyens (2-10km) = demande normale
    if (distance <= 10) {
      return 1.0;
    }
    
    // Trajets longs (> 10km) = demande faible = -5%
    return 0.95;
  }

  /**
   * Calculer le multiplicateur selon le trafic
   */
  private getTrafficMultiplier(duration: number, durationInTraffic?: number): number {
    if (!durationInTraffic || durationInTraffic <= duration) {
      return 1.0;
    }
    
    // Si le trafic augmente la durée de plus de 50%, appliquer un surcoût
    const trafficRatio = durationInTraffic / duration;
    
    if (trafficRatio > 1.5) {
      // Trafic très dense : +25%
      return 1.25;
    } else if (trafficRatio > 1.3) {
      // Trafic dense : +15%
      return 1.15;
    } else if (trafficRatio > 1.1) {
      // Trafic modéré : +10%
      return 1.1;
    }
    
    return 1.0;
  }

  calculatePrice(
    distance: number,
    duration: number,
    category: VehicleCategory,
    durationInTraffic?: number,
  ): PricingResult {
    // Prix de base selon la catégorie
    const basePrice =
      category === VehicleCategory.CONFORT
        ? this.BASE_PRICE_CONFORT
        : this.BASE_PRICE_ECO;

    // Prix selon la distance
    const pricePerKm =
      category === VehicleCategory.CONFORT
        ? this.PRICE_PER_KM_CONFORT
        : this.PRICE_PER_KM_ECO;
    const distancePrice = distance * pricePerKm;

    // Utiliser la durée avec trafic si disponible, sinon durée normale
    const effectiveDuration = durationInTraffic || duration;
    
    // Prix selon la durée
    const pricePerMinute =
      category === VehicleCategory.CONFORT
        ? this.PRICE_PER_MINUTE_CONFORT
        : this.PRICE_PER_MINUTE_ECO;
    const durationPrice = effectiveDuration * pricePerMinute;

    // Prix de base (sans multiplicateurs)
    let totalPrice = basePrice + distancePrice + durationPrice;

    // Appliquer les multiplicateurs
    const timeMultiplier = this.getTimeMultiplier();
    const demandMultiplier = this.getDemandMultiplier(distance, effectiveDuration);
    const trafficMultiplier = this.getTrafficMultiplier(duration, durationInTraffic);
    
    totalPrice = totalPrice * timeMultiplier * demandMultiplier * trafficMultiplier;

    // Appliquer le prix minimum
    const minPrice = category === VehicleCategory.CONFORT 
      ? this.MIN_PRICE_CONFORT 
      : this.MIN_PRICE_ECO;
    
    if (totalPrice < minPrice) {
      totalPrice = minPrice;
    }

    // Commission (20%)
    const commission = totalPrice * this.COMMISSION_RATE;

    // Gains du conducteur (80%)
    const driverEarnings = totalPrice - commission;

    return {
      distance: Math.round(distance * 100) / 100, // Arrondir à 2 décimales
      duration: Math.round(effectiveDuration),
      basePrice: Math.round(basePrice),
      distancePrice: Math.round(distancePrice),
      durationPrice: Math.round(durationPrice),
      totalPrice: Math.round(totalPrice),
      commission: Math.round(commission),
      driverEarnings: Math.round(driverEarnings),
    };
  }

  // Calculer la distance et la durée entre deux points (utilise Google Maps API avec trafic)
  async calculateDistanceAndDuration(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
  ): Promise<{ distance: number; duration: number; durationInTraffic?: number }> {
    return this.googleMapsService.calculateDistanceAndDuration(
      { latitude: pickupLat, longitude: pickupLng },
      { latitude: dropoffLat, longitude: dropoffLng },
      true, // Inclure le trafic réel
    );
  }
}

