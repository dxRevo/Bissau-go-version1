// Service de calcul de prix côté client (pour estimation avant réservation)

export interface PricingEstimate {
  distance: number; // in km
  duration: number; // in minutes
  estimatedPrice: number; // in FCFA
  basePrice: number;
  distancePrice: number;
  durationPrice: number;
}

// Tarifs de base en FCFA (Sénégal) - Style Yango - doivent correspondre au backend
const BASE_PRICE_ECO = 500; // Prix de départ (comme Yango)
const BASE_PRICE_CONFORT = 700; // Prix de départ CONFORT

const PRICE_PER_KM_ECO = 200; // Prix par km (comme Yango)
const PRICE_PER_KM_CONFORT = 250; // Prix par km CONFORT

const PRICE_PER_MINUTE_ECO = 50; // Prix par minute (comme Yango)
const PRICE_PER_MINUTE_CONFORT = 60; // Prix par minute CONFORT

const MIN_DISTANCE_KM = 2;
const MIN_PRICE_ECO = 1000; // Prix minimum
const MIN_PRICE_CONFORT = 1500; // Prix minimum CONFORT

/**
 * Calculer le multiplicateur selon l'heure de la journée
 */
function getTimeMultiplier(): number {
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
 */
function getDemandMultiplier(distance: number, duration: number): number {
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
function getTrafficMultiplier(duration: number, durationInTraffic?: number): number {
  if (!durationInTraffic || durationInTraffic <= duration) {
    return 1.0;
  }
  
  const trafficRatio = durationInTraffic / duration;
  
  if (trafficRatio > 1.5) {
    return 1.25; // Trafic très dense : +25%
  } else if (trafficRatio > 1.3) {
    return 1.15; // Trafic dense : +15%
  } else if (trafficRatio > 1.1) {
    return 1.1; // Trafic modéré : +10%
  }
  
  return 1.0;
}

export const pricingService = {
  calculatePriceEstimate(
    distance: number,
    duration: number,
    vehicleType: 'ECO' | 'CONFORT' = 'ECO',
    durationInTraffic?: number,
  ): PricingEstimate {
    const basePrice = vehicleType === 'CONFORT' ? BASE_PRICE_CONFORT : BASE_PRICE_ECO;
    const pricePerKm = vehicleType === 'CONFORT' ? PRICE_PER_KM_CONFORT : PRICE_PER_KM_ECO;
    const pricePerMinute = vehicleType === 'CONFORT' ? PRICE_PER_MINUTE_CONFORT : PRICE_PER_MINUTE_ECO;

    const distancePrice = distance * pricePerKm;
    
    // Utiliser la durée avec trafic si disponible
    const effectiveDuration = durationInTraffic || duration;
    const durationPrice = effectiveDuration * pricePerMinute;
    
    // Prix de base (sans multiplicateurs)
    let estimatedPrice = basePrice + distancePrice + durationPrice;

    // Appliquer les multiplicateurs
    const timeMultiplier = getTimeMultiplier();
    const demandMultiplier = getDemandMultiplier(distance, effectiveDuration);
    const trafficMultiplier = getTrafficMultiplier(duration, durationInTraffic);
    
    estimatedPrice = estimatedPrice * timeMultiplier * demandMultiplier * trafficMultiplier;

    // Appliquer le prix minimum
    const minPrice = vehicleType === 'CONFORT' ? MIN_PRICE_CONFORT : MIN_PRICE_ECO;
    if (estimatedPrice < minPrice) {
      estimatedPrice = minPrice;
    }

    return {
      distance: Math.round(distance * 100) / 100,
      duration: Math.round(effectiveDuration),
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







