export function formatPrice(price: number): string {
  // Le prix est déjà en FCFA, arrondir à l'entier le plus proche
  const rounded = Math.round(price);
  return `${rounded.toLocaleString('fr-FR')} FCFA`;
}

export function formatPriceWithDecimals(price: number): string {
  // Le prix est déjà en FCFA, afficher avec 2 décimales
  return `${price.toFixed(2).replace('.', ',')} FCFA`;
}
