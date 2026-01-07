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

  // Tarifs de base en FCFA (Sénégal)
  private readonly BASE_PRICE_ECO = 1000; // Prix de base pour ECO
  private readonly BASE_PRICE_CONFORT = 1500; // Prix de base pour CONFORT
  
  private readonly PRICE_PER_KM_ECO = 500; // Prix par km pour ECO
  private readonly PRICE_PER_KM_CONFORT = 700; // Prix par km pour CONFORT
  
  private readonly PRICE_PER_MINUTE_ECO = 50; // Prix par minute pour ECO
  private readonly PRICE_PER_MINUTE_CONFORT = 75; // Prix par minute pour CONFORT
  
  private readonly COMMISSION_RATE = 0.20; // 20% de commission

  calculatePrice(
    distance: number,
    duration: number,
    category: VehicleCategory,
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

    // Prix selon la durée
    const pricePerMinute =
      category === VehicleCategory.CONFORT
        ? this.PRICE_PER_MINUTE_CONFORT
        : this.PRICE_PER_MINUTE_ECO;
    const durationPrice = duration * pricePerMinute;

    // Prix total
    const totalPrice = basePrice + distancePrice + durationPrice;

    // Commission (20%)
    const commission = totalPrice * this.COMMISSION_RATE;

    // Gains du conducteur (80%)
    const driverEarnings = totalPrice - commission;

    return {
      distance: Math.round(distance * 100) / 100, // Arrondir à 2 décimales
      duration: Math.round(duration),
      basePrice: Math.round(basePrice),
      distancePrice: Math.round(distancePrice),
      durationPrice: Math.round(durationPrice),
      totalPrice: Math.round(totalPrice),
      commission: Math.round(commission),
      driverEarnings: Math.round(driverEarnings),
    };
  }

  // Calculer la distance et la durée entre deux points (utilise Google Maps API)
  async calculateDistanceAndDuration(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
  ): Promise<{ distance: number; duration: number }> {
    return this.googleMapsService.calculateDistanceAndDuration(
      { latitude: pickupLat, longitude: pickupLng },
      { latitude: dropoffLat, longitude: dropoffLng },
    );
  }
}

