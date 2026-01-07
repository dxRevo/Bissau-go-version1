// Service de calcul de prix côté client (pour estimation avant réservation)

export interface PricingEstimate {
  distance: number; // in km
  duration: number; // in minutes
  estimatedPrice: number; // in FCFA
  basePrice: number;
  distancePrice: number;
  durationPrice: number;
}

// Tarifs de base en FCFA (Sénégal) - doivent correspondre au backend
const BASE_PRICE_ECO = 1000;
const BASE_PRICE_CONFORT = 1500;

const PRICE_PER_KM_ECO = 500;
const PRICE_PER_KM_CONFORT = 700;

const PRICE_PER_MINUTE_ECO = 50;
const PRICE_PER_MINUTE_CONFORT = 75;

export const pricingService = {
  calculatePriceEstimate(
    distance: number,
    duration: number,
    vehicleType: 'ECO' | 'CONFORT' = 'ECO',
  ): PricingEstimate {
    const basePrice = vehicleType === 'CONFORT' ? BASE_PRICE_CONFORT : BASE_PRICE_ECO;
    const pricePerKm = vehicleType === 'CONFORT' ? PRICE_PER_KM_CONFORT : PRICE_PER_KM_ECO;
    const pricePerMinute = vehicleType === 'CONFORT' ? PRICE_PER_MINUTE_CONFORT : PRICE_PER_MINUTE_ECO;

    const distancePrice = distance * pricePerKm;
    const durationPrice = duration * pricePerMinute;
    const estimatedPrice = basePrice + distancePrice + durationPrice;

    return {
      distance: Math.round(distance * 100) / 100,
      duration: Math.round(duration),
      estimatedPrice: Math.round(estimatedPrice),
      basePrice: Math.round(basePrice),
      distancePrice: Math.round(distancePrice),
      durationPrice: Math.round(durationPrice),
    };
  },

  formatPrice(price: number): string {
    return `${price.toLocaleString('fr-FR')} FCFA`;
  },
};







